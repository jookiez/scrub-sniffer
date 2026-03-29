/**
 * Scrub Sniffer — grading logic (role-aware)
 *
 * DPS:
 *   - M+ damage parse avg >= 80%  → PASS
 *   - M+ damage parse avg >= 70% + top-2 interrupts in >= 50% of runs → PASS
 *   - Raid heroic/mythic avg >= 70%  (required)
 *
 * Healer:
 *   - M+ HPS parse avg >= 80%  → PASS  (no interrupt bonus)
 *   - Raid heroic/mythic HPS avg >= 70%  (required)
 *
 * Tank:
 *   - M+ survivability (KRSI) parse avg >= 70%  → PASS
 *   - Raid heroic/mythic KRSI avg >= 70%  (required)
 *   - Interrupts are EXPECTED — warn if they're not top-2
 *
 * All roles: must have at least one heroic or mythic raid encounter logged.
 */

import { ROLE_CONFIG } from './roles.js';

// ---------------------------------------------------------------------------
// Raid
// ---------------------------------------------------------------------------

export function parseRaidRankings(zoneRankingsBlob) {
  const rankings = zoneRankingsBlob?.rankings ?? [];
  return rankings
    .filter(r => typeof r.rankPercent === 'number')
    .map(r => ({
      encounter:   r.encounter?.name ?? 'Unknown',
      rankPercent: r.rankPercent,
    }));
}

export function summarizeRaid(heroicBlob, mythicBlob) {
  const heroic = parseRaidRankings(heroicBlob);
  const mythic  = parseRaidRankings(mythicBlob);
  const all     = [...heroic, ...mythic];

  if (all.length === 0) {
    return { hasLogs: false, avgParse: null, heroicCount: 0, mythicCount: 0, encounters: [] };
  }

  const avgParse = Math.round(all.reduce((s, r) => s + r.rankPercent, 0) / all.length);
  return { hasLogs: true, avgParse, heroicCount: heroic.length, mythicCount: mythic.length, encounters: all };
}

// ---------------------------------------------------------------------------
// Mythic+
// ---------------------------------------------------------------------------

export function summarizeMythicPlus(zoneRankingsBlob) {
  const allRankings = zoneRankingsBlob?.rankings ?? [];
  const throughput  = zoneRankingsBlob?.throughputRankings;
  const avgRaw      = zoneRankingsBlob?.bestPerformanceAverage ?? null;

  // points_and_damage format: throughputRankings is an object keyed by encounter ID,
  // containing damage percentiles filtered to runs at high enough key levels.
  // Only dungeons that appear here are meaningful — others were done too low to count.
  if (throughput) {
    const nameMap = Object.fromEntries(
      allRankings.map(r => [String(r.encounter?.id), r.encounter?.name ?? 'Unknown'])
    );
    const rankedIds = new Set(Object.keys(throughput));

    const runs = Object.entries(throughput)
      .map(([id, data]) => ({
        encounterID: Number(id),
        dungeon:     nameMap[id] ?? 'Unknown',
        percentile:  Math.round(data.best_historical_percentile),
      }))
      .sort((a, b) => b.percentile - a.percentile);

    const missingDungeons = allRankings
      .filter(r => !rankedIds.has(String(r.encounter?.id)))
      .map(r => r.encounter?.name ?? 'Unknown');

    if (runs.length === 0 && avgRaw === null) {
      return { hasLogs: false, avgPercentile: null, runs: [], missingDungeons };
    }

    const avgPercentile = avgRaw !== null
      ? Math.round(avgRaw)
      : Math.round(runs.reduce((s, r) => s + r.percentile, 0) / runs.length);

    return { hasLogs: true, avgPercentile, runs, missingDungeons };
  }

  // Standard format (dps, hps): rankings array with rankPercent per dungeon
  const runs = allRankings
    .filter(r => r.rankPercent !== null && r.rankPercent !== undefined)
    .map(r => ({
      encounterID: r.encounter?.id,
      dungeon:     r.encounter?.name ?? 'Unknown',
      percentile:  Math.round(r.rankPercent),
    }))
    .sort((a, b) => b.percentile - a.percentile);

  const missingDungeons = allRankings
    .filter(r => r.rankPercent === null || r.rankPercent === undefined)
    .map(r => r.encounter?.name ?? 'Unknown');

  if (runs.length === 0 && avgRaw === null) {
    return { hasLogs: false, avgPercentile: null, runs: [], missingDungeons };
  }

  const avgPercentile = avgRaw !== null
    ? Math.round(avgRaw)
    : Math.round(runs.reduce((s, r) => s + r.percentile, 0) / runs.length);

  return { hasLogs: true, avgPercentile, runs, missingDungeons };
}

// ---------------------------------------------------------------------------
// Interrupts
// ---------------------------------------------------------------------------

export function summarizeInterrupts(interruptRuns, characterName) {
  if (!interruptRuns || interruptRuns.length === 0) {
    return { topInterruptor: false, topTankInterruptor: false, rank1or2Count: 0, rank1to3Count: 0, totalRuns: 0 };
  }

  const nameLower = characterName.toLowerCase();
  let rank1or2Count    = 0;
  let rank1to3Count    = 0;
  let runsWithCharacter = 0;

  for (const run of interruptRuns) {
    const players    = run.players ?? [];
    const actorNames = run.actorNames ?? [];
    const idx        = players.findIndex(p => p.name.toLowerCase() === nameLower);

    // Character must have been in the group. Check interrupt list first; fall back
    // to actorNames so players with 0 interrupts still count in the denominator.
    const wasPresent = idx !== -1 || actorNames.includes(nameLower);
    if (!wasPresent) continue;

    runsWithCharacter++;
    if (idx >= 0 && idx <= 1) rank1or2Count++;
    if (idx >= 0 && idx <= 2) rank1to3Count++;
  }

  return {
    topInterruptor:     runsWithCharacter > 0 && rank1or2Count / runsWithCharacter >= 0.8,
    topTankInterruptor: runsWithCharacter > 0 && rank1or2Count / runsWithCharacter >= 0.8,
    rank1or2Count,
    rank1to3Count,
    totalRuns: runsWithCharacter, // denominator = only runs the character actually played
  };
}

// ---------------------------------------------------------------------------
// Final verdict (role-aware)
// ---------------------------------------------------------------------------

const PASS  = 'PASS';
const SCRUB = 'SCRUB';

export function getVerdict(role, raid, mplus, interrupts) {
  const cfg     = ROLE_CONFIG[role] ?? ROLE_CONFIG.dps;
  const reasons = [];
  let verdict   = PASS;

  // --- Raid ---
  if (!raid.hasLogs) {
    verdict = SCRUB;
    reasons.push(`No heroic or mythic raid logs — unverified ${cfg.label.toLowerCase()}`);
  } else if (raid.avgParse < cfg.raidThreshold) {
    verdict = SCRUB;
    reasons.push(`Raid avg too low: ${raid.avgParse}% (need ${cfg.raidThreshold}%+, heroic/mythic combined)`);
  } else {
    reasons.push(
      `Raid OK: ${raid.avgParse}% avg (${raid.mythicCount} mythic + ${raid.heroicCount} heroic)`
    );
  }

  // --- M+ ---
  if (!mplus.hasLogs) {
    verdict = SCRUB;
    reasons.push('No Mythic+ logs found');
  } else {
    const pct = mplus.avgPercentile;
    const metricLabel = { points_and_damage: 'damage', points_and_healing: 'healing', dps: 'damage', hps: 'healing' }[cfg.mplusMetric] ?? cfg.mplusMetric;

    if (role === 'dps') {
      const { topInterruptor, rank1or2Count, totalRuns } = interrupts;

      if (pct >= cfg.mplusThreshold) {
        reasons.push(`M+ ${metricLabel}: ${pct}% avg — strong performer`);
      } else if (pct >= cfg.mplusIntBonus && topInterruptor) {
        reasons.push(
          `M+ ${metricLabel}: ${pct}% avg — borderline, but top-2 interruptor ` +
          `in ${rank1or2Count}/${totalRuns} runs — accepted`
        );
      } else if (pct >= cfg.mplusIntBonus && !topInterruptor) {
        verdict = SCRUB;
        const intNote = totalRuns > 0
          ? ` (top-2 interrupts in only ${rank1or2Count}/${totalRuns} runs)`
          : ' (no interrupt data)';
        reasons.push(`M+ ${metricLabel}: ${pct}% avg — borderline and not a top interruptor${intNote}`);
      } else {
        verdict = SCRUB;
        reasons.push(`M+ ${metricLabel}: ${pct}% avg — too low (need ${cfg.mplusThreshold}%, or ${cfg.mplusIntBonus}%+ with top interrupts)`);
      }

    } else if (role === 'healer') {
      if (pct >= cfg.mplusThreshold) {
        reasons.push(`M+ ${metricLabel}: ${pct}% avg — strong healer`);
      } else {
        verdict = SCRUB;
        reasons.push(`M+ ${metricLabel}: ${pct}% avg — too low (need ${cfg.mplusThreshold}%+)`);
      }

    } else if (role === 'tank') {
      const { topTankInterruptor, rank1or2Count, totalRuns } = interrupts;

      if (pct >= cfg.mplusThreshold) {
        reasons.push(`M+ ${metricLabel}: ${pct}% avg — solid tank`);
      } else {
        verdict = SCRUB;
        reasons.push(`M+ ${metricLabel}: ${pct}% avg — too low (need ${cfg.mplusThreshold}%+)`);
      }

      // Tanks must be top-2 interruptor in 80%+ of runs
      if (totalRuns > 0 && !topTankInterruptor) {
        verdict = SCRUB;
        reasons.push(`Interrupts: top-2 in only ${rank1or2Count}/${totalRuns} runs — tanks need 80%+ of runs`);
      } else if (totalRuns > 0) {
        reasons.push(`Interrupts OK: top-2 in ${rank1or2Count}/${totalRuns} runs`);
      }
    }
  }

  return { verdict, reasons };
}
