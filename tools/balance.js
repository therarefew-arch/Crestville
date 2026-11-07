// Checks map data and rough battle balance. Run: node tools/balance.js
const fs = require('fs'), vm = require('vm');
const ctx = { console, Math };
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/battle.js', 'js/maps.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const run = (code) => vm.runInContext(code, ctx);

// Map checks
const maps = run('MAPS');
for (const [id, m] of Object.entries(maps)) {
  const w = m.tiles[0].length;
  m.tiles.forEach((r, i) => { if (r.length !== w) console.log(`!! ${id} row ${i} has length ${r.length}, expected ${w}`); });
  const at = (x, y) => (m.tiles[y] || '')[x];
  for (const n of m.npcs) if ('T~#BS'.includes(at(n.x, n.y))) console.log(`!! ${id} npc ${n.id} on blocked tile`);
  for (const e of m.exits) { const t = maps[e.to]; if ('T~#BS'.includes(t.tiles[e.ty][e.tx])) console.log(`!! ${id} exit lands on blocked tile in ${e.to}`); }
  for (const b of m.buildings) if (at(b.door[0], b.door[1] + 1) === undefined || 'T~#BS'.includes(at(b.door[0], b.door[1] + 1))) console.log(`!! ${id} door ${b.label} not reachable`);
}
console.log('maps ok');

async function rate(team, enemyFn, n = 300) {
  let w = 0;
  for (let i = 0; i < n; i++) if ((await run('runBattle')(team, enemyFn())) === 'win') w++;
  return Math.round((100 * w) / n) + '%';
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const T = (lvl, ids) => ids.map((id) => ({ id, lvl }));
(async () => {
  const route = maps.route.wild, grove = maps.grove.wild;
  const wild = (w, size = 5) => () => Array.from({ length: 1 + Math.floor(Math.random() * Math.min(w.pack, size)) }, () => ({ id: pick(w.pool), lvl: w.min + Math.floor(Math.random() * (w.max - w.min + 1)) }));
  for (const s of ['mossbun', 'puddlepup', 'emberkit']) console.log(`starter ${s} Lv5 vs route wild:`, await rate(T(5, [s]), wild(route, 1)));
  console.log('2x Lv4 vs route wild:', await rate(T(4, ['emberkit', 'mossbun']), wild(route)));
  const tr = (id) => () => maps[id === 'rowan' || id === 'ivy' ? 'grove' : 'route'].npcs.find((n) => n.id === id).trainer.team.map(([id, lvl]) => ({ id, lvl }));
  console.log('3x Lv4 vs Daisy:', await rate(T(4, ['mossbun', 'emberkit', 'driplet']), tr('daisy')));
  console.log('3x Lv5 vs Remy:', await rate(T(5, ['mossbun', 'emberkit', 'driplet']), tr('remy')));
  console.log('4x Lv7 vs grove wild:', await rate(T(7, ['mossbun', 'emberkit', 'driplet', 'thistlet']), wild(grove)));
  console.log('4x Lv7 vs Ivy:', await rate(T(7, ['mossbun', 'emberkit', 'driplet', 'thistlet']), tr('ivy')));
  console.log('5x Lv9 vs Rowan:', await rate(T(9, ['mossbun', 'puddlepup', 'emberkit', 'thistlet', 'fernwhisk']), tr('rowan')));
  console.log('5x Lv11 vs Rowan:', await rate(T(11, ['mossbun', 'puddlepup', 'emberkit', 'thistlet', 'fernwhisk']), tr('rowan')));
})();
