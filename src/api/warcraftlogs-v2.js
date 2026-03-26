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
// M+ rankings — uses zoneRankings with the current M+ season zone.
// Returns bestPerformanceAverage (avg %) + per-dungeon rankPercent.
// spec is embedded in allStars[0] for role detection.
// metric is omitted — API defaults to playerscore for M+ zones.
// ---------------------------------------------------------------------------
export async function getCharacterMythicPlusData(name, serverSlug, serverRegion) {
  const data = await gql(`
    query MythicPlusData($name: String!, $serverSlug: String!, $serverRegion: String!, $zoneID: Int!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          name
          classID
          zoneRankings(zoneID: $zoneID)
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
// Interrupt data — fetches recent M+ reports then queries interrupt table
// per fight. Returns per-player interrupt counts ranked highest to lowest.
// ---------------------------------------------------------------------------
export async function getRecentKeyInterrupts(name, serverSlug, serverRegion) {
  const data = await gql(`
    query RecentReports($name: String!, $serverSlug: String!, $serverRegion: String!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          recentReports(limit: 10) {
            data {
              code
              fights {
                id
                keystoneLevel
                name
                friendlyPlayers
              }
            }
          }
        }
      }
    }
  `, { name, serverSlug, serverRegion });

  const reports = data?.characterData?.character?.recentReports?.data ?? [];

  // Only care about M+ fights (keystoneLevel is non-null)
  const mplusFights = reports
    .flatMap(r => (r.fights ?? [])
      .filter(f => f.keystoneLevel)
      .map(f => ({ code: r.code, fightID: f.id, keystoneLevel: f.keystoneLevel, dungeon: f.name, friendlyPlayers: f.friendlyPlayers }))
    )
    .sort((a, b) => b.keystoneLevel - a.keystoneLevel)
    .slice(0, 10);

  if (mplusFights.length === 0) return [];

  const results = await Promise.all(mplusFights.map(f => getInterruptsFromFight(f)));
  return results.filter(Boolean);
}

export async function getInterruptsFromFight({ code, fightID, keystoneLevel, dungeon, friendlyPlayers }) {
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

  const actors  = report.masterData?.actors ?? [];
  const entries = report.table?.data?.entries ?? [];

  const players = entries
    .filter(e => friendlyPlayers?.includes(e.id))
    .map(e => ({
      id:         e.id,
      name:       actors.find(a => a.id === e.id)?.name ?? e.name ?? 'Unknown',
      interrupts: e.total ?? 0,
    }))
    .sort((a, b) => b.interrupts - a.interrupts);

  return { code, fightID, keystoneLevel, dungeon, players };
}
