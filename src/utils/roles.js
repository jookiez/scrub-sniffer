/**
 * Role detection and per-role grading configuration.
 *
 * Role is determined from the spec name returned in mythicPlusRankings.
 * All WoW tank and healer specs have unique names that don't overlap with DPS.
 * Anything not listed as tank or healer is treated as DPS.
 */

const TANK_SPECS = new Set([
  'Blood',       // Death Knight
  'Vengeance',   // Demon Hunter
  'Guardian',    // Druid
  'Brewmaster',  // Monk
  'Protection',  // Paladin + Warrior (both are tanks)
]);

const HEALER_SPECS = new Set([
  'Discipline',   // Priest
  'Holy',         // Priest + Paladin (Holy Paladin is a healer)
  'Restoration',  // Druid + Shaman
  'Preservation', // Evoker
  'Mistweaver',   // Monk
]);

/**
 * Given a spec name from the API, return 'dps' | 'healer' | 'tank'.
 * @param {string|null} specName
 */
export function detectRole(specName) {
  if (!specName) return 'dps';
  if (TANK_SPECS.has(specName))   return 'tank';
  if (HEALER_SPECS.has(specName)) return 'healer';
  return 'dps';
}

/**
 * Per-role grading config.
 *
 * mplusMetric    — WarcraftLogs metric to query for M+ rankings
 * raidMetric     — WarcraftLogs metric to query for raid rankings
 * mplusThreshold — minimum avg parse % to pass M+
 * mplusIntBonus  — lower M+ threshold when interrupt bonus applies (DPS only)
 * raidThreshold  — minimum avg parse % to pass raid
 * interruptBonus — whether top-2 interrupts unlocks the lower M+ threshold
 * interruptWarn  — whether poor interrupts should trigger a warning (tanks)
 */
export const ROLE_CONFIG = {
  dps: {
    label:          'DPS',
    mplusMetric:    'points_and_damage',
    raidMetric:     'dps',
    mplusThreshold: 80,
    mplusIntBonus:  70,
    raidThreshold:  70,
    interruptBonus: true,
    interruptWarn:  false,
  },
  healer: {
    label:          'Healer',
    mplusMetric:    'hps',
    raidMetric:     'hps',
    mplusThreshold: 80,
    mplusIntBonus:  80, // no interrupt bonus — healers often lack interrupt abilities
    raidThreshold:  70,
    interruptBonus: false,
    interruptWarn:  false,
  },
  tank: {
    label:          'Tank',
    mplusMetric:    'krsi',  // Kihra's Resolve-Weighted Survivability Index
    raidMetric:     'krsi',
    mplusThreshold: 70,      // lower bar — survivability parses are harder to top
    mplusIntBonus:  70,
    raidThreshold:  70,
    interruptBonus: false,
    interruptWarn:  true,    // tanks are EXPECTED to interrupt; flag if they don't
  },
};

/**
 * Extract the primary spec name from M+ data (which has dpsRankings + hpsRankings).
 * Tries dps first (covers DPS and tank), then hps (healers).
 */
export function extractSpecFromRankings(charMplusData) {
  return charMplusData?.dpsRankings?.allStars?.[0]?.spec
      ?? charMplusData?.hpsRankings?.allStars?.[0]?.spec
      ?? charMplusData?.pointsAndDamageRankings?.allStars?.[0]?.spec
      ?? null;
}
