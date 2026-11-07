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
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// How much of each kind of scenery a theme gets.
const LAYOUT = {
  willow: { water: 2, groves: 3, deco: 5, flowers: 3 }, sunpetal: { water: 1, groves: 2, deco: 5, flowers: 6 },
  ember: { water: 2, groves: 2, deco: 7, flowers: 1 }, harbor: { water: 3, groves: 2, deco: 6, flowers: 2 },
  swamp: { water: 3, groves: 4, deco: 6, flowers: 2 }, lantern: { water: 1, groves: 4, deco: 7, flowers: 2 },
  desert: { water: 1, groves: 2, deco: 8, flowers: 1 }, cog: { water: 1, groves: 3, deco: 8, flowers: 1 },
  frost: { water: 1, groves: 5, deco: 6, flowers: 1 }, sky: { water: 4, groves: 2, deco: 5, flowers: 3 },
};
const SIDES = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DIR_NAME = { N: 'North', S: 'South', E: 'East', W: 'West' };
const FACE = { '1,0': 'right', '-1,0': 'left', '0,1': 'down', '0,-1': 'up' };

function gateOn(side, W, H, r) {
  if (side === 'N' || side === 'S') {
    const x = 3 + Math.floor(r() * (W - 7)), y = side === 'N' ? 0 : H - 1, iy = side === 'N' ? 1 : H - 2;
    return { side, cells: [[x, y], [x + 1, y]], inside: [[x, iy], [x + 1, iy]] };
  }
  const y = 3 + Math.floor(r() * (H - 7)), x = side === 'W' ? 0 : W - 1, ix = side === 'W' ? 1 : W - 2;
  return { side, cells: [[x, y], [x, y + 1]], inside: [[ix, y], [ix, y + 1]] };
}

// Lays out one town at random, then checks every road, door, person and patch of grass
// can be reached. Returns null when a layout doesn't work, so the caller tries again.
function layoutTown(def, index, r, entrySide, exitSide) {
  const W = 18 + Math.floor(r() * 6), H = 20 + Math.floor(r() * 8);
  const L = LAYOUT[def.theme];
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 'T' : '.')));
  const inMap = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const at = (x, y) => (g[y] ? g[y][x] : undefined);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const entry = gateOn(entrySide, W, H, r);
  const exit = exitSide ? gateOn(exitSide, W, H, r) : null;
  for (const gt of [entry, exit]) if (gt) for (const [x, y] of gt.cells) g[y][x] = '=';
  const nearGate = (x, y, d) => [entry, exit].some((gt) => gt && gt.inside.some(([gx, gy]) => Math.abs(gx - x) <= d && Math.abs(gy - y) <= d));

  // Two buildings: Market and Travel Post.
  const buildings = [];
  for (const [label, action, roof] of [['Market', 'market', THEMES[def.theme].canopy[0]], ['Travel', 'travel', '#e88c7d']]) {
    let placed = false;
    for (let t = 0; t < 80 && !placed; t++) {
      const bx = ri(2, W - 6), by = ri(2, H - 6);
      let ok = true;
      for (let y = by - 1; y <= by + 4 && ok; y++) for (let x = bx - 1; x <= bx + 4 && ok; x++) if (!inMap(x, y) || at(x, y) !== '.' || nearGate(x, y, 3)) ok = false;
      if (!ok) continue;
      for (let y = by; y < by + 3; y++) for (let x = bx; x < bx + 4; x++) g[y][x] = 'B';
      const door = [bx + ri(1, 2), by + 2];
      buildings.push({ x: bx, y: by, w: 4, h: 3, door, front: [door[0], by + 3], roof, label, action });
      placed = true;
    }
    if (!placed) return null;
  }

  // Roads: entrance → plaza → exit (2 wide), and a lane to each door.
  const road = (a, b, wide) => {
    const [x0, y0] = a, [x1, y1] = b;
    const pts = [];
    const hFirst = r() < 0.5;
    const corner = hFirst ? [x1, y0] : [x0, y1];
    const seg = ([ax, ay], [bx, by]) => {
      const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
      let x = ax, y = ay;
      pts.push([x, y, dx !== 0]);
      while (x !== bx || y !== by) { x += dx; y += dy; pts.push([x, y, dx !== 0]); }
    };
    seg(a, corner); seg(corner, b);
    for (const [x, y, horiz] of pts) {
      if (inMap(x, y) && at(x, y) !== 'B') g[y][x] = '=';
      if (wide) { const nx = horiz ? x : x + 1, ny = horiz ? y + 1 : y; if (inMap(nx, ny) && at(nx, ny) === '.') g[ny][nx] = '='; }
    }
  };
  const plaza = [ri(Math.floor(W * 0.35), Math.floor(W * 0.6)), ri(Math.floor(H * 0.35), Math.floor(H * 0.6))];
  road(entry.inside[0], plaza, true);
  if (exit) road(plaza, exit.inside[0], true);
  for (const b of buildings) road(b.front, plaza, false);

  const roadNear = (x, y, d) => { for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (at(xx, yy) === '=') return true; return false; };
  const fits = (x0, y0, w, h, pred) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!inMap(x, y) || !pred(x, y)) return false; return true; };

  // Water (or lava, or cloud sea).
  for (let i = 0; i < L.water; i++) for (let t = 0; t < 40; t++) {
    const w = ri(2, 5), h = ri(2, 3), x0 = ri(1, W - w - 1), y0 = ri(1, H - h - 1);
    if (!fits(x0, y0, w, h, (x, y) => at(x, y) === '.' && !roadNear(x, y, 1) && !nearGate(x, y, 2))) continue;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!((y === y0 || y === y0 + h - 1) && (x === x0 || x === x0 + w - 1) && r() < 0.5)) g[y][x] = '~';
    break;
  }
  // Tall grass patches.
  const patches = ri(4, 6);
  for (let i = 0; i < patches; i++) for (let t = 0; t < 40; t++) {
    const w = ri(3, 6), h = ri(3, 5), x0 = ri(1, W - w - 1), y0 = ri(1, H - h - 1);
    if (!fits(x0, y0, w, h, (x, y) => at(x, y) === '.' || at(x, y) === ',')) continue;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (r() < 0.88 && !nearGate(x, y, 1)) g[y][x] = ',';
    break;
  }
  // Flowers, tree groves and scenery, kept off the roadside so paths stay clear.
  for (let i = 0; i < L.flowers; i++) { const x = ri(1, W - 2), y = ri(1, H - 2); for (let k = 0; k < 3; k++) if (at(x + k, y) === '.') g[y][x + k] = 'f'; }
  for (let i = 0; i < L.groves; i++) {
    let x = ri(2, W - 3), y = ri(2, H - 3);
    for (let k = ri(2, 5); k > 0; k--) {
      if (at(x, y) === '.' && !roadNear(x, y, 1) && !nearGate(x, y, 2)) g[y][x] = 'T';
      x += ri(-1, 1); y += ri(-1, 1);
    }
  }
  for (let i = 0; i < L.deco; i++) for (let t = 0; t < 20; t++) {
    const x = ri(1, W - 2), y = ri(1, H - 2);
    if (at(x, y) === '.' && !roadNear(x, y, 1) && !nearGate(x, y, 2)) { g[y][x] = '^'; break; }
  }

  // Sign by the entrance.
  let sign = null;
  for (let t = 0; t < 60 && !sign; t++) {
    const [ix, iy] = entry.inside[0];
    const x = ix + ri(-3, 3), y = iy + ri(-3, 3);
    if (at(x, y) === '.' && roadNear(x, y, 1) && !nearGate(x, y, 0)) { g[y][x] = 'S'; sign = [x, y]; }
  }

  const blocked = (x, y) => 'T~#BS^'.includes(at(x, y) || 'T');
  const npcs = [];
  const taken = (x, y) => npcs.some((n) => Math.abs(n.x - x) + Math.abs(n.y - y) < 3) || buildings.some((b) => b.front[0] === x && b.front[1] === y);
  // Someone standing next to the road, facing it, who will see you pass.
  const lookout = (pred, maxReach) => {
    for (let t = 0; t < 400; t++) {
      const x = ri(1, W - 2), y = ri(1, H - 2);
      if (blocked(x, y) || at(x, y) === '=' || taken(x, y) || nearGate(x, y, 1) || !pred(x, y)) continue;
      for (const [dx, dy] of Object.values(SIDES).sort(() => r() - 0.5)) {
        for (let k = 1; k <= maxReach; k++) {
          const cx = x + dx * k, cy = y + dy * k;
          if (blocked(cx, cy)) break;
          if (at(cx, cy) === '=') return { x, y, dir: FACE[`${dx},${dy}`] };
        }
      }
    }
    return null;
  };
  const exitPt = exit ? exit.inside[0] : plaza;
  const champSpot = lookout((x, y) => Math.abs(x - exitPt[0]) + Math.abs(y - exitPt[1]) <= 5, 1) || lookout(() => true, 1);
  const t1 = lookout((x, y) => at(x, y) === ',', 4);
  const t2 = t1 && lookout((x, y) => at(x, y) === ',' && Math.abs(x - t1.x) + Math.abs(y - t1.y) > 6, 4);
  const v1 = lookout(() => true, 1);
  const v2 = v1 && lookout(() => true, 2);
  if (!champSpot || !t1 || !t2 || !v1 || !v2) return null;

  const look = (i) => VILLAGER_LOOKS[(index + i) % VILLAGER_LOOKS.length];
  const [lo, hi] = def.lv;
  const pool = SPECIES.filter((s) => !def.els || def.els.includes(s.el));
  const pick = () => pool[Math.floor(r() * pool.length)].id;
  const team = (n, lvl) => Array.from({ length: n }, () => [pick(), lvl]);
  const last = !exit;
  const mid = Math.round((lo + hi) / 2);
  npcs.push(
    { id: `${def.id}-v1`, ...v1, look: 'v', lookObj: look(0), name: 'Villager', lines: [def.lines[0]] },
    { id: `${def.id}-v2`, ...v2, look: 'v', lookObj: look(1), name: 'Villager', lines: [def.lines[1]] },
    { id: `${def.id}-t1`, ...t1, look: 'v', lookObj: look(2), name: 'Wanderer',
      trainer: { team: team(3, lo + 2), coins: 30 + lo * 6, before: 'You look strong. Let\'s see your lineup!', after: 'Good battle. Good luck with the Champion!' } },
    { id: `${def.id}-t2`, ...t2, look: 'v', lookObj: look(3), name: 'Ranger',
      trainer: { team: team(4, mid), coins: 40 + lo * 7, before: 'These parts are wild. Are you ready?', after: 'The grass nearer the far gate hides tougher creatures.' } },
    { id: `${def.id}-champ`, ...champSpot, look: 'v', lookObj: def.look, name: def.champ, boss: true,
      trainer: { team: team(5, hi), coins: 150 + hi * 12, crest: index + 1, quality: 0.6,
        before: `I'm ${def.champ}, and this is ${def.name}. Show me what you and your team can do!`,
        after: `You've earned the ${TOWN_CRESTS[index + 1].name}. ${last ? 'You are a true Crestville legend.' : 'The road onward is open.'}` } },
  );

  // Everything important must be reachable from the entrance.
  const npcAtXY = (x, y) => npcs.some((n) => n.x === x && n.y === y);
  const walk = (x, y) => at(x, y) !== undefined && !blocked(x, y) && !npcAtXY(x, y);
  const seen = new Set([entry.inside[0].join(',')]);
  const q = [entry.inside[0]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of Object.values(SIDES)) { const k = `${x + dx},${y + dy}`; if (!seen.has(k) && walk(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } }
  }
  const reach = ([x, y]) => seen.has(`${x},${y}`);
  const besideReach = (x, y) => Object.values(SIDES).some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
  if (exit && !exit.cells.every(reach)) return null;
  if (!entry.cells.every(reach)) return null;
  if (!buildings.every((b) => reach(b.front))) return null;
  if (!npcs.every((n) => besideReach(n.x, n.y))) return null;
  if (sign && !besideReach(sign[0], sign[1])) return null;
  // Close off any pockets you couldn't walk into anyway.
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (walk(x, y) && !seen.has(`${x},${y}`)) g[y][x] = 'T';
  let grass = 0;
  for (const row of g) for (const c of row) if (c === ',') grass++;
  if (grass < 18) return null;

  const travel = buildings.find((b) => b.action === 'travel');
  const where = exit ? `${DIR_NAME[exit.side]}: the road onward. Beat ${def.champ} to open the gate.` : 'This is the summit. The sky ends here.';
  return {
    name: def.name, theme: def.theme, music: THEMES[def.theme].music, town: true,
    tiles: g.map((row) => row.join('')),
    buildings: buildings.map(({ front, ...b }) => b),
    signs: sign ? { [`${sign[0]},${sign[1]}`]: `Welcome to ${def.name}! Wild creatures here are Lv ${lo}-${hi}, getting stronger toward the far gate. ${where}` } : {},
    npcs, exits: [], entry, exit,
    entryPt: entry.inside[0], exitPt: exit ? exit.inside[0] : plaza,
    wild: { min: lo, max: hi, pack: 3, els: def.els },
    start: travel ? [travel.door[0], travel.door[1] + 1] : entry.inside[0],
  };
}

// Builds the 10 towns for this save. Same seed, same world; a new game gets a new one.
function buildWorld(seed) {
  const pickSide = (r, not) => {
    const opts = [['N', 3], ['E', 2], ['W', 2], ['S', 1]].filter(([s]) => s !== not);
    let roll = r() * opts.reduce((a, [, w]) => a + w, 0);
    for (const [s, w] of opts) { roll -= w; if (roll <= 0) return s; }
    return opts[0][0];
  };
  const pr = seeded(seed);
  let entrySide = 'S';
  const towns = [];
  TOWN_DEFS.forEach((def, i) => {
    const exitSide = i === TOWN_DEFS.length - 1 ? null : pickSide(pr, entrySide);
    let m = null;
    for (let attempt = 0; !m && attempt < 200; attempt++) m = layoutTown(def, i, seeded(seed * 31 + def.seed * 1013 + attempt * 7919), entrySide, exitSide);
    towns.push(m);
    entrySide = exitSide && OPPOSITE[exitSide];
  });
  towns.forEach((m, i) => {
    const prevCells = i === 0 ? [[7, 1], [8, 1]] : towns[i - 1].exit.inside;
    const prevId = i === 0 ? 'grove' : TOWN_DEFS[i - 1].id;
    m.entry.cells.forEach(([x, y], k) => m.exits.push({ x, y, to: prevId, tx: prevCells[k][0], ty: prevCells[k][1] }));
    if (m.exit) m.exit.cells.forEach(([x, y], k) => m.exits.push({ x, y, to: TOWN_DEFS[i + 1].id, tx: towns[i + 1].entry.inside[k][0], ty: towns[i + 1].entry.inside[k][1], need: i + 2 }));
    MAPS[TOWN_DEFS[i].id] = m;
  });
  const w = towns[0].entry.inside;
  MAPS.grove.exits = MAPS.grove.exits.filter((e) => e.to !== 'willowmere');
  MAPS.grove.exits.push({ x: 7, y: 0, to: 'willowmere', tx: w[0][0], ty: w[0][1], need: 1 }, { x: 8, y: 0, to: 'willowmere', tx: w[1][0], ty: w[1][1], need: 1 });
}

// The grove now opens north to Willowmere once Rowan's crest is earned.
MAPS.grove.tiles[0] = 'TTTTTTT==TTTTTTT';
MAPS.grove.tiles[1] = 'TTTT..S==...TTTT';
MAPS.grove.signs = { '6,1': 'North: Willowmere. Tamer Rowan\'s Meadow Crest opens the way.' };
for (const id of ['town', 'route', 'grove']) { MAPS[id].theme = 'meadow'; MAPS[id].music = 'meadow'; }
MAPS.town.town = true;
// Crestville's coach driver offers fast travel.
MAPS.town.npcs.push({ id: 'coach', x: 10, y: 7, dir: 'down', look: 'v', lookObj: { skin: '#e8b892', hair: '#7a5236', shirt: '#e88c7d', pants: '#5b4636', hat: '#5b4636' }, name: 'Coach Driver Bea', action: 'travel' });
// A default world so tools and first load always have towns; the game rebuilds it from the save's seed.
buildWorld(20261107);
