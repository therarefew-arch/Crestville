// Top-down overworld drawn on a canvas: tiles, buildings, people, and the follower creature.

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const STEP_TIME = 0.17; // seconds per tile

const World = {
  canvas: null, ctx: null, T: 32, dpr: 1, W: 0, H: 0,
  mapId: null, map: null, bg: null, fg: null,
  player: { x: 0, y: 0, fx: 0, fy: 0, dir: 'down', t: 1, moving: false, walk: 0 },
  follower: { x: 0, y: 0, fx: 0, fy: 0, t: 1 },
  held: null, paused: false, time: 0, bubbles: {},
  hooks: {},
  imgCache: {},
};

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function creatureImage(id, stage, shiny = false) {
  const key = id + stage + (shiny ? 's' : '');
  if (!World.imgCache[key]) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(creatureSVG(SPECIES_BY_ID[id], stage, { shiny }));
    World.imgCache[key] = img;
  }
  return World.imgCache[key];
}

function tileAt(x, y) {
  const row = World.map.tiles[y];
  return row ? row[x] || 'T' : 'T';
}
function npcAt(x, y) {
  return World.map.npcs.find((n) => n.x === x && n.y === y);
}
function doorAt(x, y) {
  return World.map.buildings.find((b) => b.door[0] === x && b.door[1] === y);
}
function isSign(x, y) {
  return World.map.signs[`${x},${y}`] != null;
}
function walkable(x, y) {
  const c = tileAt(x, y);
  if ('T~#BS'.includes(c) || isSign(x, y)) return false;
  return !npcAt(x, y);
}

// ---------- setup ----------
function worldInit(canvas, hooks) {
  World.canvas = canvas;
  World.ctx = canvas.getContext('2d');
  World.hooks = hooks;
  new ResizeObserver(() => worldResize()).observe(canvas.parentElement);
  worldResize();
  let last = performance.now();
  const frame = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    worldUpdate(dt);
    worldDraw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function worldResize() {
  const el = World.canvas.parentElement;
  const w = el.clientWidth, h = el.clientHeight;
  if (!w || !h) return;
  World.dpr = Math.min(3, window.devicePixelRatio || 1);
  World.W = w; World.H = h;
  World.canvas.width = Math.round(w * World.dpr);
  World.canvas.height = Math.round(h * World.dpr);
  World.canvas.style.width = w + 'px';
  World.canvas.style.height = h + 'px';
  const T = Math.max(30, Math.min(48, Math.floor(w / 11)));
  if (T !== World.T || !World.bg) { World.T = T; if (World.map) worldBake(); }
}

function worldLoad(mapId, x, y, dir) {
  World.mapId = mapId;
  World.map = MAPS[mapId];
  const p = World.player;
  p.x = p.fx = x; p.y = p.fy = y; p.t = 1; p.moving = false;
  if (dir) p.dir = dir;
  const f = World.follower;
  f.x = f.fx = x; f.y = f.fy = y; f.t = 1;
  World.bubbles = {};
  for (const n of World.map.npcs) { if (!n.dir0) n.dir0 = n.dir; n.dir = n.dir0; }
  worldBake();
}

// ---------- baked map layers ----------
function worldBake() {
  const { T, dpr, map } = World;
  const w = map.tiles[0].length, h = map.tiles.length;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = w * T * dpr; c.height = h * T * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.lineJoin = 'round'; g.lineCap = 'round';
    return [c, g];
  };
  const [bg, g] = make();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) drawGround(g, tileAt(x, y), x, y, T);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = tileAt(x, y);
    if (c === '#') drawFence(g, x, y, T);
    if (isSign(x, y)) drawSign(g, x, y, T);
  }
  for (const b of map.buildings) drawBuilding(g, b, T);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (tileAt(x, y) === 'T') drawTree(g, x, y, T);
  World.bg = bg;
}

const INK_C = '#5b4636';
const GRASS = '#bcd99c', GRASS_D = '#a3c886', TALL = '#94c07c', TALL_D = '#6f9f5c', PATH = '#eddcb5', PATH_D = '#dcc595';

function drawGround(g, c, x, y, T) {
  const X = x * T, Y = y * T;
  if (c === '~') {
    g.fillStyle = '#9ccfdc'; g.fillRect(X, Y, T, T);
    g.strokeStyle = '#c8e7ee'; g.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const yy = Y + T * (0.3 + 0.4 * i) + hash(x, y + i) * 4, xx = X + T * 0.2 + hash(y, x + i) * T * 0.3;
      g.beginPath(); g.arc(xx, yy, T * 0.16, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    return;
  }
  if (c === '=') {
    g.fillStyle = PATH; g.fillRect(X, Y, T, T);
    g.fillStyle = PATH_D;
    if (hash(x, y) > 0.5) { g.beginPath(); g.ellipse(X + T * hash(y, x), Y + T * 0.6, 2.4, 1.6, 0, 0, 7); g.fill(); }
    return;
  }
  g.fillStyle = GRASS; g.fillRect(X, Y, T, T);
  if (c === ',') {
    g.fillStyle = TALL;
    g.beginPath(); g.roundRect(X + 1, Y + 1, T - 2, T - 2, T * 0.25); g.fill();
    drawBlades(g, X, Y, T, TALL_D);
    return;
  }
  if (hash(x, y) > 0.6) {
    g.strokeStyle = GRASS_D; g.lineWidth = 1.6;
    const bx = X + T * (0.2 + hash(y, x) * 0.6), by = Y + T * (0.3 + hash(x + 3, y) * 0.5);
    g.beginPath(); g.moveTo(bx - 3, by - 4); g.lineTo(bx, by); g.lineTo(bx + 3, by - 4); g.stroke();
  }
  if (c === 'f') {
    const cols = ['#f3a9b6', '#fbe08a', '#fffaf0'];
    for (let i = 0; i < 3; i++) {
      const fx = X + T * (0.2 + 0.3 * i) + hash(x + i, y) * 4, fy = Y + T * (0.3 + hash(x, y + i) * 0.45);
      g.fillStyle = cols[(i + x + y) % 3];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.beginPath(); g.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2, 0, 7); g.fill(); }
      g.fillStyle = '#e9a23b'; g.beginPath(); g.arc(fx, fy, 1.5, 0, 7); g.fill();
    }
  }
}

function drawBlades(g, X, Y, T, color) {
  g.strokeStyle = color; g.lineWidth = 2;
  for (const [bx, by] of [[0.25, 0.45], [0.7, 0.4], [0.45, 0.85], [0.15, 0.95], [0.85, 0.9]]) {
    const px = X + T * bx, py = Y + T * by;
    g.beginPath(); g.moveTo(px - T * 0.12, py - T * 0.18); g.quadraticCurveTo(px - T * 0.04, py - T * 0.04, px, py);
    g.quadraticCurveTo(px + T * 0.04, py - T * 0.04, px + T * 0.12, py - T * 0.18); g.stroke();
    g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - T * 0.24); g.stroke();
  }
}

function drawTree(g, x, y, T) {
  const cx = x * T + T / 2, cy = y * T + T / 2;
  g.fillStyle = 'rgba(91,70,54,.15)';
  g.beginPath(); g.ellipse(cx, cy + T * 0.38, T * 0.38, T * 0.12, 0, 0, 7); g.fill();
  g.fillStyle = '#a07a55'; g.strokeStyle = INK_C; g.lineWidth = 2;
  g.beginPath(); g.roundRect(cx - T * 0.08, cy + T * 0.05, T * 0.16, T * 0.33, 3); g.fill(); g.stroke();
  const shade = hash(x, y) > 0.5 ? '#86b56f' : '#7aaa66';
  g.fillStyle = shade;
  g.beginPath(); g.arc(cx, cy - T * 0.12, T * 0.46, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,250,240,.25)';
  g.beginPath(); g.arc(cx - T * 0.15, cy - T * 0.3, T * 0.15, 0, 7); g.fill();
  if (hash(y, x) > 0.75) { g.fillStyle = '#f39c94'; g.beginPath(); g.arc(cx + T * 0.18, cy - T * 0.05, 2.6, 0, 7); g.fill(); }
}

function drawFence(g, x, y, T) {
  const X = x * T, Y = y * T;
  g.fillStyle = '#dcb98c'; g.strokeStyle = INK_C; g.lineWidth = 1.8;
  g.beginPath(); g.roundRect(X + T * 0.38, Y + T * 0.05, T * 0.24, T * 0.9, 3); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(X + T * 0.3, Y + T * 0.3, T * 0.4, T * 0.12, 2); g.fill(); g.stroke();
}

function drawSign(g, x, y, T) {
  const X = x * T, Y = y * T;
  g.fillStyle = '#a07a55'; g.strokeStyle = INK_C; g.lineWidth = 2;
  g.beginPath(); g.roundRect(X + T * 0.44, Y + T * 0.45, T * 0.12, T * 0.45, 2); g.fill(); g.stroke();
  g.fillStyle = '#ecd2a6';
  g.beginPath(); g.roundRect(X + T * 0.15, Y + T * 0.15, T * 0.7, T * 0.4, 4); g.fill(); g.stroke();
  g.strokeStyle = '#b8996e'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(X + T * 0.27, Y + T * 0.3); g.lineTo(X + T * 0.73, Y + T * 0.3); g.moveTo(X + T * 0.27, Y + T * 0.41); g.lineTo(X + T * 0.6, Y + T * 0.41); g.stroke();
}

function drawBuilding(g, b, T) {
  const X = b.x * T, Y = b.y * T, W = b.w * T, H = b.h * T;
  g.strokeStyle = INK_C; g.lineWidth = 2.4;
  g.fillStyle = 'rgba(91,70,54,.15)';
  g.beginPath(); g.ellipse(X + W / 2, Y + H, W * 0.52, T * 0.18, 0, 0, 7); g.fill();
  // walls
  const wallTop = Y + H * 0.42;
  g.fillStyle = '#fff4dc';
  g.beginPath(); g.roundRect(X + T * 0.15, wallTop, W - T * 0.3, Y + H - wallTop - T * 0.05, 6); g.fill(); g.stroke();
  // roof
  g.fillStyle = b.roof;
  g.beginPath();
  g.moveTo(X - T * 0.05, wallTop + T * 0.15);
  g.lineTo(X + W * 0.18, Y + T * 0.12);
  g.quadraticCurveTo(X + W / 2, Y - T * 0.08, X + W * 0.82, Y + T * 0.12);
  g.lineTo(X + W + T * 0.05, wallTop + T * 0.15);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(91,70,54,.25)'; g.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) { const yy = Y + T * 0.12 + (wallTop - Y) * (i / 4); g.beginPath(); g.moveTo(X + W * 0.12, yy); g.lineTo(X + W * 0.88, yy); g.stroke(); }
  g.strokeStyle = INK_C; g.lineWidth = 2.4;
  // door
  const dx = b.door[0] * T + T * 0.22, dy = b.door[1] * T + T * 0.12;
  g.fillStyle = '#b48760';
  g.beginPath(); g.roundRect(dx, dy, T * 0.56, T * 0.83, [T * 0.28, T * 0.28, 2, 2]); g.fill(); g.stroke();
  g.fillStyle = '#f6d36b'; g.beginPath(); g.arc(dx + T * 0.44, dy + T * 0.48, 2, 0, 7); g.fill();
  // windows
  for (let i = 0; i < b.w; i++) {
    const wx = (b.x + i) * T;
    if (b.x + i === b.door[0]) continue;
    g.fillStyle = '#c8e7ee';
    g.beginPath(); g.roundRect(wx + T * 0.25, Y + H - T * 0.82, T * 0.5, T * 0.42, 4); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(wx + T * 0.5, Y + H - T * 0.82); g.lineTo(wx + T * 0.5, Y + H - T * 0.4); g.stroke();
  }
  // label
  g.font = `600 ${Math.round(T * 0.36)}px Fredoka, Nunito, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(b.label).width + T * 0.4;
  const ly = wallTop + T * 0.32;
  g.fillStyle = '#fffaf0';
  g.beginPath(); g.roundRect(X + W / 2 - tw / 2, ly - T * 0.24, tw, T * 0.48, T * 0.24); g.fill(); g.lineWidth = 2; g.stroke();
  g.fillStyle = INK_C; g.fillText(b.label, X + W / 2, ly + 1);
}

// ---------- people ----------
function drawPerson(g, cx, cy, look, dir, walk, T) {
  const s = T / 32;
  const bob = Math.sin(walk * Math.PI * 2) * 1.2 * s;
  g.lineWidth = 2 * s; g.strokeStyle = INK_C;
  g.fillStyle = 'rgba(91,70,54,.18)';
  g.beginPath(); g.ellipse(cx, cy + 13 * s, 9 * s, 3 * s, 0, 0, 7); g.fill();
  // legs
  const leg = Math.sin(walk * Math.PI * 2) * 2.5 * s;
  g.fillStyle = look.pants;
  g.beginPath(); g.roundRect(cx - 6 * s, cy + 3 * s + leg * 0.3, 5 * s, 9 * s - leg * 0.3, 2 * s); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(cx + 1 * s, cy + 3 * s - leg * 0.3, 5 * s, 9 * s + leg * 0.3, 2 * s); g.fill(); g.stroke();
  // body
  g.fillStyle = look.shirt;
  g.beginPath(); g.roundRect(cx - 8 * s, cy - 5 * s + bob, 16 * s, 12 * s, 5 * s); g.fill(); g.stroke();
  // head
  const hy = cy - 12 * s + bob;
  g.fillStyle = look.skin;
  g.beginPath(); g.arc(cx, hy, 9 * s, 0, 7); g.fill(); g.stroke();
  // hair
  g.fillStyle = look.hair;
  g.beginPath();
  if (dir === 'up') g.arc(cx, hy, 9 * s, 0, 7);
  else g.arc(cx, hy - 1 * s, 9 * s, Math.PI * 1.02, Math.PI * 1.98);
  g.fill(); g.stroke();
  if (look.hat) {
    g.fillStyle = look.hat;
    g.beginPath(); g.ellipse(cx, hy - 7 * s, 11 * s, 3 * s, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(cx - 6 * s, hy - 14 * s, 12 * s, 7 * s, 3 * s); g.fill(); g.stroke();
  }
  // face
  if (dir !== 'up') {
    g.fillStyle = '#3b2c24';
    const off = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
    const eyes = dir === 'down' ? [-3.5, 3.5] : [off];
    for (const ex of eyes) { g.beginPath(); g.ellipse(cx + ex * s, hy + 1.5 * s, 1.4 * s, 1.9 * s, 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(243,156,148,.6)';
    if (dir === 'down') { g.beginPath(); g.arc(cx - 6 * s, hy + 4.5 * s, 2 * s, 0, 7); g.arc(cx + 6 * s, hy + 4.5 * s, 2 * s, 0, 7); g.fill(); }
  }
}

function drawBubble(g, cx, cy, text, T) {
  const s = T / 32;
  g.font = `700 ${Math.round(15 * s)}px Fredoka, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fffaf0'; g.strokeStyle = INK_C; g.lineWidth = 2 * s;
  g.beginPath(); g.roundRect(cx - 10 * s, cy - 44 * s, 20 * s, 18 * s, 8 * s); g.fill(); g.stroke();
  g.fillStyle = '#c96f61'; g.fillText(text, cx, cy - 34.5 * s);
}

// ---------- update ----------
function lerp(a, b, t) { return a + (b - a) * t; }
function pos(e) { const t = Math.min(1, e.t); return [lerp(e.fx, e.x, t), lerp(e.fy, e.y, t)]; }

function worldUpdate(dt) {
  World.time += dt;
  const p = World.player, f = World.follower;
  if (p.moving) {
    p.t += dt / STEP_TIME;
    f.t += dt / STEP_TIME;
    p.walk += dt / (STEP_TIME * 2);
    if (p.t >= 1) {
      p.t = 1; p.moving = false;
      World.hooks.onStep && World.hooks.onStep(p.x, p.y);
    }
  }
  if (!p.moving && !World.paused && World.held) tryMove(World.held);
}

function tryMove(dir) {
  const p = World.player, f = World.follower;
  p.dir = dir;
  const [dx, dy] = DIRS[dir];
  const nx = p.x + dx, ny = p.y + dy;
  if (!walkable(nx, ny)) {
    const door = doorAt(nx, ny);
    if (door) { World.held = null; World.hooks.onDoor && World.hooks.onDoor(door); }
    return;
  }
  f.fx = f.x; f.fy = f.y; f.x = p.x; f.y = p.y; f.t = 0;
  p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 0; p.moving = true;
}

function facingTile() {
  const p = World.player;
  const [dx, dy] = DIRS[p.dir];
  return [p.x + dx, p.y + dy];
}

// ---------- draw ----------
function worldDraw() {
  const { ctx: g, W, H, T, dpr, map, bg } = World;
  if (!map || !bg) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#86b56f';
  g.fillRect(0, 0, W, H);
  const mw = map.tiles[0].length * T, mh = map.tiles.length * T;
  const [px, py] = pos(World.player);
  let camX = px * T + T / 2 - W / 2, camY = py * T + T / 2 - H / 2;
  camX = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, camX));
  camY = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, camY));
  camX = Math.round(camX * dpr) / dpr; camY = Math.round(camY * dpr) / dpr;
  g.drawImage(bg, -camX, -camY, mw, mh);
  g.save();
  g.translate(-camX, -camY);
  g.lineJoin = 'round'; g.lineCap = 'round';

  // gather drawables sorted by y
  const items = [];
  for (const n of map.npcs) items.push({ y: n.y, draw: () => drawPerson(g, n.x * T + T / 2, n.y * T + T * 0.45, LOOKS[n.look], n.dir, 0, T), tile: [n.x, n.y], npc: n });
  const lead = World.hooks.leadCreature && World.hooks.leadCreature();
  if (lead) {
    const [fx, fy] = pos(World.follower);
    const same = World.follower.x === World.player.x && World.follower.y === World.player.y && !World.player.moving;
    if (!same || World.player.t < 1) {
      const img = creatureImage(lead.id, evoStage(lead.lvl), lead.shiny);
      const hop = Math.abs(Math.sin(World.time * 5)) * 2;
      items.push({ y: fy - 0.01, draw: () => img.complete && g.drawImage(img, fx * T + T * 0.06, fy * T - hop, T * 0.88, T * 0.88 * 112 / 116), tile: [Math.round(fx), Math.round(fy)] });
    }
  }
  items.push({ y: py, draw: () => drawPerson(g, px * T + T / 2, py * T + T * 0.45, LOOKS.player, World.player.dir, World.player.moving ? World.player.walk : 0, T), tile: [World.player.x, World.player.y] });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    it.draw();
    const [tx, ty] = it.tile;
    if (tileAt(tx, ty) === ',') {
      // tall grass covers feet
      const X = tx * T, Y = ty * T;
      g.save(); g.beginPath(); g.rect(X, Y + T * 0.55, T, T * 0.45); g.clip();
      g.fillStyle = TALL; g.beginPath(); g.roundRect(X + 1, Y + T * 0.55, T - 2, T * 0.44, 6); g.fill();
      drawBlades(g, X, Y + T * 0.15, T, TALL_D);
      g.restore();
    }
    if (it.npc && World.bubbles[it.npc.id]) drawBubble(g, it.npc.x * T + T / 2, it.npc.y * T + T * 0.45, '!', T);
  }
  g.restore();
}
