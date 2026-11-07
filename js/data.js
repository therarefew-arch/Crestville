// Game data: elements, roles, creatures, traits and regions.

// Bump by one with every update (v0.0.02, v0.0.03, ...). Also add a line to CHANGELOG.md.
const VERSION = 'v0.0.09';

const ELEMENTS = {
  leaf:  { name: 'Leaf',  color: '#a8cf8e', dark: '#5e8a4a', beats: ['water', 'stone'] },
  water: { name: 'Water', color: '#9ccfdc', dark: '#4d8899', beats: ['fire', 'stone'] },
  fire:  { name: 'Fire',  color: '#f4ab84', dark: '#c0623f', beats: ['leaf', 'gear'] },
  spark: { name: 'Spark', color: '#f5d886', dark: '#b88f2c', beats: ['water', 'gear'] },
  stone: { name: 'Stone', color: '#d2c2a4', dark: '#8a7656', beats: ['spark', 'fire'] },
  shade: { name: 'Shade', color: '#bfaed8', dark: '#73619a', beats: ['spark', 'leaf'] },
  gear:  { name: 'Gear',  color: '#c3cbd6', dark: '#6f7c90', beats: ['shade', 'stone'] },
};

const ROLES = {
  tank:      { name: 'Tank',      desc: 'Sturdy. Good at the front of the line.' },
  striker:   { name: 'Striker',   desc: 'Hits hard but is a bit fragile.' },
  support:   { name: 'Support',   desc: 'Helps the rest of the team.' },
  trickster: { name: 'Trickster', desc: 'Sneaky tricks that hit past the front.' },
};

const RARITY = {
  common: { name: 'Common', mult: 1.0,  weight: 70, color: '#a89580', traits: 1, wild: 6 },
  rare:   { name: 'Rare',   mult: 1.1,  weight: 25, color: '#6f9fc0', traits: 2, wild: 3 },
  epic:   { name: 'Epic',   mult: 1.22, weight: 5,  color: '#a07cc4', traits: 3, wild: 1 },
};

// Base [attack, HP] at level 1, by role. A few species override it.
const ROLE_BASE = { tank: [2, 5], striker: [3, 3], support: [2, 4], trickster: [3, 3] };
// Stat gain per level, by role: [attack, HP]
const GROWTH = { tank: [0.55, 1.5], striker: [0.95, 0.85], support: [0.65, 1.1], trickster: [0.85, 0.85] };

// id | stage names | element | role | rarity | region | body | ears | extras | abilities | base stats (optional)
// body: round, tall, wide, pear, tiny. extras are art details joined with +.
const SPECIES_TABLE = `
mossbun|Mossbun,Mossbuck,Grovehart|leaf|tank|common|0|round|long||fluff,bounce|2,5
thistlet|Thistlet,Thistlynx,Briarclaw|leaf|striker|common|0|tall|pointy||prickly,thorns|3,3
fernwhisk|Fernwhisk,Fernmouse,Fernmother|leaf|support|common|0|round|round|whiskers|bless,snack|2,3
puddlepup|Puddlepup,Pondhound,Lakeward|water|tank|common|0|round|round||splashback,fluff|2,4
driplet|Driplet,Drizzlet,Rainmae|water|support|common|0|pear|none||lastdrop,sharefront|2,3
emberkit|Emberkit,Embercat,Blazelion|fire|striker|common|0|round|pointy|whiskers|sparktoss,whetstone|3,3
acornut|Acornut,Oakernut,Oakenguard|leaf|tank|common|0|wide|none|cap|toughskin,fluff|
bumblefuzz|Bumblefuzz,Bumblebaron,Bumbella|spark|trickster|rare|0|round|none|wings+antenna+stripes|chainzap,tailbolt|
pipsqueak|Pipsqueak,Squeakster,Squeaklord|spark|striker|common|0|tiny|round|whiskers|sparktoss,snipeback|
tadpip|Tadpip,Froglet,Croakmajor|water|striker|common|0|pear|none|bigmouth|ripple,whetstone|
clovercub|Clovercub,Cloverbear,Fortunbear|leaf|support|rare|0|wide|round|clover|bless,snack|
snailey|Snailey,Snailsworth,Shellington|stone|tank|common|0|tall|none|shell+antenna|toughskin,bounce|
kindlet|Kindlet,Kindlewick,Hearthmother|fire|support|common|0|pear|round|tuft|warmup,sharefront|
quackle|Quackle,Quackadoo,Admiral Quack|water|trickster|common|0|round|none|beak|tailbolt,dust|
bramblehog|Bramblehog,Briarhog,Thornboar|leaf|trickster|common|0|wide|round|spikes|thorns,prickly|
puffseed|Puffseed,Puffball,Dandelord|leaf|trickster|rare|0|tiny|none|tuft|spore,snipeback|
cindermole|Cindermole,Cinderburrow,Magmole|fire|tank|common|1|wide|none|whiskers|warmup,toughskin|2,5
wickling|Wickling,Wickwisp,Lanternix|fire|trickster|rare|1|tall|pointy||wickpop,snipeback|3,2
pebbleton|Pebbleton,Boulderon,Cragmont|stone|tank|rare|1|wide|round|spots|toughskin,splashback|2,5
magmite|Magmite,Magmaul,Volcanox|fire|tank|common|1|wide|none|horn|warmup,thorns|
flarefinch|Flarefinch,Flarejay,Phoenixa|fire|striker|rare|1|tall|none|beak+wings|sparktoss,whetstone|
rubblepup|Rubblepup,Rubblehound,Quarrywolf|stone|striker|common|1|round|pointy||rally,prickly|
geodot|Geodot,Geodome,Crystalia|stone|support|rare|1|round|none|crystals|sharefront,bless|
sparklet|Sparklet,Sparkling,Auroraph|spark|support|common|1|tiny|none|antenna|bless,chainzap|
kidcrag|Kidcrag,Cragoat,Summitram|stone|tank|common|1|round|round|horns|toughskin,fluff|
salamandle|Salamandle,Salamanda,Pyrosaur|fire|support|common|1|pear|none|fin|lastdrop,warmup|
coglet|Coglet,Cogwheel,Gearganaut|gear|tank|rare|1|wide|none|bolts+antenna|toughskin,armor|
echobat|Echobat,Echowing,Nightroar|shade|trickster|common|1|tiny|pointy|wings|dust,snipeback|
ripplefox|Ripplefox,Wavefox,Tidekitsu|water|striker|rare|2|tall|pointy||ripple,whetstone|3,3
shellby|Shellby,Shellmund,Conchessa|stone|support|common|2|round|none|shell|sharefront,bless|1,5
crabbit|Crabbit,Crabbard,Clawdius|stone|striker|common|2|wide|none|claws|whetstone,thorns|
sealpup|Sealpup,Sealord,Walrumble|water|tank|common|2|pear|none|whiskers|fluff,splashback|
coralin|Coralin,Coralina,Reefqueen|water|support|rare|2|tall|none|crown|bless,lastdrop|
jellyjig|Jellyjig,Jellyjive,Medusalle|water|trickster|common|2|round|none|tendrils|chainzap,tailbolt|
puffle|Puffle,Pufflebloat,Spinepuff|water|tank|common|2|round|none|spikes+fin|thorns,wickpop|
gullet|Gullet,Gullwing,Stormgull|spark|striker|common|2|tall|none|beak+wings|ripple,sparktoss|
starfin|Starfin,Starsea,Constellara|stone|support|rare|2|tiny|none|star|sharefront,avenge|
otterpop|Otterpop,Otterdash,Tidalotter|water|striker|common|2|tall|round|whiskers|ripple,whetstone|
inkpip|Inkpip,Inksquid,Krakelle|shade|trickster|rare|2|pear|none|tendrils|dust,snipeback|
duskmoth|Duskmoth,Duskwing,Nocturna|shade|trickster|epic|3|round|none|wings+antenna|dust,snipeback|3,3
hootlet|Hootlet,Hootwise,Owlmother|shade|support|rare|3|round|pointy|beak|watchful,avenge|2,4
mushling|Mushling,Mushroomer,Grandcap|leaf|tank|common|3|pear|none|cap|spore,fluff|
glowpip|Glowpip,Glowgrub,Lumibelle|spark|support|common|3|tiny|none|antenna|bless,chainzap|
fawnlet|Fawnlet,Fawnlight,Elderstag|leaf|striker|rare|3|tall|pointy|antlers|rally,whetstone|
duskpaw|Duskpaw,Shadecat,Umbralynx|shade|striker|common|3|tall|pointy|whiskers|snipeback,avenge|
wispit|Wispit,Wispwillow,Lanternmother|shade|support|common|3|tiny|none|tuft|lastdrop,bless|
banditail|Banditail,Banditeer,Rogueroo|shade|trickster|common|3|round|round|mask+stripes|dust,tailbolt|
pebblemoss|Pebblemoss,Mossgolem,Elderwood|stone|tank|epic|3|wide|none|crown+spots|toughskin,bless|
sporetoad|Sporetoad,Sporecroak,Mycotoad|leaf|trickster|common|3|wide|none|cap+bigmouth|spore,thorns|
petalshade|Petalshade,Nightbloom,Moonblossom|shade|striker|rare|3|pear|none|petals|snipeback,avenge|
zappip|Zappip,Zapperoo,Voltaroo|spark|striker|rare|4|tall|long||chainzap,sparktoss|4,2
voltail|Voltail,Voltsquirrel,Stormtail|spark|trickster|epic|4|round|round||tailbolt,dust|3,3
boltbot|Boltbot,Boltron,Megabolt|gear|striker|common|4|tall|none|bolts+antenna|whetstone,sparktoss|
gearpup|Gearpup,Gearhound,Ironmastiff|gear|tank|common|4|round|round|bolts|toughskin,splashback|
nimbit|Nimbit,Nimbuff,Cumulonimba|spark|support|common|4|round|none|cloud|bless,chainzap|
rumblecub|Rumblecub,Rumblebear,Thunderursa|spark|tank|common|4|wide|round||warmup,thorns|
tickwing|Tickwing,Clockwing,Chronowl|gear|trickster|rare|4|round|pointy|wings+bolts|dust,snipeback|
yakling|Yakling,Yakmont,Avalancher|stone|tank|common|4|wide|none|horns+mane|fluff,sharefront|
cogsprout|Cogsprout,Gearbloom,Mechagrove|leaf|support|rare|4|pear|none|bolts+clover|bless,lastdrop|
drakelet|Drakelet,Stormwyrm,Tempestra|spark|striker|epic|4|tall|none|wings+horns|chainzap,avenge|
`;

const SPECIES = SPECIES_TABLE.trim().split('\n').map((line) => {
  const [id, names, el, role, rarity, region, body, ears, extras, abilities, base] = line.split('|');
  return {
    id, names: names.split(','), el, role, rarity, region: Number(region), body, ears,
    extras: extras ? extras.split('+') : [], abilities: abilities.split(','),
    base: base ? base.split(',').map(Number) : ROLE_BASE[role],
  };
});
const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// Random traits each creature can roll. kind: stat (changes stats), battle (does something), town (outside battle)
const TRAITS = {
  brave:     { name: 'Brave',        weight: 10, desc: '+15% attack.' },
  hardy:     { name: 'Hardy',        weight: 10, desc: '+15% HP.' },
  giant:     { name: 'Giant',        weight: 6,  desc: '+30% HP, -10% attack.' },
  glass:     { name: 'Glass Cannon', weight: 6,  desc: '+30% attack, -20% HP.' },
  thickfur:  { name: 'Thick Fur',    weight: 7,  desc: 'Takes 1 less damage from every hit.' },
  quick:     { name: 'Quick',        weight: 7,  desc: 'Start of battle: deals 2 damage to the front foe.' },
  guardian:  { name: 'Guardian',     weight: 5,  desc: 'Start of battle: gives the ally behind it +3 HP.' },
  opener:    { name: 'Opener',       weight: 4,  desc: 'Its first attack deals +4 damage.' },
  laststand: { name: 'Last Stand',   weight: 4,  desc: 'When it is the last one standing: +4 attack.' },
  vengeful:  { name: 'Vengeful',     weight: 6,  desc: 'When an ally faints: +1 attack.' },
  sapling:   { name: 'Regrowth',     weight: 6,  desc: 'After attacking: heals 1 HP.' },
  lucky:     { name: 'Lucky',        weight: 5,  desc: '+25% coins from battles while on your team.' },
  scholar:   { name: 'Scholar',      weight: 5,  desc: 'Earns +30% XP.' },
};
const EXCLUSIVE_TRAITS = [['giant', 'glass']];

const REGIONS = [
  { name: 'Meadow Hollow',  crest: 'Meadow Crest', hill2: '#9cc485' },
  { name: 'Ember Ridge',    crest: 'Ember Crest',  hill2: '#c99d78' },
  { name: 'Tidepool Coast', crest: 'Tide Crest',   hill2: '#a9d3d6' },
  { name: 'Whisperwood',    crest: 'Hush Crest',   hill2: '#86a37a' },
  { name: 'Stormcrest Peak',crest: 'Storm Crest',  hill2: '#aea795' },
];

const STARTERS = ['mossbun', 'puddlepup', 'emberkit'];

const RIVAL_NAMES = ['Hazel', 'Juniper', 'Otis', 'Clementine', 'Basil', 'Poppy', 'Fennel', 'Marigold', 'Rufus', 'Willa', 'Pip', 'Tansy'];

// ---------- Charms: loot with random bonus stats ----------
const CHARM_RARITY = {
  common:    { name: 'Common',    color: '#b9a88f', glow: '#efe2c9', affixes: 1, mult: 1,   salvage: 10 },
  rare:      { name: 'Rare',      color: '#6f9fc0', glow: '#c8e7ee', affixes: 2, mult: 1.25, salvage: 25 },
  epic:      { name: 'Epic',      color: '#a07cc4', glow: '#e3d6f3', affixes: 2, mult: 1.6, salvage: 60 },
  legendary: { name: 'Legendary', color: '#e0a32e', glow: '#fbe7a1', affixes: 3, mult: 2.1, salvage: 150 },
};
// per: value grows with the charm's level. pct: a percent range that grows with rarity.
const AFFIXES = {
  atk:    { per: 0.14, text: (v) => `+${v} attack`, noun: 'Fang', kind: 'attack' },
  hp:     { per: 0.35, text: (v) => `+${v} HP`, noun: 'Shell', kind: 'guard' },
  atkPct: { pct: [5, 12], text: (v) => `+${v}% attack`, noun: 'Ember', kind: 'attack' },
  hpPct:  { pct: [6, 14], text: (v) => `+${v}% HP`, noun: 'Bloom', kind: 'guard' },
  opener: { per: 0.3, text: (v) => `First hit deals +${v} damage`, noun: 'Spark', kind: 'attack' },
  lead:   { per: 0.12, text: (v) => `+${v} attack while first in line`, noun: 'Banner', kind: 'attack' },
  thorny: { per: 0.08, text: (v) => `When hurt: deals ${v} damage back`, noun: 'Thorn', kind: 'guard' },
  mend:   { per: 0.08, text: (v) => `After attacking: heals ${v} HP`, noun: 'Dewdrop', kind: 'guard' },
  guard:  { per: 0.05, text: (v) => `Takes ${v} less damage from hits`, noun: 'Pebble', kind: 'guard' },
  xp:     { pct: [8, 20], text: (v) => `+${v}% XP`, noun: 'Quill', kind: 'growth' },
  coins:  { pct: [8, 20], text: (v) => `+${v}% coins (team)`, noun: 'Coin', kind: 'growth' },
};
const CHARM_ADJ = {
  common: ['Little', 'Cozy', 'Plain', 'Pocket'], rare: ['Bright', 'Lucky', 'Polished', 'Humming'],
  epic: ['Radiant', 'Ancient', 'Starlit', 'Whispering'], legendary: ['Mythic', 'Celestial', 'Eternal', 'Crowned'],
};
