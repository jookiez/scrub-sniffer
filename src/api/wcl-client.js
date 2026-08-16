// WarcraftLogs V2 transport — OAuth token handling + GraphQL POST.
// Shared by the character queries (warcraftlogs-v2.js) and the season/zone
// resolver (zones.js) so both reuse one cached token.
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
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

export async function gql(query, variables = {}) {
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
