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
    mplusThreshold: 75,
    mplusIntBonus:  65,
    raidThreshold:  70,
    interruptBonus: true,
    interruptWarn:  false,
  },
  healer: {
    label:          'Healer',
    mplusMetric:    'points_and_healing',
    raidMetric:     'hps',
    mplusThreshold: 70,
    mplusIntBonus:  70, // no interrupt bonus — healers often lack interrupt abilities
    raidThreshold:  70,
    healerDmgThreshold: 50, // healers must also do decent damage
    interruptBonus: false,
    interruptWarn:  false,
  },
  tank: {
    label:          'Tank',
    mplusMetric:    'points_and_damage',
    raidMetric:     'dps',
    mplusThreshold: 50,
    mplusIntBonus:  50,
    raidThreshold:  50,
    interruptBonus: false,
    interruptWarn:  true,    // tanks are EXPECTED to interrupt; flag if they don't
  },
};

/**
 * Extract the primary spec name from M+ data: the spec with the most key score.
 *
 * The points_* allStars list every spec the character has timed keys on, with
 * its score. The dps metric does not rank healer specs at all, so its allStars
 * only ever shows a healer's tank/DPS offspec. Checking it first graded a Holy
 * Paladin with 3549 points as the Protection offspec they had 3101 on.
 */
export function extractSpecFromRankings(charMplusData) {
  const allStars = charMplusData?.pointsAndDamageRankings?.allStars
                ?? charMplusData?.pointsAndHealingRankings?.allStars
                ?? [];
  const main = allStars.reduce((best, s) => (s.points ?? 0) > (best?.points ?? 0) ? s : best, null);
  return main?.spec
      ?? charMplusData?.dpsRankings?.allStars?.[0]?.spec
      ?? null;
}
