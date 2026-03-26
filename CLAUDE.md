# Scrub Sniffer — Claude Context

WoW M+ player vetting tool. Looks up a character on WarcraftLogs and grades them PASS or SCRUB based on M+ parse percentiles, raid history, and interrupt performance.

Deployed at: https://scrub-sniffer.vercel.app
GitHub: https://github.com/jookiez/scrub-sniffer

## Project structure

```
api/lookup.js           Vercel serverless handler (the web API endpoint)
src/index.js            CLI entry point (node --env-file=.env src/index.js <name> <server> [region])
src/api/warcraftlogs-v2.js   WarcraftLogs V2 GraphQL client
src/utils/grader.js     Role-aware grading logic
src/utils/roles.js      Role detection from spec name, per-role config
public/index.html       Frontend (single-file, no build step)
vercel.json             Rewrites: /api/* → api functions, /* → public/index.html
.env                    Credentials (gitignored — see .env.example for keys needed)
```

## APIs used

**WarcraftLogs V2 GraphQL** — `https://www.warcraftlogs.com/api/v2/client`
- Auth: OAuth2 client credentials (token cached in memory, auto-refreshes)
- Credentials in env: `WARCRAFTLOGS_CLIENT_ID`, `WARCRAFTLOGS_CLIENT_SECRET`
- Client owned by user `jookiez` on warcraftlogs.com

## Zone IDs (update each season)

```javascript
// warcraftlogs-v2.js
const CURRENT_MPLUS_ZONE = 47;  // Midnight S1
const CURRENT_RAID_ZONE  = 46;  // VS / DR / MQD
```

To find new zone IDs: query `worldData { expansions { zones { id name } } }` on the V2 API.

## Role detection and grading

Role is auto-detected from the spec name in `allStars[0].spec` on M+ rankings.

| Role   | M+ metric | Raid metric | M+ threshold | M+ int-bonus threshold | Raid threshold |
|--------|-----------|-------------|--------------|------------------------|----------------|
| DPS    | `dps`     | `dps`       | 80%          | 70% (needs top-2 int ≥50% of runs) | 70% |
| Healer | `hps`     | `hps`       | 80%          | no bonus               | 70%            |
| Tank   | `dps`     | `krsi`      | 70%          | n/a                    | 70%            |

Notes:
- `krsi` (survivability index) is NOT available on M+ zones — tanks use `dps` metric for M+
- M+ fetches BOTH `dpsRankings` and `hpsRankings` in one query using GraphQL field aliases; role is detected first, then the appropriate rankings blob is passed to the grader
- Interrupt data is fetched via `encounterRankings` per dungeon → best run report code → interrupt table

## Key GraphQL details

- Character M+ uses `zoneRankings(zoneID: $zoneID, metric: dps)` — NOT `mythicPlusRankings` (that field doesn't exist)
- Interrupt table nesting: `table.data.entries[0].entries` (double nested — outer array is per-fight, inner is per-spell-interrupted)
- Interrupt table is keyed by spell, not player — must aggregate per player across all spell entries
- `encounterRankings` is used to get the best run's report code + fight ID for each dungeon

## Running locally

```bash
node --env-file=.env src/index.js <characterName> <server> [region]
# e.g.
node --env-file=.env src/index.js Dookiez alleria us
```

## Deploying

Push to `main` → Vercel auto-deploys. Env vars must be set in Vercel dashboard under Production environment:
- `WARCRAFTLOGS_CLIENT_ID`
- `WARCRAFTLOGS_CLIENT_SECRET`
