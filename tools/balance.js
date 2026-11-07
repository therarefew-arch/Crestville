// Rough balance check: can a fairly-leveled player team beat each stage?
// Run: node tools/balance.js
const fs = require('fs'), vm = require('vm');
const ctx = { module: undefined, console };
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/battle.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
vm.runInContext(fs.readFileSync('js/main.js', 'utf8').match(/function regionOf[\s\S]*?\n\/\/ ---------- battle view/)[0].replace('// ---------- battle view', ''), ctx);
const team = (lvl) => [{ id: 'mossbun', lvl }, { id: 'puddlepup', lvl }, { id: 'emberkit', lvl }, { id: 'fernwhisk', lvl }, { id: 'thistlet', lvl }];
for (const stage of [1, 3, 5, 8, 10, 15, 20, 30, 40, 50]) {
  const row = [];
  for (const lvl of [Math.round(stage * 0.7), stage, Math.round(stage * 1.2) + 1]) {
    let wins = 0;
    for (let i = 0; i < 200; i++) if (vm.runInContext(`simulate(${JSON.stringify(team(lvl))}, enemyTeam(${stage}))`, ctx) === 'ally') wins++;
    row.push(`Lv${lvl}: ${Math.round(wins / 2)}%`);
  }
  console.log(`stage ${stage}`.padEnd(10), row.join('  '));
}
