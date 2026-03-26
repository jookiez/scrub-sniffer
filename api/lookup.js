import { getCharacterMythicPlusData, getCharacterRaidData, getRecentKeyInterrupts } from '../src/api/warcraftlogs-v2.js';
import { summarizeRaid, summarizeMythicPlus, summarizeInterrupts, getVerdict } from '../src/utils/grader.js';
import { detectRole, extractSpecFromRankings, ROLE_CONFIG } from '../src/utils/roles.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { name, server, region = 'us' } = req.query;

  if (!name || !server) {
    return res.status(400).json({ error: 'Missing required params: name, server' });
  }

  try {
    // Step 1: detect role from initial M+ query
    const charProfile = await getCharacterMythicPlusData(name, server, region, null);
    if (!charProfile) {
      return res.status(404).json({ error: `Character not found: ${name}-${server}` });
    }

    const specName = extractSpecFromRankings(charProfile.mythicPlusRankings);
    const role     = detectRole(specName);
    const cfg      = ROLE_CONFIG[role];

    // Step 2: fetch everything in parallel with correct metric
    const [charMplus, charRaid, interruptRuns] = await Promise.all([
      getCharacterMythicPlusData(name, server, region, cfg.mplusMetric),
      getCharacterRaidData(name, server, region, cfg.raidMetric),
      getRecentKeyInterrupts(name, server, region),
    ]);

    const raid       = summarizeRaid(charRaid?.heroic, charRaid?.mythic);
    const mplus      = summarizeMythicPlus(charMplus?.mythicPlusRankings);
    const interrupts = summarizeInterrupts(interruptRuns, name);
    const { verdict, reasons } = getVerdict(role, raid, mplus, interrupts);

    res.status(200).json({
      character: { name, server, region, specName, role, roleLabel: cfg.label },
      verdict,
      reasons,
      mplus,
      raid,
      interrupts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
