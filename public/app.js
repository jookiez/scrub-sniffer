// ---------------------------------------------------------------------------
// Server combobox
// ---------------------------------------------------------------------------
const SERVERS = {
  us: [
    {n:'Aegwynn',s:'aegwynn'},{n:'Aerie Peak',s:'aerie-peak'},{n:'Agamaggan',s:'agamaggan'},
    {n:'Aggramar',s:'aggramar'},{n:'Alexstrasza',s:'alexstrasza'},{n:'Alleria',s:'alleria'},
    {n:'Altar of Storms',s:'altar-of-storms'},{n:'Alterac Mountains',s:'alterac-mountains'},
    {n:'Andorhal',s:'andorhal'},{n:'Anetheron',s:'anetheron'},{n:'Antonidas',s:'antonidas'},
    {n:"Anub'arak",s:'anubarak'},{n:'Anvilmar',s:'anvilmar'},{n:'Arathor',s:'arathor'},
    {n:'Archimonde',s:'archimonde'},{n:'Area 52',s:'area-52'},{n:'Argent Dawn',s:'argent-dawn'},
    {n:'Arthas',s:'arthas'},{n:'Arygos',s:'arygos'},{n:'Azgalor',s:'azgalor'},
    {n:'Azjol-Nerub',s:'azjol-nerub'},{n:'Azralon',s:'azralon'},{n:'Azshara',s:'azshara'},
    {n:'Azuremyst',s:'azuremyst'},{n:'Baelgun',s:'baelgun'},{n:'Balnazzar',s:'balnazzar'},
    {n:'Barthilas',s:'barthilas'},{n:'Black Dragonflight',s:'black-dragonflight'},
    {n:'Blackhand',s:'blackhand'},{n:'Blackrock',s:'blackrock'},
    {n:'Blackwater Raiders',s:'blackwater-raiders'},{n:'Blackwing Lair',s:'blackwing-lair'},
    {n:"Blade's Edge",s:'blades-edge'},{n:'Bladefist',s:'bladefist'},
    {n:'Bleeding Hollow',s:'bleeding-hollow'},{n:'Blood Furnace',s:'blood-furnace'},
    {n:'Bloodhoof',s:'bloodhoof'},{n:'Bloodscalp',s:'bloodscalp'},
    {n:'Bonechewer',s:'bonechewer'},{n:'Borean Tundra',s:'borean-tundra'},
    {n:'Boulderfist',s:'boulderfist'},{n:'Bronze Dragonflight',s:'bronze-dragonflight'},
    {n:'Bronzebeard',s:'bronzebeard'},{n:'Burning Blade',s:'burning-blade'},
    {n:'Burning Legion',s:'burning-legion'},{n:'Caelestrasz',s:'caelestrasz'},
    {n:'Cairne',s:'cairne'},{n:'Cenarion Circle',s:'cenarion-circle'},
    {n:'Cenarion Expedition',s:'cenarion-expedition'},{n:"Cho'gall",s:'chogall'},
    {n:'Chromaggus',s:'chromaggus'},{n:'Coilfang',s:'coilfang'},
    {n:'Crushridge',s:'crushridge'},{n:'Daggerspine',s:'daggerspine'},
    {n:'Dalaran',s:'dalaran'},{n:'Dalvengyr',s:'dalvengyr'},{n:'Dark Iron',s:'dark-iron'},
    {n:'Darkspear',s:'darkspear'},{n:'Darrowmere',s:'darrowmere'},
    {n:"Dath'Remar",s:'dathremar'},{n:'Dawnbringer',s:'dawnbringer'},
    {n:'Deathwing',s:'deathwing'},{n:'Demon Soul',s:'demon-soul'},{n:'Dentarg',s:'dentarg'},
    {n:'Destromath',s:'destromath'},{n:'Dethecus',s:'dethecus'},{n:'Detheroc',s:'detheroc'},
    {n:'Doomhammer',s:'doomhammer'},{n:'Dragonblight',s:'dragonblight'},
    {n:'Dragonmaw',s:'dragonmaw'},{n:"Drak'Tharon",s:'draktharon'},
    {n:"Drak'thul",s:'drakthul'},{n:'Draka',s:'draka'},{n:'Drakkari',s:'drakkari'},
    {n:'Dreadmaul',s:'dreadmaul'},{n:'Drenden',s:'drenden'},{n:'Dunemaul',s:'dunemaul'},
    {n:'Durotan',s:'durotan'},{n:'Duskwood',s:'duskwood'},{n:'Earthen Ring',s:'earthen-ring'},
    {n:'Eitrigg',s:'eitrigg'},{n:"Eldre'Thalas",s:'eldrethalas'},{n:'Elune',s:'elune'},
    {n:'Emerald Dream',s:'emerald-dream'},{n:'Eonar',s:'eonar'},{n:'Eredar',s:'eredar'},
    {n:'Executus',s:'executus'},{n:'Exodar',s:'exodar'},{n:'Farstriders',s:'farstriders'},
    {n:'Feathermoon',s:'feathermoon'},{n:'Fenris',s:'fenris'},{n:'Firetree',s:'firetree'},
    {n:'Fizzcrank',s:'fizzcrank'},{n:'Frostmane',s:'frostmane'},{n:'Frostmourne',s:'frostmourne'},
    {n:'Frostwolf',s:'frostwolf'},{n:'Galakrond',s:'galakrond'},{n:'Gallywix',s:'gallywix'},
    {n:'Garona',s:'garona'},{n:'Garrosh',s:'garrosh'},{n:'Ghostlands',s:'ghostlands'},
    {n:'Gilneas',s:'gilneas'},{n:'Gnomeregan',s:'gnomeregan'},{n:'Goldrinn',s:'goldrinn'},
    {n:'Greymane',s:'greymane'},{n:"Gul'dan",s:'guldan'},{n:'Gundrak',s:'gundrak'},
    {n:'Gurubashi',s:'gurubashi'},{n:'Hakkar',s:'hakkar'},{n:'Haomarush',s:'haomarush'},
    {n:'Hellscream',s:'hellscream'},{n:'Hydraxis',s:'hydraxis'},{n:'Hyjal',s:'hyjal'},
    {n:'Icecrown',s:'icecrown'},{n:'Illidan',s:'illidan'},{n:'Jaedenar',s:'jaedenar'},
    {n:"Jubei'Thos",s:'jubeithos'},{n:"Kael'thas",s:'kaelthas'},{n:'Kalecgos',s:'kalecgos'},
    {n:'Kargath',s:'kargath'},{n:"Kel'Thuzad",s:'kelthuzad'},{n:'Khadgar',s:'khadgar'},
    {n:'Khaz Modan',s:'khaz-modan'},{n:"Khaz'goroth",s:'khazgoroth'},
    {n:"Kil'jaeden",s:'kiljaeden'},{n:'Kilrogg',s:'kilrogg'},{n:'Kirin Tor',s:'kirin-tor'},
    {n:'Korgath',s:'korgath'},{n:'Korialstrasz',s:'korialstrasz'},{n:'Kul Tiras',s:'kul-tiras'},
    {n:'Laughing Skull',s:'laughing-skull'},{n:'Lethon',s:'lethon'},
    {n:'Lightbringer',s:'lightbringer'},{n:"Lightning's Blade",s:'lightnings-blade'},
    {n:'Lightninghoof',s:'lightninghoof'},{n:'Llane',s:'llane'},{n:'Lothar',s:'lothar'},
    {n:'Madoran',s:'madoran'},{n:'Maelstrom',s:'maelstrom'},{n:'Magtheridon',s:'magtheridon'},
    {n:'Maiev',s:'maiev'},{n:"Mal'Ganis",s:'malganis'},{n:'Malfurion',s:'malfurion'},
    {n:'Malorne',s:'malorne'},{n:'Malygos',s:'malygos'},{n:'Mannoroth',s:'mannoroth'},
    {n:'Medivh',s:'medivh'},{n:'Misha',s:'misha'},{n:"Mok'Nathal",s:'moknathal'},
    {n:'Moon Guard',s:'moon-guard'},{n:'Moonrunner',s:'moonrunner'},
    {n:"Mug'thol",s:'mugthol'},{n:'Muradin',s:'muradin'},{n:'Nagrand',s:'nagrand'},
    {n:'Nathrezim',s:'nathrezim'},{n:'Nazgrel',s:'nazgrel'},{n:'Nazjatar',s:'nazjatar'},
    {n:'Nemesis',s:'nemesis'},{n:'Nesingwary',s:'nesingwary'},{n:'Nordrassil',s:'nordrassil'},
    {n:'Norgannon',s:'norgannon'},{n:'Onyxia',s:'onyxia'},{n:'Perenolde',s:'perenolde'},
    {n:'Proudmoore',s:'proudmoore'},{n:"Quel'Dorei",s:'queldorei'},
    {n:"Quel'Thalas",s:'quelthalas'},{n:'Ragnaros',s:'ragnaros'},
    {n:'Ravencrest',s:'ravencrest'},{n:'Ravenholdt',s:'ravenholdt'},{n:'Rexxar',s:'rexxar'},
    {n:'Rivendare',s:'rivendare'},{n:'Runetotem',s:'runetotem'},{n:'Sargeras',s:'sargeras'},
    {n:'Saurfang',s:'saurfang'},{n:'Scarlet Crusade',s:'scarlet-crusade'},
    {n:'Sentinels',s:'sentinels'},{n:'Shadow Council',s:'shadow-council'},
    {n:'Shadowmoon',s:'shadowmoon'},{n:'Shadowsong',s:'shadowsong'},
    {n:'Shandris',s:'shandris'},{n:'Shattered Halls',s:'shattered-halls'},
    {n:'Shattered Hand',s:'shattered-hand'},{n:"Shu'halo",s:'shuhalo'},
    {n:'Silver Hand',s:'silver-hand'},{n:'Silvermoon',s:'silvermoon'},
    {n:'Sisters of Elune',s:'sisters-of-elune'},{n:'Skullcrusher',s:'skullcrusher'},
    {n:'Skywall',s:'skywall'},{n:'Smolderthorn',s:'smolderthorn'},
    {n:'Spinebreaker',s:'spinebreaker'},{n:'Spirestone',s:'spirestone'},
    {n:'Staghelm',s:'staghelm'},{n:'Steamwheedle Cartel',s:'steamwheedle-cartel'},
    {n:'Stonemaul',s:'stonemaul'},{n:'Stormrage',s:'stormrage'},
    {n:'Stormreaver',s:'stormreaver'},{n:'Stormscale',s:'stormscale'},
    {n:'Suramar',s:'suramar'},{n:'Tanaris',s:'tanaris'},{n:'Terenas',s:'terenas'},
    {n:'Terokkar',s:'terokkar'},{n:'The Forgotten Coast',s:'the-forgotten-coast'},
    {n:'The Scryers',s:'the-scryers'},{n:'The Underbog',s:'the-underbog'},
    {n:'The Venture Co',s:'the-venture-co'},{n:'Thorium Brotherhood',s:'thorium-brotherhood'},
    {n:'Thrall',s:'thrall'},{n:'Thunderhorn',s:'thunderhorn'},{n:'Thunderlord',s:'thunderlord'},
    {n:'Tichondrius',s:'tichondrius'},{n:'Tortheldrin',s:'tortheldrin'},
    {n:'Trollbane',s:'trollbane'},{n:'Turalyon',s:'turalyon'},
    {n:'Twisting Nether',s:'twisting-nether'},{n:'Uther',s:'uther'},{n:'Vashj',s:'vashj'},
    {n:'Velen',s:'velen'},{n:'Whisperwind',s:'whisperwind'},{n:'Wildhammer',s:'wildhammer'},
    {n:'Windrunner',s:'windrunner'},{n:'Winterhoof',s:'winterhoof'},
    {n:'Wyrmrest Accord',s:'wyrmrest-accord'},{n:'Ysera',s:'ysera'},{n:'Ysondre',s:'ysondre'},
    {n:'Zangarmarsh',s:'zangarmarsh'},{n:"Zul'jin",s:'zuljin'},{n:'Zuluhed',s:'zuluhed'},
  ],
  eu: [
    {n:'Aegwynn',s:'aegwynn'},{n:'Aerie Peak',s:'aerie-peak'},{n:'Agamaggan',s:'agamaggan'},
    {n:'Aggramar',s:'aggramar'},{n:"Al'Akir",s:'alakir'},{n:'Alexstrasza',s:'alexstrasza'},
    {n:'Alleria',s:'alleria'},{n:'Alonsus',s:'alonsus'},{n:"Aman'Thul",s:'amanthul'},
    {n:'Anachronos',s:'anachronos'},{n:'Anetheron',s:'anetheron'},{n:'Antonidas',s:'antonidas'},
    {n:"Anub'arak",s:'anubarak'},{n:'Anvilmar',s:'anvilmar'},{n:'Arathor',s:'arathor'},
    {n:'Archimonde',s:'archimonde'},{n:'Argent Dawn',s:'argent-dawn'},{n:'Arthas',s:'arthas'},
    {n:'Arygos',s:'arygos'},{n:'Azjol-Nerub',s:'azjol-nerub'},{n:'Azshara',s:'azshara'},
    {n:'Azuremyst',s:'azuremyst'},{n:'Baelgun',s:'baelgun'},{n:'Balnazzar',s:'balnazzar'},
    {n:'Blackhand',s:'blackhand'},{n:'Blackmoore',s:'blackmoore'},{n:'Blackrock',s:'blackrock'},
    {n:"Blade's Edge",s:'blades-edge'},{n:'Bladefist',s:'bladefist'},
    {n:'Blood Furnace',s:'blood-furnace'},{n:'Bloodfeather',s:'bloodfeather'},
    {n:'Boulderfist',s:'boulderfist'},{n:'Bronze Dragonflight',s:'bronze-dragonflight'},
    {n:'Bronzebeard',s:'bronzebeard'},{n:'Burning Blade',s:'burning-blade'},
    {n:'Burning Legion',s:'burning-legion'},{n:'Caelestrasz',s:'caelestrasz'},
    {n:'Celebras',s:'celebras'},{n:'Chamber of Aspects',s:'chamber-of-aspects'},
    {n:"Cho'gall",s:'chogall'},{n:'Chromaggus',s:'chromaggus'},
    {n:'Confrérie du Thorium',s:'confrerie-du-thorium'},{n:'Crushridge',s:'crushridge'},
    {n:'Daggerspine',s:'daggerspine'},{n:'Dalaran',s:'dalaran'},{n:'Dalvengyr',s:'dalvengyr'},
    {n:'Dark Iron',s:'dark-iron'},{n:'Darkmoon Faire',s:'darkmoon-faire'},
    {n:'Darksorrow',s:'darksorrow'},{n:'Darkspear',s:'darkspear'},
    {n:'Deathwing',s:'deathwing'},{n:'Defias Brotherhood',s:'defias-brotherhood'},
    {n:'Dentarg',s:'dentarg'},{n:'Der abyssische Rat',s:'der-abyssische-rat'},
    {n:'Destromath',s:'destromath'},{n:'Die ewige Wacht',s:'die-ewige-wacht'},
    {n:'Die Silberne Hand',s:'die-silberne-hand'},{n:'Doomhammer',s:'doomhammer'},
    {n:'Draenor',s:'draenor'},{n:'Dragonblight',s:'dragonblight'},{n:'Dragonmaw',s:'dragonmaw'},
    {n:"Drak'thul",s:'drakthul'},{n:'Dun Morogh',s:'dun-morogh'},{n:'Dunemaul',s:'dunemaul'},
    {n:'Durotan',s:'durotan'},{n:'Earthen Ring',s:'earthen-ring'},
    {n:'Emerald Dream',s:'emerald-dream'},{n:'Eonar',s:'eonar'},{n:'Eredar',s:'eredar'},
    {n:'Executus',s:'executus'},{n:'Exodar',s:'exodar'},
    {n:'Festung der Stürme',s:'festung-der-sturme'},{n:'Forscherliga',s:'forscherliga'},
    {n:'Frostmane',s:'frostmane'},{n:'Frostwolf',s:'frostwolf'},
    {n:'Galakrond',s:'galakrond'},{n:'Garrosh',s:'garrosh'},{n:'Genjuros',s:'genjuros'},
    {n:'Ghostlands',s:'ghostlands'},{n:'Gilneas',s:'gilneas'},{n:'Goldrinn',s:'goldrinn'},
    {n:'Gordunni',s:'gordunni'},{n:'Grim Batol',s:'grim-batol'},{n:"Gul'dan",s:'guldan'},
    {n:'Gurubashi',s:'gurubashi'},{n:'Hakkar',s:'hakkar'},{n:'Hellfire',s:'hellfire'},
    {n:'Hellscream',s:'hellscream'},{n:'Hyjal',s:'hyjal'},{n:'Icecrown',s:'icecrown'},
    {n:'Jaedenar',s:'jaedenar'},{n:"Kael'thas",s:'kaelthas'},{n:"Kel'Thuzad",s:'kelthuzad'},
    {n:'Khadgar',s:'khadgar'},{n:"Kil'jaeden",s:'kiljaeden'},{n:'Kilrogg',s:'kilrogg'},
    {n:'Kirin Tor',s:'kirin-tor'},{n:'Korgath',s:'korgath'},{n:'Krasus',s:'krasus'},
    {n:'Kul Tiras',s:'kul-tiras'},{n:'La Croisade écarlate',s:'la-croisade-ecarlate'},
    {n:'Laughing Skull',s:'laughing-skull'},{n:'Les Clairvoyants',s:'les-clairvoyants'},
    {n:'Les Sentinelles',s:'les-sentinelles'},{n:'Lightbringer',s:'lightbringer'},
    {n:"Lightning's Blade",s:'lightnings-blade'},{n:'Lordaeron',s:'lordaeron'},
    {n:'Los Errantes',s:'los-errantes'},{n:'Magtheridon',s:'magtheridon'},
    {n:'Maiev',s:'maiev'},{n:"Mal'Ganis",s:'malganis'},{n:'Malfurion',s:'malfurion'},
    {n:'Malorne',s:'malorne'},{n:'Malygos',s:'malygos'},{n:'Mannoroth',s:'mannoroth'},
    {n:'Marécage de Zangar',s:'marecage-de-zangar'},{n:'Medivh',s:'medivh'},
    {n:'Minahonda',s:'minahonda'},{n:"Mug'thol",s:'mugthol'},{n:'Muradin',s:'muradin'},
    {n:'Nathrezim',s:'nathrezim'},{n:'Nefarian',s:'nefarian'},{n:'Nemesis',s:'nemesis'},
    {n:'Nethersturm',s:'nethersturm'},{n:'Nordrassil',s:'nordrassil'},{n:'Norgannon',s:'norgannon'},
    {n:'Outland',s:'outland'},{n:'Perenolde',s:'perenolde'},{n:'Proudmoore',s:'proudmoore'},
    {n:'Ragnaros',s:'ragnaros'},{n:'Ravencrest',s:'ravencrest'},{n:'Ravenholdt',s:'ravenholdt'},
    {n:'Razuvious',s:'razuvious'},{n:'Rexxar',s:'rexxar'},{n:'Runetotem',s:'runetotem'},
    {n:'Sanguino',s:'sanguino'},{n:'Sargeras',s:'sargeras'},{n:'Saurfang',s:'saurfang'},
    {n:'Shadowmoon',s:'shadowmoon'},{n:'Shadowsong',s:'shadowsong'},
    {n:'Shattered Hand',s:'shattered-hand'},{n:'Silvermoon',s:'silvermoon'},
    {n:'Skullcrusher',s:'skullcrusher'},{n:'Skywall',s:'skywall'},
    {n:'Spinebreaker',s:'spinebreaker'},{n:'Stormrage',s:'stormrage'},
    {n:'Stormreaver',s:'stormreaver'},{n:'Stormscale',s:'stormscale'},
    {n:'Sunstrider',s:'sunstrider'},{n:'Sylvanas',s:'sylvanas'},{n:'Talnivarr',s:'talnivarr'},
    {n:'Tarren Mill',s:'tarren-mill'},{n:'Terenas',s:'terenas'},
    {n:'The Maelstrom',s:'the-maelstrom'},{n:"The Sha'tar",s:'the-shatar'},
    {n:'The Venture Co',s:'the-venture-co'},{n:'Theradras',s:'theradras'},
    {n:'Thrall',s:'thrall'},{n:'Thunderhorn',s:'thunderhorn'},{n:'Tichondrius',s:'tichondrius'},
    {n:'Tirion',s:'tirion'},{n:'Tortheldrin',s:'tortheldrin'},{n:'Trollbane',s:'trollbane'},
    {n:'Turalyon',s:'turalyon'},{n:'Twisting Nether',s:'twisting-nether'},
    {n:'Tyrande',s:'tyrande'},{n:'Uldaman',s:'uldaman'},{n:'Vashj',s:'vashj'},
    {n:"Vol'jin",s:'voljin'},{n:'Wildhammer',s:'wildhammer'},{n:'Wrathbringer',s:'wrathbringer'},
    {n:'Ysera',s:'ysera'},{n:'Ysondre',s:'ysondre'},{n:'Zenedar',s:'zenedar'},
    {n:"Zul'jin",s:'zuljin'},
  ],
  kr: [
    {n:'아즈샤라 (Azshara)',s:'azshara'},{n:'굴단 (Guldan)',s:'guldan'},
    {n:'하이잘 (Hyjal)',s:'hyjal'},{n:"줄진 (Zul'jin)",s:'zuljin'},
    {n:'말퓨리온 (Malfurion)',s:'malfurion'},{n:'헬스크림 (Hellscream)',s:'hellscream'},
    {n:'윈드러너 (Windrunner)',s:'windrunner'},{n:'렉사르 (Rexxar)',s:'rexxar'},
    {n:'세나리우스 (Cenarius)',s:'cenarius'},{n:'노르가논 (Norgannon)',s:'norgannon'},
  ],
  tw: [
    {n:'世界之樹 (World Tree)',s:'world-tree'},{n:'尖石 (Chiseled Rock)',s:'chiseled-rock'},
    {n:'冰霜之刺 (Frostmane)',s:'frostmane'},{n:'巨龍之喉 (Dragonmaw)',s:'dragonmaw'},
    {n:'亞雷戈斯 (Arygos)',s:'arygos'},{n:'血之谷 (Bleeding Hollow)',s:'bleeding-hollow'},
    {n:'水曜日 (Hydraxis)',s:'hydraxis'},{n:'雲蛟衛 (Spirestone)',s:'spirestone'},
  ],
};

// ---------------------------------------------------------------------------
// Server combobox factory
// ---------------------------------------------------------------------------
function initServerCombo(inputId, dropdownId, regionSelect) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let activeIdx = -1;

  function filter(query) {
    const list = SERVERS[regionSelect.value] ?? [];
    if (!query) return list.slice(0, 25);
    const q = query.toLowerCase();
    return list.filter(s => s.n.toLowerCase().includes(q) || s.s.includes(q)).slice(0, 25);
  }

  function render(items) {
    dropdown.innerHTML = '';
    activeIdx = -1;
    if (!items.length) { dropdown.classList.remove('open'); return; }
    items.forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${s.n}</span>`;
      li.dataset.slug = s.s;
      li.addEventListener('mousedown', e => { e.preventDefault(); select(s); });
      dropdown.appendChild(li);
    });
    dropdown.classList.add('open');
  }

  function select(s) {
    input.value = s.s;
    dropdown.classList.remove('open');
  }

  input.addEventListener('input',  () => render(filter(input.value)));
  input.addEventListener('focus',  () => render(filter(input.value)));
  input.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('li');
    if (!dropdown.classList.contains('open') || !items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((li, i) => li.classList.toggle('sd-active', i === activeIdx));
      items[activeIdx]?.scrollIntoView({block:'nearest'});
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, -1);
      items.forEach((li, i) => li.classList.toggle('sd-active', i === activeIdx));
      items[activeIdx]?.scrollIntoView({block:'nearest'});
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select({s: items[activeIdx].dataset.slug, n: items[activeIdx].querySelector('span').textContent});
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('open');
    }
  });

  regionSelect.addEventListener('change', () => {
    input.value = '';
    dropdown.classList.remove('open');
  });
}

const form  = document.getElementById('lookup-form');
const form2 = document.getElementById('lookup-form-2');
initServerCombo('server-input', 'server-dropdown', form.querySelector('select[name="region"]'));
initServerCombo('server-input-2', 'server-dropdown-2', form2.querySelector('select[name="region"]'));

// ---------------------------------------------------------------------------
// Compare mode toggle
// ---------------------------------------------------------------------------
const formsWrap  = document.getElementById('forms-wrap');
const modeSingle = document.getElementById('mode-single');
const modeCompare = document.getElementById('mode-compare');
let compareMode = false;

function setCompareMode(on) {
  compareMode = on;
  modeSingle.classList.toggle('active', !on);
  modeCompare.classList.toggle('active', on);
  formsWrap.classList.toggle('compare-active', on);
  form2.style.display = on ? '' : 'none';
  resultEl.innerHTML = '';
  resultEl.classList.toggle('compare-result', on);
}

modeSingle.addEventListener('click', () => setCompareMode(false));
modeCompare.addEventListener('click', () => setCompareMode(true));

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
const resultEl  = document.getElementById('result');
const spinner   = document.getElementById('spinner');
const submitBtn = document.getElementById('submit-btn');

function parseColor(pct) {
  if (pct >= 95) return '#ff8000';
  if (pct >= 75) return '#a335ee';
  if (pct >= 50) return '#0070dd';
  if (pct >= 25) return '#1eff00';
  return '#9d9d9d';
}

function reasonClass(text) {
  if (text.startsWith('\u26a0')) return 'warn';
  if (/too low|no |not |borderline and not|struggles|only \d+\/\d+/i.test(text)) return 'fail';
  return 'ok';
}

function buildRunsHtml(runs, reportLinks = {}) {
  return (runs ?? []).map(run => {
    const url = reportLinks[run.dungeon];
    const nameHtml = url
      ? `<a href="${url}" target="_blank" rel="noopener" class="dungeon-link">${run.dungeon}</a>`
      : run.dungeon;
    const keyHtml = run.keyLevel ? `<span class="key-level">+${run.keyLevel}</span>` : '<span></span>';
    return `
      <div class="parse-row">
        <span class="dungeon-name">${nameHtml}</span>
        ${keyHtml}
        <span class="parse-pct" style="color:${parseColor(run.percentile)}">${run.percentile}%</span>
        <div class="bar-bg"><div class="bar-fill" style="width:${run.percentile}%;background:${parseColor(run.percentile)}"></div></div>
      </div>
    `;
  }).join('');
}

async function fetchLookup(name, server, region) {
  const params = new URLSearchParams({ name, server, region });
  const res  = await fetch(`/api/lookup?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Unknown error');
  return data;
}

function renderResultHtml(data) {
  const { character, reasons, mplus, healerDmg, raid, interrupts, topDps, reportLinks = {}, season = {} } = data;
  const { role } = character;

  // Which season/tier the numbers come from — resolved server-side, so it stays
  // right across a season rollover without a frontend change.
  const seasonTag = label => label
    ? ` <span style="color:#8b949e;font-weight:400;font-size:.78rem">${label}</span>`
    : '';

  const isLoser = character.name.toLowerCase() === 'skawalker' &&
                  character.server.toLowerCase() === 'alleria';
  // Blashster-alleria always passes, and passes in style.
  const isBlashster = character.name.toLowerCase() === 'blashster' &&
                      character.server.toLowerCase() === 'alleria';
  const verdict  = isLoser ? 'SCRUB' : isBlashster ? 'PASS' : data.verdict;
  const isPass   = !isLoser && verdict === 'PASS';
  const badgeText = isLoser ? 'ABSOLUTE LOSER' : isBlashster ? "BLASHTIN'" : verdict;
  const metricLabel = 'Score';

  const runsHtml = buildRunsHtml(mplus.runs ?? [], reportLinks);

  const reasonsHtml = reasons.map(r => `
    <li class="${reasonClass(r)}">${r}</li>
  `).join('');

  const intLabel = 'Interrupts (top-2)';
  const intCount = interrupts.rank1or2Count;
  const intVal   = interrupts.totalRuns > 0 ? `${intCount}/${interrupts.totalRuns} runs` : 'No data';
  const intLine  = `<div class="stat-row"><span>${intLabel}</span><span class="stat-val">${intVal}</span></div>`;

  const topDpsLine = (role === 'dps' && topDps)
    ? (() => {
        const val = topDps.totalRuns > 0 ? `${topDps.rank1Count}/${topDps.totalRuns} runs` : 'No data';
        const color = topDps.topDps ? '#3fb950' : '#8b949e';
        return `<div class="stat-row"><span>Top DPS in key</span><span class="stat-val" style="color:${color}">${val}</span></div>`;
      })()
    : '';

  return `
    <div class="card ${isPass ? 'verdict-pass' : 'verdict-scrub'}">
      <div class="verdict-header">
        <span class="verdict-badge ${isPass ? 'badge-pass' : 'badge-scrub'}">${badgeText}</span>
        <span class="char-name">${character.name}-${character.server}</span>
        <span class="role-tag">${character.roleLabel}${character.specName ? ' \u00b7 ' + character.specName : ''}</span>
      </div>
      <ul class="reasons">${reasonsHtml}</ul>
    </div>

    <div class="card">
      <div class="section-title">Mythic+ ${metricLabel}${seasonTag(season.mplus)}</div>
      ${mplus.hasLogs ? `
        <div class="stat-row"><span>Avg parse</span><span class="stat-val" style="color:${parseColor(mplus.avgPercentile)}">${mplus.avgPercentile}%</span></div>
        <div class="stat-row"><span>Runs sampled</span><span class="stat-val">${mplus.runs.length}</span></div>
        ${intLine}
        ${topDpsLine}
        <div class="parse-bar-wrap">${runsHtml}</div>
        ${(mplus.missingDungeons ?? []).length > 0
          ? `<p style="color:#f0b429;font-size:.82rem;margin-top:8px">\u26a0 No data for: ${mplus.missingDungeons.join(', ')}</p>`
          : ''
        }
      ` : '<p style="color:#8b949e;font-size:.9rem">No M+ logs found.</p>'}
    </div>

    ${healerDmg ? `
    <div class="card">
      <div class="section-title">Mythic+ Damage${seasonTag(season.mplus)}</div>
      ${healerDmg.hasLogs ? `
        <div class="stat-row"><span>Avg parse</span><span class="stat-val" style="color:${parseColor(healerDmg.avgPercentile)}">${healerDmg.avgPercentile}%</span></div>
        <div class="stat-row"><span>Runs sampled</span><span class="stat-val">${healerDmg.runs.length}</span></div>
        <div class="parse-bar-wrap">${buildRunsHtml(healerDmg.runs, reportLinks)}</div>
        ${(healerDmg.missingDungeons ?? []).length > 0
          ? `<p style="color:#f0b429;font-size:.82rem;margin-top:8px">\u26a0 No data for: ${healerDmg.missingDungeons.join(', ')}</p>`
          : ''
        }
      ` : '<p style="color:#8b949e;font-size:.9rem">No M+ damage data found.</p>'}
    </div>
    ` : ''}

    <div class="card">
      <div class="section-title">Raid${seasonTag(season.raid)}</div>
      ${raid.hasLogs ? `
        <div class="stat-row"><span>Avg parse</span><span class="stat-val" style="color:${parseColor(raid.avgParse)}">${raid.avgParse}%</span></div>
        <div class="stat-row"><span>Mythic encounters</span><span class="stat-val">${raid.mythicCount}</span></div>
        <div class="stat-row"><span>Heroic encounters</span><span class="stat-val">${raid.heroicCount}</span></div>
      ` : '<p style="color:#8b949e;font-size:.9rem">No heroic/mythic raid logs found.</p>'}
    </div>
  `;
}

async function runLookup(name, server, region) {
  resultEl.innerHTML = '';
  resultEl.classList.remove('compare-result');
  spinner.style.display = 'block';
  submitBtn.disabled = true;

  const params = new URLSearchParams({ name, server, region });
  history.replaceState(null, '', '?' + params.toString());

  try {
    const data = await fetchLookup(name, server, region);
    resultEl.innerHTML = renderResultHtml(data);
    // Add copy-link button for single mode
    const header = resultEl.querySelector('.verdict-header');
    if (header) {
      const btn = document.createElement('button');
      btn.className = 'copy-link-btn';
      btn.id = 'copy-link-btn';
      btn.style.marginLeft = 'auto';
      btn.textContent = 'Copy link';
      header.appendChild(btn);
    }
  } catch (err) {
    resultEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
  } finally {
    spinner.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Compare mode: each side sniffs independently into its own column
// ---------------------------------------------------------------------------
function ensureCompareLayout() {
  if (!resultEl.querySelector('.compare-results')) {
    resultEl.classList.add('compare-result');
    resultEl.innerHTML = `
      <div class="compare-results">
        <div class="compare-col" id="compare-col-1"></div>
        <div class="compare-divider"></div>
        <div class="compare-col" id="compare-col-2"></div>
      </div>
      <button class="copy-link-btn" id="copy-link-btn" style="margin-top:12px">Copy link</button>
    `;
  }
}

function updateCompareUrl() {
  const n1 = form.name.value.trim(), s1 = form.server.value.trim(), r1 = form.region.value;
  const n2 = form2.name.value.trim(), s2 = form2.server.value.trim(), r2 = form2.region.value;
  const params = new URLSearchParams({ name: n1, server: s1, region: r1, name2: n2, server2: s2, region2: r2 });
  history.replaceState(null, '', '?' + params.toString());
}

async function runCompareSide(side, name, server, region) {
  ensureCompareLayout();
  const col = document.getElementById(`compare-col-${side}`);
  const btn = document.getElementById(side === 1 ? 'submit-btn' : 'submit-btn-2');
  col.innerHTML = '<p style="color:#8b949e;font-size:.9rem">Checking logs...</p>';
  btn.disabled = true;

  try {
    const data = await fetchLookup(name, server, region);
    col.innerHTML = renderResultHtml(data);
  } catch (err) {
    col.innerHTML = `<div class="error-msg">${err.message}</div>`;
  } finally {
    btn.disabled = false;
    updateCompareUrl();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const n = form.name.value.trim(), s = form.server.value.trim(), r = form.region.value;
  if (compareMode) {
    runCompareSide(1, n, s, r);
  } else {
    runLookup(n, s, r);
  }
});

form2.addEventListener('submit', (e) => {
  e.preventDefault();
  const n = form2.name.value.trim(), s = form2.server.value.trim(), r = form2.region.value;
  runCompareSide(2, n, s, r);
});

resultEl.addEventListener('click', (e) => {
  const btn = e.target.closest('#copy-link-btn');
  if (!btn) return;
  navigator.clipboard.writeText(location.href).then(() => {
    btn.textContent = 'Copied!';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Copy link'; btn.disabled = false; }, 2000);
  });
});

// Pre-fill and auto-run from URL params (shareable links)
const qp = new URLSearchParams(location.search);
if (qp.get('name') && qp.get('server')) {
  form.name.value   = qp.get('name');
  form.server.value = qp.get('server');
  if (qp.get('region')) form.region.value = qp.get('region');

  if (qp.get('name2') && qp.get('server2')) {
    // Compare mode from URL
    form2.name.value   = qp.get('name2');
    form2.server.value = qp.get('server2');
    if (qp.get('region2')) form2.region.value = qp.get('region2');
    setCompareMode(true);
    runCompareSide(1, form.name.value, form.server.value, form.region.value);
    runCompareSide(2, form2.name.value, form2.server.value, form2.region.value);
  } else {
    runLookup(form.name.value, form.server.value, form.region.value);
  }
}
