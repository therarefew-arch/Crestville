// Game data: elements, roles, creatures and regions.

const ELEMENTS = {
  leaf:  { name: 'Leaf',  color: '#a8cf8e', dark: '#5e8a4a', beats: ['water', 'stone'] },
  water: { name: 'Water', color: '#9ccfdc', dark: '#4d8899', beats: ['fire', 'stone'] },
  fire:  { name: 'Fire',  color: '#f4ab84', dark: '#c0623f', beats: ['leaf', 'shade'] },
  spark: { name: 'Spark', color: '#f5d886', dark: '#b88f2c', beats: ['water'] },
  stone: { name: 'Stone', color: '#d2c2a4', dark: '#8a7656', beats: ['spark', 'fire'] },
  shade: { name: 'Shade', color: '#bfaed8', dark: '#73619a', beats: ['spark', 'leaf'] },
};

const ROLES = {
  tank:      { name: 'Tank',      hp: 1.6,  atk: 0.7, spd: 0.8, desc: 'Stands in front and soaks up hits.' },
  striker:   { name: 'Striker',   hp: 0.9,  atk: 1.4, spd: 1.0, desc: 'Hits hard.' },
  support:   { name: 'Support',   hp: 1.0,  atk: 0.8, spd: 1.0, desc: 'Heals friends.' },
  trickster: { name: 'Trickster', hp: 0.85, atk: 1.1, spd: 1.3, desc: 'Quick, sneaks past the front row.' },
};

const SKILLS = {
  tank: () => ({ name: 'Cozy Guard', desc: 'Gains a shield worth 30% of max HP.' }),
  striker: (el) => ({
    name: { leaf: 'Thorn Toss', water: 'Splash Dash', fire: 'Flare Pounce', spark: 'Zip Zap', stone: 'Pebble Bonk', shade: 'Dusk Swoop' }[el],
    desc: 'A big hit for 230% damage.',
  }),
  support: () => ({ name: 'Warm Hug', desc: 'Heals the most hurt friend.' }),
  trickster: () => ({ name: 'Sneaky Swipe', desc: 'Hits a back-row foe for 160% and drains their energy.' }),
};

const RARITY = {
  common:    { name: 'Common',    mult: 1.0,  weight: 70, color: '#a89580' },
  rare:      { name: 'Rare',      mult: 1.1,  weight: 25, color: '#6f9fc0' },
  epic:      { name: 'Epic',      mult: 1.22, weight: 5,  color: '#a07cc4' },
};

// names: [stage 1, stage 2 (lv 10), stage 3 (lv 25)]
const SPECIES = [
  { id: 'mossbun',   names: ['Mossbun', 'Mossbuck', 'Grovehart'],     el: 'leaf',  role: 'tank',      rarity: 'common', ears: 'long',   region: 0 },
  { id: 'thistlet',  names: ['Thistlet', 'Thistlynx', 'Briarclaw'],   el: 'leaf',  role: 'striker',   rarity: 'common', ears: 'pointy', region: 0 },
  { id: 'fernwhisk', names: ['Fernwhisk', 'Fernmouse', 'Fernmother'], el: 'leaf',  role: 'support',   rarity: 'common', ears: 'round',  region: 0 },
  { id: 'puddlepup', names: ['Puddlepup', 'Pondhound', 'Lakeward'],   el: 'water', role: 'tank',      rarity: 'common', ears: 'round',  region: 0 },
  { id: 'driplet',   names: ['Driplet', 'Drizzlet', 'Rainmae'],       el: 'water', role: 'support',   rarity: 'common', ears: 'none',   region: 0 },
  { id: 'emberkit',  names: ['Emberkit', 'Embercat', 'Blazelion'],    el: 'fire',  role: 'striker',   rarity: 'common', ears: 'pointy', region: 0 },
  { id: 'cindermole',names: ['Cindermole', 'Cinderburrow', 'Magmole'],el: 'fire',  role: 'tank',      rarity: 'common', ears: 'none',   region: 1 },
  { id: 'wickling',  names: ['Wickling', 'Wickwisp', 'Lanternix'],    el: 'fire',  role: 'trickster', rarity: 'rare',   ears: 'pointy', region: 1 },
  { id: 'pebbleton', names: ['Pebbleton', 'Boulderon', 'Cragmont'],   el: 'stone', role: 'tank',      rarity: 'rare',   ears: 'round',  region: 1 },
  { id: 'ripplefox', names: ['Ripplefox', 'Wavefox', 'Tidekitsu'],    el: 'water', role: 'striker',   rarity: 'rare',   ears: 'pointy', region: 2 },
  { id: 'shellby',   names: ['Shellby', 'Shellmund', 'Conchessa'],    el: 'stone', role: 'support',   rarity: 'common', ears: 'none',   region: 2 },
  { id: 'duskmoth',  names: ['Duskmoth', 'Duskwing', 'Nocturna'],     el: 'shade', role: 'trickster', rarity: 'epic',   ears: 'none',   region: 3 },
  { id: 'hootlet',   names: ['Hootlet', 'Hootwise', 'Owlmother'],     el: 'shade', role: 'support',   rarity: 'rare',   ears: 'pointy', region: 3 },
  { id: 'zappip',    names: ['Zappip', 'Zapperoo', 'Voltaroo'],       el: 'spark', role: 'striker',   rarity: 'rare',   ears: 'long',   region: 4 },
  { id: 'voltail',   names: ['Voltail', 'Voltsquirrel', 'Stormtail'], el: 'spark', role: 'trickster', rarity: 'epic',   ears: 'round',  region: 4 },
];
const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

const REGIONS = [
  { name: 'Meadow Hollow',  crest: 'Meadow Crest', tamer: 'Tamer Rowan',  sky: ['#fde9c9', '#f7d9b0'], hill: '#b9d79a', hill2: '#9cc485' },
  { name: 'Ember Ridge',    crest: 'Ember Crest',  tamer: 'Tamer Ash',    sky: ['#fbd9c0', '#f2bfa0'], hill: '#d9b48f', hill2: '#c99d78' },
  { name: 'Tidepool Coast', crest: 'Tide Crest',   tamer: 'Tamer Marina', sky: ['#dcefee', '#c2e0e3'], hill: '#efdcb4', hill2: '#a9d3d6' },
  { name: 'Whisperwood',    crest: 'Hush Crest',   tamer: 'Tamer Wren',   sky: ['#e7def0', '#d6c8e6'], hill: '#9fb98f', hill2: '#86a37a' },
  { name: 'Stormcrest Peak',crest: 'Storm Crest',  tamer: 'Tamer Gale',   sky: ['#e2e6ee', '#cdd4e2'], hill: '#c9c3b3', hill2: '#aea795' },
];

const STARTERS = ['mossbun', 'puddlepup', 'emberkit'];

const RIVAL_NAMES = ['Hazel', 'Juniper', 'Otis', 'Clementine', 'Basil', 'Poppy', 'Fennel', 'Marigold', 'Rufus', 'Willa', 'Pip', 'Tansy'];

// Base [attack, HP] at level 1. Battles use small, readable numbers.
const BASE_STATS = {
  mossbun: [2, 5], thistlet: [3, 3], fernwhisk: [2, 3], puddlepup: [2, 4], driplet: [2, 3],
  emberkit: [3, 3], cindermole: [2, 5], wickling: [3, 2], pebbleton: [2, 5], ripplefox: [3, 3],
  shellby: [1, 5], duskmoth: [3, 3], hootlet: [2, 4], zappip: [4, 2], voltail: [3, 3],
};

// Stat gain per level, by role: [attack, HP]
const GROWTH = { tank: [0.55, 1.5], striker: [0.95, 0.85], support: [0.65, 1.1], trickster: [0.85, 0.85] };
