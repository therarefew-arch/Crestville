// Checks map/creature data and rough battle balance. Run: node tools/balance.js
const fs = require('fs'), vm = require('vm');
const ctx = { console, Math };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/battle.js', 'js/maps.js', 'js/towns.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const run = (code) => vm.runInContext(code, ctx);
const maps = run('MAPS'), SPECIES = run('SPECIES'), ABILITY = run('ABILITY');

// Data checks
const blocked = 'T~#BS';
for (const [id, m] of Object.entries(maps)) {
  const w = m.tiles[0].length;
  m.tiles.forEach((r, i) => { if (r.length !== w) console.log(`!! ${id} row ${i} length ${r.length}, expected ${w}`); });
  const at = (x, y) => (m.tiles[y] || '')[x];
  for (const n of m.npcs) if (blocked.includes(at(n.x, n.y))) console.log(`!! ${id} npc ${n.id} on blocked tile`);
  for (const e of m.exits) if (blocked.includes(maps[e.to].tiles[e.ty][e.tx])) console.log(`!! ${id} exit lands on blocked tile`);
  for (const n of m.npcs) for (const [sid] of (n.trainer ? n.trainer.team : [])) if (!SPECIES.find((s) => s.id === sid)) console.log(`!! unknown species ${sid}`);
}
// Every door, exit, NPC and patch of grass must be reachable from the map's entry points.
for (const [id, m] of Object.entries(maps)) {
  const at = (x, y) => (m.tiles[y] || '')[x];
  const npcAt = (x, y) => m.npcs.some((n) => n.x === x && n.y === y);
  const sign = (x, y) => m.signs[`${x},${y}`] != null;
  const ok = (x, y) => at(x, y) !== undefined && !(blocked + '^').includes(at(x, y)) && !sign(x, y) && !npcAt(x, y);
  const starts = [...(m.start ? [m.start] : []), ...m.exits.map((e) => [e.x, e.y])];
  const seen = new Set(), q = starts.filter(([x, y]) => ok(x, y));
  q.forEach(([x, y]) => seen.add(x + ',' + y));
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && ok(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  const near = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
  for (const b of m.buildings) if (!near(b.door[0], b.door[1])) console.log(`!! ${id}: door ${b.label} unreachable`);
  for (const n of m.npcs) if (!near(n.x, n.y)) console.log(`!! ${id}: npc ${n.id} unreachable`);
  for (const e of m.exits) if (!seen.has(e.x + ',' + e.y)) console.log(`!! ${id}: exit to ${e.to} unreachable`);
  for (const e of m.exits) { const back = maps[e.to].exits.some((b) => b.to === id); if (!back) console.log(`!! ${id}: exit to ${e.to} has no way back`); }
  let grass = 0, lost = 0;
  m.tiles.forEach((r, y) => [...r].forEach((c, x) => { if (c === ',') { grass++; if (!seen.has(x + ',' + y) && !npcAt(x, y)) lost++; } }));
  if (lost) console.log(`!! ${id}: ${lost}/${grass} grass tiles unreachable`);
}
console.log(`maps ok: ${Object.keys(maps).length} maps`);

const ids = new Set();
for (const s of SPECIES) {
  if (ids.has(s.id)) console.log('!! duplicate', s.id);
  ids.add(s.id);
  if (s.names.length !== 3) console.log('!! names', s.id);
  for (const a of s.abilities) if (!ABILITY[a]) console.log('!! unknown ability', a, 'on', s.id);
}
console.log(`data ok: ${SPECIES.length} creatures, ${Object.keys(ABILITY).length} abilities`);

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const mk = (id, lvl) => ({ id, lvl, roll: { a: Math.random(), h: Math.random() }, traits: [], ab: Math.floor(Math.random() * 2) });
const T = (lvl, list) => list.map((id) => mk(id, lvl));
async function rate(teamFn, enemyFn, n = 300) {
  let w = 0;
  for (let i = 0; i < n; i++) if ((await run('runBattle')(teamFn(), enemyFn())) === 'win') w++;
  return Math.round((100 * w) / n) + '%';
}
const wild = (m, size) => () => {
  const w = maps[m].wild, pool = SPECIES.filter((s) => w.regions.includes(s.region));
  return Array.from({ length: 1 + Math.floor(Math.random() * Math.min(w.pack, size)) }, () => mk(pick(pool).id, w.min + Math.floor(Math.random() * (w.max - w.min + 1))));
};
const tr = (m, id) => () => maps[m].npcs.find((n) => n.id === id).trainer.team.map(([s, l]) => ({ id: s, lvl: l, roll: { a: 0.5, h: 0.5 }, traits: [], ab: 0 }));
(async () => {
  for (const s of ['mossbun', 'puddlepup', 'emberkit']) console.log(`starter ${s} Lv5 vs route wild:`, await rate(() => T(5, [s]), wild('route', 1)));
  console.log('3x Lv4 vs Daisy:', await rate(() => T(4, ['mossbun', 'emberkit', 'driplet']), tr('route', 'daisy')));
  console.log('3x Lv6 vs Remy:', await rate(() => T(6, ['mossbun', 'emberkit', 'driplet']), tr('route', 'remy')));
  console.log('4x Lv7 vs grove wild:', await rate(() => T(7, ['mossbun', 'emberkit', 'driplet', 'thistlet']), wild('grove', 4)));
  console.log('4x Lv8 vs Ivy:', await rate(() => T(8, ['mossbun', 'emberkit', 'driplet', 'thistlet']), tr('grove', 'ivy')));
  console.log('5x Lv11 vs Rowan:', await rate(() => T(11, ['mossbun', 'puddlepup', 'emberkit', 'thistlet', 'fernwhisk']), tr('grove', 'rowan')));
  // Each species alone at Lv10 vs every other species at Lv10: win rate, to spot outliers.
  const scores = [];
  for (const a of SPECIES) {
    let w = 0, n = 0;
    for (const b of SPECIES) for (let i = 0; i < 4; i++) { n++; if ((await run('runBattle')([mk(a.id, 10)], [mk(b.id, 10)])) === 'win') w++; }
    scores.push([a.id, Math.round((100 * w) / n)]);
  }
  scores.sort((x, y) => y[1] - x[1]);
  console.log('1v1 strongest:', scores.slice(0, 5).map((s) => s.join(' ')).join(', '));
  console.log('1v1 weakest:', scores.slice(-5).map((s) => s.join(' ')).join(', '));
})();
