import { getCharacterMythicPlusData, getCharacterRaidData, getInterruptsFromBestRuns, getCurrentZones } from '../src/api/warcraftlogs-v2.js';
import { summarizeRaid, summarizeMythicPlus, summarizeInterrupts, summarizeTopDps, getVerdict } from '../src/utils/grader.js';
import { detectRole, extractSpecFromRankings, ROLE_CONFIG } from '../src/utils/roles.js';

// ---------------------------------------------------------------------------
// Per-IP rate limiter — 10 unique lookups per minute per IP.
// Cached responses don't count against the limit (they bypass this check).
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT     = 10;
const ipRequests     = new Map(); // IP -> [timestamp, ...]

function isRateLimited(ip) {
  const now        = Date.now();
  const timestamps = (ipRequests.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// In-process cache — catches repeated lookups within a warm serverless instance.
// Vercel edge cache (Cache-Control headers) handles the cross-instance case.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache        = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { name, server, region = 'us' } = req.query;

  if (!name || !server) {
    return res.status(400).json({ error: 'Missing required params: name, server' });
  }

  // Zone IDs are part of the cache key so a season rollover invalidates every
  // cached result instead of serving last season's grades from a warm instance.
  const zones    = await getCurrentZones();
  const cacheKey = `${zones.mplusZone}-${zones.raidZone}-${name.toLowerCase()}-${server.toLowerCase()}-${region.toLowerCase()}`;
  const cached   = getCached(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  // Rate limit uncached (live) requests by IP.
  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — slow down and try again in a minute.' });
  }

  try {
    // Step 1: M+ query — also used to detect role/spec from allStars
    const charMplus = await getCharacterMythicPlusData(name, server, region);
    if (!charMplus) {
      return res.status(404).json({ error: `Character not found: ${name}-${server}` });
    }

    const specName = extractSpecFromRankings(charMplus);
    const role     = detectRole(specName);
    const cfg      = ROLE_CONFIG[role];

    const mplusRankings = role === 'healer' ? charMplus.pointsAndHealingRankings
                        :                    charMplus.pointsAndDamageRankings;
    const mplus         = summarizeMythicPlus(mplusRankings);
    const healerDmg     = role === 'healer' ? summarizeMythicPlus(charMplus.pointsAndDamageRankings) : null;
    const encounters    = mplus.runs.map(r => ({ id: r.encounterID, name: r.dungeon }));

    // Step 2: fetch raid + interrupts in parallel with role-correct metric
    const [charRaid, interruptRuns] = await Promise.all([
      getCharacterRaidData(name, server, region, cfg.raidMetric),
      getInterruptsFromBestRuns(name, server, region, encounters),
    ]);

    const raid       = summarizeRaid(charRaid?.heroic, charRaid?.mythic);
    const interrupts = summarizeInterrupts(interruptRuns, name);
    const topDpsData = role === 'dps' ? summarizeTopDps(interruptRuns, name) : null;
    const { verdict, reasons } = getVerdict(role, raid, mplus, interrupts, { topDpsData, healerDmg });

    // Build a dungeon → WarcraftLogs report URL map from interrupt run data (which fetched report codes)
    const reportLinks = {};
    for (const run of interruptRuns) {
      if (run.code && run.fightID && run.dungeon) {
        reportLinks[run.dungeon] = `https://www.warcraftlogs.com/reports/${run.code}#fight=${run.fightID}`;
      }
    }

    const payload = {
      character: { name, server, region, specName, role, roleLabel: cfg.label },
      season: { mplus: zones.mplusLabel, raid: zones.raidLabel },
      verdict,
      reasons,
      mplus,
      healerDmg,
      raid,
      interrupts,
      topDps: topDpsData,
      reportLinks,
    };

    setCached(cacheKey, payload);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
