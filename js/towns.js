// Themes (colors, trees, scenery, ambience, music) and the 10 towns beyond Crestville.
// Each town is built from a seeded layout so it stays the same every time you visit.

const THEMES = {
  meadow:   { grass: '#bcd99c', grassD: '#a3c886', tall: '#94c07c', tallD: '#6f9f5c', path: '#eddcb5', pathD: '#dcc595', water: '#9ccfdc', waterL: '#c8e7ee',
              tree: 'round', canopy: ['#86b56f', '#7aaa66'], trunk: '#a07a55', flowers: ['#f3a9b6', '#fbe08a', '#fffaf0'], deco: 'rock', wall: '#fff4dc', bg: '#86b56f',
              ambient: 'none', lane: ['#fde9c9', '#f7dcb4', '#bcd99c', '#a8cf8e'], music: 'meadow' },
  willow:   { grass: '#b7dcb0', grassD: '#9dc99a', tall: '#8fc49a', tallD: '#5f9a6f', path: '#e9e0c4', pathD: '#d6caa3', water: '#8fcbd9', waterL: '#d2eef3',
              tree: 'willow', canopy: ['#9cc98f', '#86b97f'], trunk: '#8d7356', flowers: ['#cdb8e4', '#fffaf0', '#9ccfdc'], deco: 'reeds', wall: '#f6f3e6', bg: '#8fbf8f',
              ambient: 'leaves', lane: ['#e3f1ee', '#cfe6e4', '#b7dcb0', '#9dc99a'], music: 'willow' },
  sunpetal: { grass: '#cde39a', grassD: '#b5d27e', tall: '#a9cf6f', tallD: '#7ea64a', path: '#f3e1b0', pathD: '#e2c98b', water: '#a6d8e6', waterL: '#d8f1f6',
              tree: 'round', canopy: ['#a8cf6a', '#94c25c'], trunk: '#a07a55', flowers: ['#fbd25a', '#f6a6b8', '#fffaf0', '#f4ab84'], deco: 'hay', wall: '#fff8e0', bg: '#a8cf6a',
              ambient: 'petals', lane: ['#fff3c4', '#fde3a0', '#cde39a', '#b5d27e'], music: 'sunpetal' },
  ember:    { grass: '#d7b99a', grassD: '#c4a283', tall: '#c99a74', tallD: '#a06d4b', path: '#ead2b6', pathD: '#d4b694', water: '#f19a62', waterL: '#fbd27a',
              tree: 'ashpine', canopy: ['#8f7a6a', '#7f6b5c'], trunk: '#6b5444', flowers: ['#f4ab84', '#f7c66b'], deco: 'anvil', wall: '#f3e1cf', bg: '#b9917a',
              ambient: 'embers', lane: ['#fbd5bd', '#f2b89a', '#d7b99a', '#c4a283'], music: 'ember' },
  harbor:   { grass: '#f0dfb2', grassD: '#e2cc94', tall: '#bfd59a', tallD: '#8eae66', path: '#e3cfa6', pathD: '#cdb487', water: '#7fc4d6', waterL: '#d4f0f6',
              tree: 'palm', canopy: ['#8fc27c', '#7db36c'], trunk: '#b48a5e', flowers: ['#f3b6c8', '#fffaf0', '#f6d36b'], deco: 'crate', wall: '#fbfbf3', bg: '#7fc4d6',
              ambient: 'gulls', lane: ['#dcf1f6', '#bfe4ee', '#f0dfb2', '#e2cc94'], music: 'harbor' },
  swamp:    { grass: '#a9b98f', grassD: '#93a57a', tall: '#8a9f74', tallD: '#62774f', path: '#cfc3a2', pathD: '#b8aa86', water: '#8ea89a', waterL: '#b9cfc2',
              tree: 'mushroom', canopy: ['#c98ab0', '#b47aa0'], trunk: '#e8dccb', flowers: ['#d8c4ec', '#b8e0c8'], deco: 'stump', wall: '#ece6d6', bg: '#7d9077',
              ambient: 'mist', tint: 'rgba(90, 110, 100, .12)', lane: ['#d9e0d3', '#c3cfbf', '#a9b98f', '#93a57a'], music: 'swamp' },
  lantern:  { grass: '#8e9ab8', grassD: '#7c88a8', tall: '#7a86a9', tallD: '#59638a', path: '#c5bfd6', pathD: '#aaa3c3', water: '#6f7fae', waterL: '#a9b7e0',
              tree: 'round', canopy: ['#6d7a9e', '#617092'], trunk: '#5b4a5f', flowers: ['#f6d36b', '#f3b6c8'], deco: 'lantern', wall: '#efe7f3', bg: '#5f6a8d',
              ambient: 'fireflies', tint: 'rgba(40, 36, 90, .22)', lane: ['#c8c3e6', '#a9a3d3', '#8e9ab8', '#7c88a8'], music: 'lantern' },
  desert:   { grass: '#f1d9a8', grassD: '#e4c58c', tall: '#d9c27e', tallD: '#b39a55', path: '#f6e6c4', pathD: '#e7cfa0', water: '#7fcfd0', waterL: '#c9f0ec',
              tree: 'cactus', canopy: ['#8fbf78', '#7fae69'], trunk: '#8fbf78', flowers: ['#f4ab84', '#f3b6c8'], deco: 'pot', wall: '#fbeedd', bg: '#e8c98f',
              ambient: 'sand', lane: ['#fde7c2', '#f7d39e', '#f1d9a8', '#e4c58c'], music: 'desert' },
  cog:      { grass: '#c9ccc4', grassD: '#b4b8ae', tall: '#a9b59a', tallD: '#7d8b6e', path: '#e0d7c5', pathD: '#c8bda6', water: '#8fb2c2', waterL: '#c3dbe5',
              tree: 'pipe', canopy: ['#d9b26a', '#c79f58'], trunk: '#8c8f99', flowers: ['#d9b26a', '#9ccfdc'], deco: 'gear', wall: '#f1ece2', bg: '#a7aba3',
              ambient: 'steam', lane: ['#e6e3dc', '#d1ccc0', '#c9ccc4', '#b4b8ae'], music: 'cog' },
  frost:    { grass: '#eef3f6', grassD: '#dbe5ec', tall: '#c9dbe3', tallD: '#93b2c2', path: '#dfe7ee', pathD: '#c6d3de', water: '#a9d3e6', waterL: '#e4f4fb',
              tree: 'pine', canopy: ['#7fa78f', '#6f9a80'], trunk: '#8d7356', flowers: ['#a9d3e6', '#fffaf0'], deco: 'ice', wall: '#fbf6ee', bg: '#cfdde6',
              ambient: 'snow', lane: ['#eef4f8', '#dce8f0', '#eef3f6', '#dbe5ec'], music: 'frost' },
  sky:      { grass: '#e9e4f6', grassD: '#d8d1ee', tall: '#cfc5ec', tallD: '#a597d6', path: '#f8f1d8', pathD: '#ebdfb7', water: '#fdfbff', waterL: '#e6e0f7',
              tree: 'puff', canopy: ['#fffaf0', '#f3eefc'], trunk: '#d6c9ee', flowers: ['#f6d36b', '#bfaed8', '#9ccfdc'], deco: 'crystal', wall: '#fffdf7', bg: '#cdbfee',
              ambient: 'stars', lane: ['#efe9fb', '#ded5f6', '#e9e4f6', '#d8d1ee'], music: 'sky' },
};

const TOWN_DEFS = [
  { id: 'willowmere', name: 'Willowmere', theme: 'willow', els: ['water', 'leaf'], lv: [9, 14], seed: 11,
    champ: 'Champion Marisol', look: { skin: '#f1c9a8', hair: '#6f9fae', shirt: '#9ccfdc', pants: '#5f7f8a' },
    lines: ['The willows here whisper when it rains.', 'We fish at dawn and nap by noon. It\'s a good life.'] },
  { id: 'sunpetal', name: 'Sunpetal Fields', theme: 'sunpetal', els: ['leaf', 'spark'], lv: [13, 19], seed: 23,
    champ: 'Champion Hollis', look: { skin: '#e8b892', hair: '#e9b949', shirt: '#fbd25a', pants: '#8a7461', hat: '#f4ab84' },
    lines: ['Every field here grows a different color of flower.', 'Bumblefuzz love the sunflowers. So do I!'] },
  { id: 'emberforge', name: 'Emberforge', theme: 'ember', els: ['fire', 'stone', 'gear'], lv: [18, 25], seed: 37,
    champ: 'Champion Brann', look: { skin: '#d9a77f', hair: '#4a3426', shirt: '#c0623f', pants: '#5b4636' },
    lines: ['The forges never cool. Neither does the soup.', 'Watch your step near the lava. It\'s warm, not friendly.'] },
  { id: 'saltbreeze', name: 'Saltbreeze Harbor', theme: 'harbor', els: ['water', 'stone', 'spark'], lv: [23, 31], seed: 41,
    champ: 'Champion Coralie', look: { skin: '#e8b892', hair: '#2f2a26', shirt: '#7fc4d6', pants: '#fffaf0', hat: '#fffaf0' },
    lines: ['Boats come in with the tide and leave with the gulls.', 'Shellby love to sunbathe on the docks.'] },
  { id: 'duskmire', name: 'Duskmire', theme: 'swamp', els: ['shade', 'leaf', 'water'], lv: [29, 37], seed: 53,
    champ: 'Champion Moss', look: { skin: '#d9c7b0', hair: '#5e8a4a', shirt: '#8a9f74', pants: '#5b4636' },
    lines: ['The mist is thick, but the mushrooms glow to light the way.', 'Something croaks in the bog every night. We call it Gerald.'] },
  { id: 'lanternhollow', name: 'Lanternhollow', theme: 'lantern', els: ['shade', 'fire', 'spark'], lv: [35, 45], seed: 67,
    champ: 'Champion Noctis', look: { skin: '#f1c9a8', hair: '#2f2a46', shirt: '#73619a', pants: '#3f3550' },
    lines: ['It\'s always evening in Lanternhollow. We like it that way.', 'Each lantern is lit for someone who found their way home.'] },
  { id: 'sandglass', name: 'Sandglass Oasis', theme: 'desert', els: ['stone', 'fire'], lv: [43, 53], seed: 71,
    champ: 'Champion Zahra', look: { skin: '#c99a74', hair: '#2f2a26', shirt: '#f4ab84', pants: '#fbeedd', hat: '#fbeedd' },
    lines: ['Drink water, wear a hat, and never race a Kidcrag.', 'The oasis is older than the town. We just moved in.'] },
  { id: 'cogsworth', name: 'Cogsworth', theme: 'cog', els: ['gear', 'spark'], lv: [52, 63], seed: 83,
    champ: 'Champion Tink', look: { skin: '#f1c9a8', hair: '#b4572e', shirt: '#d9b26a', pants: '#6f7c90' },
    lines: ['Tick, tock. The whole town runs on one big clock.', 'If you hear clanking, that\'s just a Gearpup saying hello.'] },
  { id: 'frostpeak', name: 'Frostpeak', theme: 'frost', els: ['stone', 'water', 'spark'], lv: [62, 76], seed: 97,
    champ: 'Champion Yuki', look: { skin: '#f6d2b8', hair: '#efe7da', shirt: '#a9d3e6', pants: '#6f8fae', hat: '#e88c7d' },
    lines: ['Cocoa is free at the lodge. Mittens are not.', 'Yaklings keep us warm in winter. They don\'t mind.'] },
  { id: 'starfall', name: 'Starfall Summit', theme: 'sky', els: null, lv: [75, 92], seed: 101,
    champ: 'Champion Astra', look: { skin: '#f6d2b8', hair: '#f6d36b', shirt: '#cdbfee', pants: '#fffaf0' },
    lines: ['Up here, the stars feel close enough to catch.', 'Only the strongest teams make it to the summit. Welcome.'] },
];

// Crests, one per town champion. Crestville's (index 0) comes from Tamer Rowan in Hollow Grove.
const TOWN_CRESTS = [
  { name: 'Meadow Crest', color: '#9cc485' }, { name: 'Willow Crest', color: '#8fcbd9' }, { name: 'Petal Crest', color: '#fbd25a' },
  { name: 'Forge Crest', color: '#e88c7d' }, { name: 'Tide Crest', color: '#7fc4d6' }, { name: 'Mire Crest', color: '#8a9f74' },
  { name: 'Lantern Crest', color: '#9d8ccf' }, { name: 'Dune Crest', color: '#e4c58c' }, { name: 'Gear Crest', color: '#d9b26a' },
  { name: 'Frost Crest', color: '#a9d3e6' }, { name: 'Star Crest', color: '#f6d36b' },
];

const VILLAGER_LOOKS = [
  { skin: '#f6d2b8', hair: '#7a5236', shirt: '#bfaed8', pants: '#6f8fae' },
  { skin: '#d9a77f', hair: '#2f2a26', shirt: '#a8cf8e', pants: '#8a7461' },
  { skin: '#f1c9a8', hair: '#d9d2c5', shirt: '#f3b6c8', pants: '#5b4636' },
  { skin: '#e8b892', hair: '#b4572e', shirt: '#f5d886', pants: '#6f7c90' },
];

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function buildTown(def, index) {
  const W = 18, H = 26, rnd = seeded(def.seed);
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || x === W - 1 || y === 0 || y === H - 1 ? 'T' : '.')));
  const set = (x, y, c) => { if (x > 0 && x < W - 1 && y > 0 && y < H - 1) g[y][x] = c; };
  const last = index === TOWN_DEFS.length - 1;

  // Main path from the south gate to the north gate.
  for (let y = 0; y < H; y++) { g[y][8] = '='; g[y][9] = '='; }
  if (last) { g[0][8] = 'T'; g[0][9] = 'T'; }
  // Buildings: Market (left) and Travel Post (right), joined by the plaza path.
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 5; x++) g[y][x] = 'B';
  for (let y = 2; y <= 4; y++) for (let x = 12; x <= 15; x++) g[y][x] = 'B';
  g[5][4] = '='; g[5][13] = '=';
  for (let x = 4; x <= 13; x++) g[6][x] = '=';

  // Water (or lava, or cloud sea) feature and scenery in the middle.
  const pondLeft = rnd() < 0.5;
  const px = pondLeft ? 2 : 12;
  for (let y = 8; y <= 10; y++) for (let x = px; x <= px + 3; x++) g[y][x] = '~';
  for (let x = pondLeft ? 12 : 2, n = 0; n < 4; n++) set(x + n, 9, 'f');

  // Two bands of tall grass on both sides of the path.
  for (const [y0, y1] of [[12, 15], [18, 21]]) {
    for (let y = y0; y <= y1; y++) {
      for (let x = 1; x <= 6; x++) if (rnd() < 0.86) g[y][x] = ',';
      for (let x = 11; x <= 16; x++) if (rnd() < 0.86) g[y][x] = ',';
    }
  }

  // Scatter scenery: obstacles (^) and a few trees, kept away from the path and doors.
  const free = [];
  for (let y = 7; y < H - 2; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && (x < 6 || x > 11) && y !== 16 && y !== 17) free.push([x, y]);
  for (let i = 0; i < 9 && free.length; i++) {
    const [x, y] = free.splice(Math.floor(rnd() * free.length), 1)[0];
    g[y][x] = i < 5 ? '^' : 'T';
  }
  g[23][11] = 'S';

  const look = (i) => VILLAGER_LOOKS[(index + i) % VILLAGER_LOOKS.length];
  const [lo, hi] = def.lv;
  const pool = SPECIES.filter((s) => !def.els || def.els.includes(s.el));
  const pick = (r) => pool[Math.floor(r() * pool.length)].id;
  const team = (n, lvl, r) => Array.from({ length: n }, () => [pick(r), lvl]);
  const tr = seeded(def.seed * 7);

  return {
    name: def.name, theme: def.theme, music: THEMES[def.theme].music, town: true,
    tiles: g.map((row) => row.join('')),
    buildings: [
      { x: 2, y: 2, w: 4, h: 3, door: [4, 4], roof: THEMES[def.theme].canopy[0], label: 'Market', action: 'market' },
      { x: 12, y: 2, w: 4, h: 3, door: [13, 4], roof: '#e88c7d', label: 'Travel', action: 'travel' },
    ],
    signs: { '11,23': `Welcome to ${def.name}! ${last ? 'This is the summit. The sky ends here.' : `North: the road onward. Beat ${def.champ} to open the gate.`}` },
    npcs: [
      { id: `${def.id}-v1`, x: 6, y: 7, dir: 'down', look: 'v', lookObj: look(0), name: 'Villager', lines: [def.lines[0]] },
      { id: `${def.id}-v2`, x: 14, y: 16, dir: 'left', look: 'v', lookObj: look(1), name: 'Villager', lines: [def.lines[1]] },
      { id: `${def.id}-t1`, x: 6, y: 13, dir: 'right', look: 'v', lookObj: look(2), name: 'Wanderer',
        trainer: { team: team(3, lo + 1, tr), coins: 30 + lo * 6, before: 'You look strong. Let\'s see your lineup!', after: 'Good battle. Good luck with the Champion!' } },
      { id: `${def.id}-t2`, x: 11, y: 19, dir: 'left', look: 'v', lookObj: look(3), name: 'Ranger',
        trainer: { team: team(4, Math.round((lo + hi) / 2), tr), coins: 40 + lo * 7, before: 'These parts are wild. Are you ready?', after: 'The grass here hides some rare ones.' } },
      { id: `${def.id}-champ`, x: 7, y: 3, dir: 'right', look: 'v', lookObj: def.look, name: def.champ, boss: true,
        trainer: { team: team(5, hi, tr), coins: 150 + hi * 12, crest: index + 1, quality: 0.6,
          before: `I'm ${def.champ}, and this is ${def.name}. Show me what you and your team can do!`,
          after: `You've earned the ${TOWN_CRESTS[index + 1].name}. ${last ? 'You are a true Crestville legend.' : 'The road north is open.'}` } },
    ],
    exits: [
      ...(last ? [] : [8, 9].map((x) => ({ x, y: 0, to: TOWN_DEFS[index + 1].id, tx: x, ty: H - 2, need: index + 2 }))),
      ...[8, 9].map((x) => (index === 0 ? { x, y: H - 1, to: 'grove', tx: x - 1, ty: 1 } : { x, y: H - 1, to: TOWN_DEFS[index - 1].id, tx: x, ty: 1 })),
    ],
    wild: { min: lo, max: hi, pack: 3, els: def.els },
    start: [13, 5],
  };
}

TOWN_DEFS.forEach((def, i) => { MAPS[def.id] = buildTown(def, i); });

// The grove now opens north to Willowmere once Rowan's crest is earned.
MAPS.grove.tiles[0] = 'TTTTTTT==TTTTTTT';
MAPS.grove.tiles[1] = 'TTTT..S==...TTTT';
MAPS.grove.signs = { '6,1': 'North: Willowmere. Tamer Rowan\'s Meadow Crest opens the way.' };
MAPS.grove.exits.push({ x: 7, y: 0, to: 'willowmere', tx: 8, ty: 24, need: 1 }, { x: 8, y: 0, to: 'willowmere', tx: 9, ty: 24, need: 1 });
for (const id of ['town', 'route', 'grove']) { MAPS[id].theme = 'meadow'; MAPS[id].music = 'meadow'; }
MAPS.town.town = true;
// Crestville's coach driver offers fast travel.
MAPS.town.npcs.push({ id: 'coach', x: 10, y: 7, dir: 'down', look: 'v', lookObj: { skin: '#e8b892', hair: '#7a5236', shirt: '#e88c7d', pants: '#5b4636', hat: '#5b4636' }, name: 'Coach Driver Bea', action: 'travel' });
