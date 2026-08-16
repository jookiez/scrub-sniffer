// Which season are we grading?
//
// WarcraftLogs mints a brand new zone ID for every M+ season and every raid
// tier, so a hardcoded ID silently goes stale the day a season flips — the site
// keeps happily grading last season's parses. Instead of hardcoding, we ask
// WarcraftLogs which zones exist and use the newest one that is actually live.
//
// "Newest" alone is not enough: WCL publishes the next season's zone weeks
// ahead of time and even accepts test/PTR logs into it. Checked 2026-08-15,
// zone 55 (Mythic+ Season 2) and zone 53 (The Venomous Abyss) both already had
// uploaded reports but *zero* ranked characters, while the live zones 47 and 46
// had full rankings. Rankings are the thing that only appears once a season
// genuinely opens, so that is the switch we test.
//
// The M+ zone and the raid zone are resolved independently, which is what you
// want — a raid tier usually opens a week after the M+ season starts, and each
// side flips on its own as soon as it has data.
//
// Escape hatches, in priority order:
//   1. MPLUS_ZONE_ID / RAID_ZONE_ID env vars pin a zone outright (set them in
//      the Vercel dashboard to force a season with no redeploy).
//   2. Auto-detection, cached for 6 hours per warm instance.
//   3. FALLBACK below, if WarcraftLogs is unreachable or returns nothing usable.

import { gql } from './wcl-client.js';

// Last known-good live zones. Only used if detection fails outright.
// Midnight S1 = 47, Midnight raid VS / DR / MQD = 46.
// (Next up, for reference: Midnight S2 = 55, The Venomous Abyss = 53.)
const FALLBACK = {
  mplusZone:  47,
  mplusLabel: 'Mythic+ Season 1',
  raidZone:   46,
  raidLabel:  'VS / DR / MQD',
  source:     'fallback',
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Zones that exist in the API but are never the live thing we grade against:
// test realms, the "Complete Raids" rollup zones, target dummies, delves, etc.
const NOT_LIVE_CONTENT = /\b(ptr|beta|alpha)\b|dummy|complete raid|delve|mage tower|challenge mode/i;

// Some test zones are not marked in their name at all — WarcraftLogs ships a PTR
// twin of each raid carrying the *same* zone name as the live one, with "PTR"
// only on the partition (zone 54 "The Venomous Abyss" (PTR) vs zone 53 "The
// Venomous Abyss" (12.1)). PTR testers do get ranked, so name filtering alone
// would happily grade players on beta parses. A zone whose partitions are *all*
// test partitions is a test zone.
const TEST_PARTITION = /\b(ptr|beta|alpha)\b/i;

// A real M+ season has 8 dungeons and a real raid has 8-9 bosses. The floor
// filters out one-off zones (world bosses, single-encounter events).
const MIN_MPLUS_ENCOUNTERS = 5;
const MIN_RAID_ENCOUNTERS  = 6;

// Probe raids on heroic: it opens with the tier, while mythic is usually gated
// a week later and would keep a live raid looking empty.
const HEROIC_DIFFICULTY = 4;

let _cached   = null;
let _cachedAt = 0;

function envZone(key) {
  const raw = process.env[key];
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isMythicPlus(zone) {
  return /^mythic\+/i.test(zone.name ?? '');
}

function isTestZone(zone) {
  const partitions = zone.partitions ?? [];
  if (partitions.length === 0) return false;
  return partitions.every(p => TEST_PARTITION.test(p.compactName ?? p.name ?? ''));
}

function isCandidate(zone, { mplus }) {
  const name = zone.name ?? '';
  if (NOT_LIVE_CONTENT.test(name)) return false;
  if (isTestZone(zone)) return false;
  if (isMythicPlus(zone) !== mplus) return false;
  const min = mplus ? MIN_MPLUS_ENCOUNTERS : MIN_RAID_ENCOUNTERS;
  return (zone.encounters?.length ?? 0) >= min;
}

// A zone is live once WarcraftLogs has ranked at least one character in it.
async function hasRankings(zone, difficulty) {
  const encounterID = zone.encounters?.[0]?.id;
  if (!encounterID) return false;

  const difficultyArg = difficulty ? `difficulty: ${difficulty}, ` : '';
  try {
    const data = await gql(`
      query ZoneLiveness($encounterID: Int!) {
        worldData {
          encounter(id: $encounterID) {
            characterRankings(${difficultyArg}includeCombatantInfo: false)
          }
        }
      }
    `, { encounterID });
    return (data?.worldData?.encounter?.characterRankings?.rankings?.length ?? 0) > 0;
  } catch {
    return false; // treat a failed probe as "not live" and fall through to older zones
  }
}

/**
 * Gradeable zones for one content type, newest first. Exported so the season
 * heuristic can be tested against a real zone list without waiting for a season.
 * Capped so a weird API response can't fan out into a dozen probe requests.
 */
export function candidatesFor(zones, { mplus }) {
  return zones
    .filter(z => isCandidate(z, { mplus }))
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);
}

// Walk candidates newest-first and take the first one with rankings in it.
async function pickLiveZone(zones, { mplus }) {
  for (const zone of candidatesFor(zones, { mplus })) {
    if (await hasRankings(zone, mplus ? null : HEROIC_DIFFICULTY)) return zone;
  }
  return null;
}

async function detectZones() {
  const data = await gql(`
    query CurrentZones {
      worldData {
        expansions {
          id
          zones { id name partitions { name compactName } encounters { id } }
        }
      }
    }
  `);

  const expansions = data?.worldData?.expansions ?? [];
  if (expansions.length === 0) return null;

  // Newest expansion first, but fall back through older ones so the site keeps
  // working during the window where a new expansion exists but nothing is live.
  const ordered = [...expansions].sort((a, b) => b.id - a.id).slice(0, 2);

  let mplus = null;
  let raid  = null;
  for (const expansion of ordered) {
    const zones = expansion.zones ?? [];
    mplus ??= await pickLiveZone(zones, { mplus: true });
    raid  ??= await pickLiveZone(zones, { mplus: false });
    if (mplus && raid) break;
  }
  if (!mplus && !raid) return null;

  return {
    mplusZone:  mplus?.id   ?? FALLBACK.mplusZone,
    mplusLabel: mplus?.name ?? FALLBACK.mplusLabel,
    raidZone:   raid?.id    ?? FALLBACK.raidZone,
    raidLabel:  raid?.name  ?? FALLBACK.raidLabel,
    source:     'detected',
  };
}

/**
 * Resolve the zones to grade against.
 * @returns {Promise<{mplusZone:number, mplusLabel:string, raidZone:number, raidLabel:string, source:string}>}
 */
export async function getCurrentZones() {
  const pinnedMplus = envZone('MPLUS_ZONE_ID');
  const pinnedRaid  = envZone('RAID_ZONE_ID');
  if (pinnedMplus && pinnedRaid) {
    return {
      mplusZone:  pinnedMplus,
      mplusLabel: `Zone ${pinnedMplus}`,
      raidZone:   pinnedRaid,
      raidLabel:  `Zone ${pinnedRaid}`,
      source:     'env',
    };
  }

  if (_cached && Date.now() - _cachedAt < CACHE_TTL_MS) return _cached;

  let resolved;
  try {
    resolved = await detectZones() ?? FALLBACK;
  } catch (err) {
    console.error('Zone detection failed, using fallback zones:', err.message);
    resolved = FALLBACK;
  }

  // A single pinned env var still wins over the detected value for that side.
  if (pinnedMplus) resolved = { ...resolved, mplusZone: pinnedMplus, mplusLabel: `Zone ${pinnedMplus}` };
  if (pinnedRaid)  resolved = { ...resolved, raidZone:  pinnedRaid,  raidLabel:  `Zone ${pinnedRaid}` };

  _cached   = resolved;
  _cachedAt = Date.now();
  return resolved;
}
