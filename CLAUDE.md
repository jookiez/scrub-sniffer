# Scrub Sniffer — Claude Context

WoW M+ player vetting tool. Looks up a character on WarcraftLogs and grades them PASS or SCRUB based on M+ parse percentiles, raid history, and interrupt performance.

Deployed at: https://scrub-sniffer.vercel.app
GitHub: https://github.com/jookiez/scrub-sniffer

## Project structure

```
api/lookup.js                Vercel serverless handler (the web API endpoint)
src/index.js                 CLI entry point (node --env-file=.env src/index.js <name> <server> [region])
src/api/wcl-client.js        OAuth token + GraphQL transport (shared)
src/api/zones.js             Resolves which season / raid tier to grade against
src/api/warcraftlogs-v2.js   WarcraftLogs V2 character queries
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

## Zone IDs / seasons — auto-detected, do not hardcode

`src/api/zones.js` resolves the live M+ season and raid tier at runtime, so the
site rolls over to a new season on its own. **Nothing to update each season.**

How it decides: it lists the newest expansion's zones and picks the newest one
that has **rankings** in it. Newest-by-ID alone is wrong — WarcraftLogs publishes
next season's zone weeks early and accepts test logs into it, but rankings stay
empty until the season actually opens. M+ and raid resolve independently, so a
raid tier that opens a week after the M+ season flips on its own schedule.

Two traps the filtering handles (both real, verified 2026-08-15):
- **PTR twins share the live zone's name.** Zone 54 "The Venomous Abyss" is PTR,
  zone 53 "The Venomous Abyss" is live — the only difference is the *partition*
  ("PTR" vs "12.1"). PTR testers do get ranked, so a zone whose partitions are
  all test partitions is rejected. Name filtering alone would grade beta parses.
- Non-content zones with plausible encounter counts, e.g. zone 52 "Dummy Dome"
  (5 target-dummy encounters), "Complete Raids" rollups, Delves, Mage Tower.

Resolution order: `MPLUS_ZONE_ID` / `RAID_ZONE_ID` env vars → auto-detection
(cached 6h per warm instance) → `FALLBACK` in zones.js.

Set the env vars in the Vercel dashboard to pin a season with no redeploy — the
escape hatch if detection ever picks wrong. Unset them to resume auto-detection.

The resolved season is returned in the API payload as `season: { mplus, raid }`
and rendered next to the Mythic+ / Raid section titles, so the site always shows
which season it graded. The CLI prints it too, with the zone IDs and whether
they came from env, detection, or fallback.

Zone IDs for reference (`worldData { expansions { zones { id name } } }`):
TWW S1=39, S2=43, S3=45 · Midnight S1=47, S2=55 · Raids: Manaforge Omega=44,
VS/DR/MQD=46, The Venomous Abyss=53.

## Role detection and grading

Role is auto-detected from the spec name in `allStars[0].spec` on M+ rankings.

| Role   | M+ metric              | Raid metric | M+ threshold | M+ int-bonus threshold             | Raid threshold |
|--------|------------------------|-------------|--------------|------------------------------------|----------------|
| DPS    | `points_and_damage`    | `dps`       | 80%          | 70% (needs top-2 int ≥50% of runs) | 70%            |
| Healer | `points_and_healing`   | `hps`       | 70%          | no bonus                           | 70%            |

Healers also require M+ damage avg (`points_and_damage`) >= 50%.
| Tank   | `points_and_damage`    | `dps`       | 50%          | n/a                                | 50%            |

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
- Season-scoped for free: encounter IDs are unique per season (Ruby Life Pools is 112521 in Midnight S2, a different ID in every other season), and the IDs come from the resolved season's `zoneRankings`, so no zone filter is needed here
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

Optional, normally unset (see the zone section above):
- `MPLUS_ZONE_ID` — pin the M+ season zone, overriding auto-detection
- `RAID_ZONE_ID` — pin the raid tier zone, overriding auto-detection
