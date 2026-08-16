// WarcraftLogs V2 GraphQL API client (OAuth Client Credentials)
// Docs: https://www.warcraftlogs.com/api/docs
//
// Zone IDs are no longer hardcoded here — zones.js resolves the live M+ season
// and raid tier at runtime so this keeps grading the current season on its own.

import { gql } from './wcl-client.js';
import { getCurrentZones } from './zones.js';

export { getCurrentZones };

// ---------------------------------------------------------------------------
// M+ rankings — fetches both dps and hps metrics in one request using aliases.
// Role detection uses allStars spec from whichever metric has data.
// Caller picks pointsAndDamageRankings (DPS + tank) or pointsAndHealingRankings (healer) based on role.
// krsi is not supported on M+ zones — dps compares within role automatically.
// ---------------------------------------------------------------------------
export async function getCharacterMythicPlusData(name, serverSlug, serverRegion) {
  const { mplusZone } = await getCurrentZones();
  const data = await gql(`
    query MythicPlusData($name: String!, $serverSlug: String!, $serverRegion: String!, $zoneID: Int!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          name
          classID
          pointsAndDamageRankings:  zoneRankings(zoneID: $zoneID, metric: points_and_damage)
          pointsAndHealingRankings: zoneRankings(zoneID: $zoneID, metric: points_and_healing)
          dpsRankings:              zoneRankings(zoneID: $zoneID, metric: dps)
        }
      }
    }
  `, { name, serverSlug, serverRegion, zoneID: mplusZone });

  return data?.characterData?.character ?? null;
}

// ---------------------------------------------------------------------------
// Raid rankings — heroic (4) + mythic (5) for the current raid tier.
// metric varies by role: dps | hps | krsi
// ---------------------------------------------------------------------------
export async function getCharacterRaidData(name, serverSlug, serverRegion, metric = null) {
  const { raidZone } = await getCurrentZones();
  const metricClause = metric ? `metric: ${metric}, ` : '';
  const data = await gql(`
    query RaidRankings($name: String!, $serverSlug: String!, $serverRegion: String!, $zoneID: Int!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          heroic: zoneRankings(${metricClause}zoneID: $zoneID, difficulty: 4)
          mythic:  zoneRankings(${metricClause}zoneID: $zoneID, difficulty: 5)
        }
      }
    }
  `, { name, serverSlug, serverRegion, zoneID: raidZone });

  return data?.characterData?.character ?? null;
}

// ---------------------------------------------------------------------------
// Interrupt data — uses encounterRankings to find the report code + fight ID
// for each dungeon's best run, then queries interrupt tables for those fights.
// encounters = array of { id, name } from zoneRankings where rankPercent != null
// ---------------------------------------------------------------------------
export async function getInterruptsFromBestRuns(name, serverSlug, serverRegion, encounters) {
  if (!encounters?.length) return [];

  // Batch all encounterRankings into a single GraphQL query using field aliases
  const fields = encounters.map(e => `enc_${e.id}: encounterRankings(encounterID: ${e.id})`).join('\n          ');
  const data   = await gql(`
    query BestRuns($name: String!, $serverSlug: String!, $serverRegion: String!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          ${fields}
        }
      }
    }
  `, { name, serverSlug, serverRegion });

  const char = data?.characterData?.character;
  if (!char) return [];

  const nameLower = name.toLowerCase();
  const realRuns  = [];
  const stubs     = [];

  for (const enc of encounters) {
    const ranks = char[`enc_${enc.id}`]?.ranks ?? [];
    const best = ranks.find(r => r.report?.code);
    if (best?.report?.code) {
      realRuns.push({ dungeon: enc.name, code: best.report.code, fightID: best.report.fightID });
    } else {
      // No report code available (private/expired log) — return a stub so this run
      // still counts in the interrupt denominator since the character clearly did it.
      stubs.push({ dungeon: enc.name, players: [], actorNames: [nameLower] });
    }
  }

  const fetched = await fetchInterruptDetails(realRuns, nameLower);

  // If any runs came back stale (character missing from masterData), retry just those.
  // The first request primes the WarcraftLogs cache; the second gets complete data.
  const staleRuns  = [];
  const goodResults = [];
  for (let i = 0; i < fetched.length; i++) {
    if (fetched[i] === null) staleRuns.push(realRuns[i]);
    else goodResults.push(fetched[i]);
  }

  if (staleRuns.length > 0) {
    const retried = await fetchInterruptDetails(staleRuns, nameLower);
    for (const r of retried) {
      if (r !== null) goodResults.push(r);
    }
  }

  return [...goodResults, ...stubs];
}

async function fetchInterruptDetails(runs, nameLower) {
  return Promise.all(
    runs.map(async run => {
      const result = await getInterruptsForFight(run);
      if (!result) return { dungeon: run.dungeon, players: [], actorNames: [nameLower] };
      if (!result.actorNames.includes(nameLower)) return null;
      return result;
    })
  );
}

async function getInterruptsForFight({ code, fightID, dungeon }) {
  const data = await gql(`
    query FightDetails($code: String!, $fightIDs: [Int]) {
      reportData {
        report(code: $code) {
          masterData { actors(type: "Player") { id name } }
          interrupts: table(dataType: Interrupts, fightIDs: $fightIDs)
          damageDone: table(dataType: DamageDone, fightIDs: $fightIDs)
        }
      }
    }
  `, { code, fightIDs: [fightID] });

  const report = data?.reportData?.report;
  if (!report) return null;

  const actors = report.masterData?.actors ?? [];
  const playerIDs = new Set(actors.map(a => a.id));

  // Interrupts table is keyed by spell-interrupted. Aggregate per player across all spells.
  const spells = report.interrupts?.data?.entries?.[0]?.entries ?? [];
  const totals = {};
  for (const spell of spells) {
    for (const detail of spell.details ?? []) {
      if (!playerIDs.has(detail.id)) continue;
      totals[detail.id] = (totals[detail.id] ?? 0) + (detail.total ?? 0);
    }
  }

  const players = Object.entries(totals)
    .map(([id, interrupts]) => ({
      id:         Number(id),
      name:       actors.find(a => a.id === Number(id))?.name ?? 'Unknown',
      interrupts,
    }))
    .sort((a, b) => b.interrupts - a.interrupts);

  // DamageDone table: flat list of players sorted by total damage.
  // Filter to player actors only (excludes pets/guardians).
  const damageEntries = report.damageDone?.data?.entries ?? [];
  const dpsPlayers = damageEntries
    .filter(e => playerIDs.has(e.id))
    .sort((a, b) => b.total - a.total)
    .map(e => ({
      id:    e.id,
      name:  actors.find(a => a.id === e.id)?.name ?? e.name ?? 'Unknown',
      total: e.total,
    }));

  // actorNames includes everyone in the group, even players with 0 interrupts.
  const actorNames = actors.map(a => a.name.toLowerCase());

  return { code, fightID, dungeon, players, actorNames, dpsPlayers };
}
