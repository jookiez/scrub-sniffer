// WarcraftLogs V2 GraphQL API client (OAuth Client Credentials)
// Docs: https://www.warcraftlogs.com/api/docs

const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const GQL_URL   = 'https://www.warcraftlogs.com/api/v2/client';

// Update this each season. Zone IDs confirmed via worldData.expansions query:
// TWW S1=39, TWW S2=43, TWW S3=45, Midnight S1=47
// Raids: Manaforge Omega=44, VS/DR/MQD=46
const CURRENT_MPLUS_ZONE = 47;
const CURRENT_RAID_ZONE  = 46;

let _token       = null;
let _tokenExpiry = 0;

function getCredentials() {
  const clientId     = process.env.WARCRAFTLOGS_CLIENT_ID;
  const clientSecret = process.env.WARCRAFTLOGS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET in .env');
  }
  return { clientId, clientSecret };
}

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token request failed ${res.status}: ${text}`);
  }
  const data   = await res.json();
  _token       = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

async function gql(query, variables = {}) {
  const token = await getToken();
  const res   = await fetch(GQL_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body:    JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphQL request failed ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors.map(e => e.message).join(', ')}`);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// M+ rankings — fetches both dps and hps metrics in one request using aliases.
// Role detection uses allStars spec from whichever metric has data.
// Caller picks playerscoreRankings (DPS), dpsRankings (tank), or hpsRankings (healer) based on role.
// krsi is not supported on M+ zones — dps compares within role automatically.
// ---------------------------------------------------------------------------
export async function getCharacterMythicPlusData(name, serverSlug, serverRegion) {
  const data = await gql(`
    query MythicPlusData($name: String!, $serverSlug: String!, $serverRegion: String!, $zoneID: Int!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          name
          classID
          playerscoreRankings: zoneRankings(zoneID: $zoneID, metric: playerscore)
          dpsRankings:         zoneRankings(zoneID: $zoneID, metric: dps)
          hpsRankings:         zoneRankings(zoneID: $zoneID, metric: hps)
        }
      }
    }
  `, { name, serverSlug, serverRegion, zoneID: CURRENT_MPLUS_ZONE });

  return data?.characterData?.character ?? null;
}

// ---------------------------------------------------------------------------
// Raid rankings — heroic (4) + mythic (5) for the current raid tier.
// metric varies by role: dps | hps | krsi
// ---------------------------------------------------------------------------
export async function getCharacterRaidData(name, serverSlug, serverRegion, metric = null) {
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
  `, { name, serverSlug, serverRegion, zoneID: CURRENT_RAID_ZONE });

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

  const bestRuns = encounters
    .map(enc => {
      const best = char[`enc_${enc.id}`]?.ranks?.[0];
      if (!best?.report?.code) return null;
      return { dungeon: enc.name, code: best.report.code, fightID: best.report.fightID };
    })
    .filter(Boolean);

  if (!bestRuns.length) return [];

  // Query interrupt tables for each best run in parallel
  const results = await Promise.all(bestRuns.map(run => getInterruptsForFight(run)));
  return results.filter(Boolean);
}

async function getInterruptsForFight({ code, fightID, dungeon }) {
  const data = await gql(`
    query FightInterrupts($code: String!, $fightIDs: [Int]) {
      reportData {
        report(code: $code) {
          masterData { actors(type: "Player") { id name } }
          table(dataType: Interrupts, fightIDs: $fightIDs)
        }
      }
    }
  `, { code, fightIDs: [fightID] });

  const report = data?.reportData?.report;
  if (!report) return null;

  const actors = report.masterData?.actors ?? [];
  // The table returns [{ entries: [...spells] }] — one wrapper object per fight
  const spells = report.table?.data?.entries?.[0]?.entries ?? [];
  const totals = {};

  // Interrupts table is keyed by spell-interrupted. Aggregate per player across all spells.
  // Filter to only actors of type Player (actors list already scoped to players).
  const playerIDs = new Set(actors.map(a => a.id));
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

  return { code, fightID, dungeon, players };
}
