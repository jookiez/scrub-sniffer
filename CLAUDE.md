# Scrub Sniffer — Claude Context

WoW M+ player vetting tool. Looks up a character on WarcraftLogs and grades them PASS or SCRUB based on M+ parse percentiles, raid history, and interrupt performance.

Deployed at: https://scrub-sniffer.vercel.app
GitHub: https://github.com/jookiez/scrub-sniffer

## Project structure

```
api/lookup.js                Vercel serverless handler (the web API endpoint)
src/index.js                 CLI entry point (node --env-file=.env src/index.js <name> <server> [region])
src/api/warcraftlogs-v2.js   WarcraftLogs V2 GraphQL client
src/utils/grader.js          Role-aware grading logic
src/utils/roles.js           Role detection from spec name, per-role config
public/index.html            Frontend (single-file, no build step)
vercel.json                  Rewrites: /api/* → api functions, /* → public/index.html
.env                         Credentials (gitignored — see .env.example for keys needed)
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

| Role   | M+ metric            | Raid metric | M+ threshold | M+ int-bonus threshold             | Raid threshold |
|--------|----------------------|-------------|--------------|------------------------------------|----------------|
| DPS    | `points_and_damage`  | `dps`       | 80%          | 70% (needs top-2 int ≥50% of runs) | 70%            |
| Healer | `hps`                | `hps`       | 80%          | no bonus                           | 70%            |
| Tank   | `dps`                | `krsi`      | 70%          | n/a                                | 70%            |

**Tank and healer M+ metrics are still TBD / under review.**

## M+ metric details

### DPS — `points_and_damage`
Returns two things in one query:
- `rankings[].rankPercent` — key score % (ignored for grading)
- `throughputRankings` — object keyed by encounter ID, only populated for dungeons done at a high enough key level. Contains `best_historical_percentile` (damage % filtered to same key tier). **This is what we use.**

`grader.summarizeMythicPlus` detects the presence of `throughputRankings` and reads from it instead of `rankings[].rankPercent`. `bestPerformanceAverage` is already the avg of throughput values.

### Tank — `dps` (role-compared within tank spec)
Uses standard `rankings[].rankPercent` format. `krsi` is NOT available for M+ zones.

### Healer — `hps` (role-compared within healer spec)
Uses standard `rankings[].rankPercent` format.

## Key GraphQL details

- Character M+ uses `zoneRankings(zoneID: $zoneID, metric: ...)` — NOT `mythicPlusRankings` (doesn't exist)
- Three rankings blobs fetched per M+ query: `pointsAndDamageRankings`, `dpsRankings`, `hpsRankings`
- Role is detected first (from `dpsRankings.allStars[0].spec` or `hpsRankings.allStars[0].spec`), then the correct blob is passed to the grader
- Interrupt table nesting: `table.data.entries[0].entries` (double nested — outer is per-fight, inner is per-spell)
- Interrupt table is keyed by spell, not player — must aggregate per player across all spell entries
- `encounterRankings` is used to get the best run's report code + fight ID per dungeon for interrupt lookups

## Running locally

```bash
node --env-file=.env src/index.js <characterName> <server> [region]
# e.g.
node --env-file=.env src/index.js Nightmehr alleria us
```

## Deploying

Push to `main` → Vercel auto-deploys. Env vars must be set in Vercel dashboard under Production environment:
- `WARCRAFTLOGS_CLIENT_ID`
- `WARCRAFTLOGS_CLIENT_SECRET`
