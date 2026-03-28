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

| Role   | M+ metric              | Raid metric | M+ threshold | M+ int-bonus threshold             | Raid threshold |
|--------|------------------------|-------------|--------------|------------------------------------|----------------|
| DPS    | `points_and_damage`    | `dps`       | 80%          | 70% (needs top-2 int ≥50% of runs) | 70%            |
| Healer | `points_and_healing`   | `hps`       | 80%          | no bonus                           | 70%            |
| Tank   | `points_and_damage`    | `dps`       | 70%          | n/a                                | 70%            |

Notes:
- `krsi` (survivability index) is **deprecated** — returns no data for current zones. Do not use.
- Tanks and DPS share the same M+ rankings blob (`pointsAndDamageRankings`).

## M+ metric details — `points_and_damage` / `points_and_healing`

These metrics return two things:
- `rankings[].rankPercent` — key score % (not used for grading)
- `throughputRankings` — object keyed by encounter ID, **only populated for dungeons done at a high enough key level**. Contains `best_historical_percentile` (damage or healing % filtered to same key tier). **This is what we grade on.**

`grader.summarizeMythicPlus` detects the presence of `throughputRankings` and reads from it. `bestPerformanceAverage` from the blob is already the avg of those filtered values.

Dungeons not in `throughputRankings` (too low a key, or not run) are surfaced as missing.

## M+ query — three rankings blobs fetched in one request

```graphql
pointsAndDamageRankings:  zoneRankings(zoneID: $zoneID, metric: points_and_damage)
pointsAndHealingRankings: zoneRankings(zoneID: $zoneID, metric: points_and_healing)
dpsRankings:              zoneRankings(zoneID: $zoneID, metric: dps)
```

- `dpsRankings` is kept for spec detection only (`allStars[0].spec` reliably identifies DPS and tank specs)
- `pointsAndHealingRankings.allStars[0].spec` is used as fallback for healer spec detection
- Role is detected first, then the correct blob is passed to `summarizeMythicPlus`

## Interrupt logic

- Source: `encounterRankings` per dungeon → best run report code → interrupt table
- Interrupt table nesting: `table.data.entries[0].entries` (double nested — outer is per-fight, inner is per-spell)
- Table is keyed by spell interrupted, not player — must aggregate per player across all spells
- If a dungeon has no report code (private/expired log), a stub is returned with the character in `actorNames` so the run still counts in the denominator
- If a report code exists but `getInterruptsForFight` returns null (report private/still processing), that run also falls back to a stub — **do not use `.filter(Boolean)` to drop null results**, or the denominator will be too low
- Players with 0 interrupts don't appear in the interrupt table — `actorNames` (all group members from `masterData`) is used to detect presence
- Rank check must be `idx >= 0 && idx <= N` — `idx = -1` (not found) must not be treated as a top rank

## Shareable links

The frontend supports pre-filled lookups via query params:

```
https://scrub-sniffer.vercel.app/?name=dookiez&server=alleria&region=us
```

- On page load, if `name` + `server` params are present the form auto-fills and the lookup fires immediately
- After every sniff the URL updates to reflect the current character (via `history.replaceState`)
- The verdict card has a "Copy link" button that copies the current URL to clipboard

## Running locally

```bash
node --env-file=.env src/index.js <characterName> <server> [region]
# e.g.
node --env-file=.env src/index.js Defnotash alleria us
```

## Deploying

Push to `main` → Vercel auto-deploys. Env vars must be set in Vercel dashboard under Production environment:
- `WARCRAFTLOGS_CLIENT_ID`
- `WARCRAFTLOGS_CLIENT_SECRET`
