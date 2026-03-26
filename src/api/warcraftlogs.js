// WarcraftLogs V1 API client
// Docs: https://www.warcraftlogs.com/v1/docs

const BASE_URL = 'https://www.warcraftlogs.com/v1';

function getApiKey() {
  const key = process.env.WARCRAFTLOGS_API_KEY;
  if (!key) throw new Error('WARCRAFTLOGS_API_KEY is not set in environment');
  return key;
}

async function wclFetch(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WarcraftLogs API error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Get all parses for a character across all raid/dungeon encounters.
 * @param {string} characterName
 * @param {string} serverName  e.g. "area-52"
 * @param {string} region      e.g. "us", "eu", "kr", "tw"
 * @param {Object} options     { zone, metric, difficulty, partition }
 */
export async function getCharacterParses(characterName, serverName, region, options = {}) {
  const path = `/parses/character/${encodeURIComponent(characterName)}/${encodeURIComponent(serverName)}/${region}`;
  return wclFetch(path, options);
}

/**
 * Get rankings for a character (how they rank globally per boss).
 * @param {string} characterName
 * @param {string} serverName
 * @param {string} region
 * @param {Object} options  { zone, metric, difficulty, partition }
 */
export async function getCharacterRankings(characterName, serverName, region, options = {}) {
  const path = `/rankings/character/${encodeURIComponent(characterName)}/${encodeURIComponent(serverName)}/${region}`;
  return wclFetch(path, options);
}

/**
 * Get zone (raid/dungeon) metadata — useful for mapping zone IDs to names.
 */
export async function getZones() {
  return wclFetch('/zones');
}

/**
 * Get character class/spec metadata.
 */
export async function getClasses() {
  return wclFetch('/classes');
}
