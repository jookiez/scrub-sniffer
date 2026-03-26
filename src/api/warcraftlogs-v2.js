// WarcraftLogs V2 GraphQL API client (OAuth Client Credentials)
// Docs: https://www.warcraftlogs.com/api/docs

const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const GQL_URL   = 'https://www.warcraftlogs.com/api/v2/client';

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
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 60s buffer
  return _token;
}

async function gql(query, variables = {}) {
  const token = await getToken();
  const res   = await fetch(GQL_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
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
// Character M+ rankings — returns percentile data for best runs per dungeon.
// metric: 'dps' | 'hps' | 'krsi' | null (null = API auto-selects by spec)
// On first call use null to detect role, then re-call with the correct metric.
// ---------------------------------------------------------------------------
export async function getCharacterMythicPlusData(name, serverSlug, serverRegion, metric = null) {
  const metricArg = metric ? `(metric: ${metric})` : '';
  const data = await gql(`
    query MythicPlusData($name: String!, $serverSlug: String!, $serverRegion: String!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          name
          classID
          mythicPlusRankings${metricArg}
        }
      }
    }
  `, { name, serverSlug, serverRegion });

  return data?.characterData?.character ?? null;
}

// ---------------------------------------------------------------------------
// Raid zone rankings — fetches heroic (4) and mythic (5) parses separately.
// metric: 'dps' | 'hps' | 'krsi' | null (null = API default)
// zoneID 0 = current tier; pass explicit ID to pin a specific tier.
// ---------------------------------------------------------------------------
export async function getCharacterRaidData(name, serverSlug, serverRegion, metric = null, zoneID = 0) {
  const metricArg = metric ? `metric: ${metric}, ` : '';
  const data = await gql(`
    query RaidRankings(
      $name: String!, $serverSlug: String!, $serverRegion: String!,
      $zoneID: Int!
    ) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          name
          heroic: zoneRankings(${metricArg}zoneID: $zoneID, difficulty: 4)
          mythic:  zoneRankings(${metricArg}zoneID: $zoneID, difficulty: 5)
        }
      }
    }
  `, { name, serverSlug, serverRegion, zoneID });

  return data?.characterData?.character ?? null;
}

// ---------------------------------------------------------------------------
// Interrupt data — fetches recent M+ report codes, then queries interrupt
// tables from each fight. Returns per-player interrupt counts per run.
// ---------------------------------------------------------------------------
export async function getRecentKeyInterrupts(name, serverSlug, serverRegion) {
  // Step 1: get recent M+ runs embedded in mythicPlusRankings (includes report codes)
  const char = await getCharacterMythicPlusData(name, serverSlug, serverRegion);
  if (!char) return null;

  const rankings   = char.mythicPlusRankings?.rankings ?? [];
  const reportCodes = [
    ...new Set(
      rankings
        .flatMap(r => r.runs ?? [])
        .filter(r => r.report?.code)
        .sort((a, b) => b.keystoneLevel - a.keystoneLevel) // highest keys first
        .slice(0, 10)                                       // cap at 10 reports
        .map(r => r.report.code)
    ),
  ];

  if (reportCodes.length === 0) return [];

  // Step 2: for each report, fetch interrupt table per fight
  const results = await Promise.all(
    reportCodes.map(code => getInterruptsFromReport(code))
  );

  return results.flat().filter(Boolean);
}

export async function getInterruptsFromReport(code) {
  const data = await gql(`
    query ReportInterrupts($code: String!) {
      reportData {
        report(code: $code) {
          fights(difficulty: 10) {
            id
            keystoneLevel
            dungeon { name }
            friendlyPlayers
          }
          interrupts: table(dataType: Interrupts)
        }
      }
    }
  `, { code });

  const report = data?.reportData?.report;
  if (!report) return [];

  const fights    = report.fights ?? [];
  const interruptTable = report.interrupts?.data?.entries ?? [];

  return fights.map(fight => ({
    code,
    fightID:       fight.id,
    keystoneLevel: fight.keystoneLevel,
    dungeon:       fight.dungeon?.name ?? 'Unknown',
    players:       interruptTable
      .filter(e => fight.friendlyPlayers?.includes(e.id))
      .map(e => ({ name: e.name, id: e.id, interrupts: e.total ?? 0 }))
      .sort((a, b) => b.interrupts - a.interrupts),
  }));
}
