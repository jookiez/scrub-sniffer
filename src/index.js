/**
 * Scrub Sniffer — WoW M+ player lookup CLI
 * Usage: node --env-file=.env src/index.js <characterName> <server> [region]
 * Example: node --env-file=.env src/index.js Arthas area-52 us
 */

import { getCharacterMythicPlusData, getCharacterRaidData, getInterruptsFromBestRuns } from './api/warcraftlogs-v2.js';
import { summarizeRaid, summarizeMythicPlus, summarizeInterrupts, getVerdict } from './utils/grader.js';
import { detectRole, extractSpecFromRankings, ROLE_CONFIG } from './utils/roles.js';

const [,, characterName, server, region = 'us'] = process.argv;

if (!characterName || !server) {
  console.error('Usage: node src/index.js <characterName> <server> [region]');
  console.error('Example: node src/index.js Arthas area-52 us');
  process.exit(1);
}

const DIVIDER = '='.repeat(56);

async function sniff(name, serverSlug, reg) {
  console.log(`\n👃 Scrub Sniffer — checking ${name}-${serverSlug} (${reg.toUpperCase()})\n`);

  // Step 1: M+ query — also used to detect role/spec from allStars
  const charMplus = await getCharacterMythicPlusData(name, serverSlug, reg);
  if (!charMplus) {
    console.error(`Character not found: ${name}-${serverSlug}`);
    process.exit(1);
  }

  const specName = extractSpecFromRankings(charMplus);
  const role     = detectRole(specName);
  const cfg      = ROLE_CONFIG[role];

  console.log(`  Detected role: ${cfg.label}${specName ? ` (${specName})` : ''}\n`);

  const mplusRankings = role === 'healer' ? charMplus.hpsRankings : charMplus.dpsRankings;
  const mplus         = summarizeMythicPlus(mplusRankings);
  const encounters = mplus.runs.map(r => ({ id: r.encounterID, name: r.dungeon }));

  // Step 2: fetch raid + interrupts in parallel using role-correct metric
  const [charRaid, interruptRuns] = await Promise.all([
    getCharacterRaidData(name, serverSlug, reg, cfg.raidMetric),
    getInterruptsFromBestRuns(name, serverSlug, reg, encounters),
  ]);

  const raid = summarizeRaid(charRaid?.heroic, charRaid?.mythic);
  const interrupts = summarizeInterrupts(interruptRuns, name);

  const { verdict, reasons } = getVerdict(role, raid, mplus, interrupts);

  const metricLabel = 'Score'; // M+ always uses playerscore (key level × time), not role-specific metrics

  // --- Output ---
  console.log(DIVIDER);
  console.log(`  ${name}-${serverSlug} (${reg.toUpperCase()})  —  ${cfg.label}${specName ? ` / ${specName}` : ''}`);
  console.log(DIVIDER);

  // M+ breakdown
  console.log(`\n  [ Mythic+ ${metricLabel} ]`);
  if (mplus.hasLogs) {
    console.log(`  Avg Parse    : ${mplus.avgPercentile}%`);
    console.log(`  Runs Sampled : ${mplus.runs.length} (highest keys)`);
    console.log('\n  Top Keys:');
    for (const run of mplus.runs.slice(0, 5)) {
      const bar = '█'.repeat(Math.round(run.percentile / 5)).padEnd(20);
      console.log(`    ${run.dungeon.padEnd(32)} ${String(run.percentile).padStart(3)}%  ${bar}`);
    }
  } else {
    console.log('  No M+ logs found.');
  }

  // Interrupt breakdown
  console.log('\n  [ Interrupts ]');
  if (interrupts.totalRuns > 0) {
    if (role === 'dps') {
      console.log(`  Top-2 in ${interrupts.rank1or2Count}/${interrupts.totalRuns} runs — ${interrupts.topInterruptor ? 'interrupt bonus applies' : 'no interrupt bonus'}`);
    } else if (role === 'tank') {
      console.log(`  Top-3 in ${interrupts.rank1to3Count}/${interrupts.totalRuns} runs — ${interrupts.topTankInterruptor ? 'interrupts good' : 'interrupts lacking'}`);
    } else {
      console.log(`  Top-2 in ${interrupts.rank1or2Count}/${interrupts.totalRuns} runs`);
    }
  } else {
    console.log('  No interrupt data available.');
  }

  // Raid breakdown
  console.log('\n  [ Raid ]');
  if (raid.hasLogs) {
    console.log(`  Avg Parse    : ${raid.avgParse}%`);
    console.log(`  Encounters   : ${raid.mythicCount} mythic, ${raid.heroicCount} heroic`);
  } else {
    console.log('  No heroic/mythic raid logs found.');
  }

  // Verdict
  const icon = verdict === 'PASS' ? '✅' : '❌';
  console.log(`\n${DIVIDER}`);
  console.log(`  ${icon}  ${verdict}`);
  console.log(DIVIDER);
  for (const r of reasons) {
    console.log(`  • ${r}`);
  }
  console.log('');
}

sniff(characterName, server, region).catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
