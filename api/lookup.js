import { getCharacterMythicPlusData, getCharacterRaidData, getInterruptsFromBestRuns } from '../src/api/warcraftlogs-v2.js';
import { summarizeRaid, summarizeMythicPlus, summarizeInterrupts, getVerdict } from '../src/utils/grader.js';
import { detectRole, extractSpecFromRankings, ROLE_CONFIG } from '../src/utils/roles.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { name, server, region = 'us' } = req.query;

  if (!name || !server) {
    return res.status(400).json({ error: 'Missing required params: name, server' });
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

    const mplusRankings = role === 'healer' ? charMplus.hpsRankings
                        : role === 'tank'   ? charMplus.dpsRankings
                        :                    charMplus.pointsAndDamageRankings;
    const mplus         = summarizeMythicPlus(mplusRankings);
    const encounters = mplus.runs.map(r => ({ id: r.encounterID, name: r.dungeon }));

    // Step 2: fetch raid + interrupts in parallel with role-correct metric
    const [charRaid, interruptRuns] = await Promise.all([
      getCharacterRaidData(name, server, region, cfg.raidMetric),
      getInterruptsFromBestRuns(name, server, region, encounters),
    ]);

    const raid = summarizeRaid(charRaid?.heroic, charRaid?.mythic);
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
