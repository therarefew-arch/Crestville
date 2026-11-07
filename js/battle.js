// Lineup battles: each side stands in a line. The two front creatures hit each other
// at the same time. When one faints, the next in line steps up. Abilities add twists.

function evoStage(lvl) {
  return lvl >= 25 ? 2 : lvl >= 10 ? 1 : 0;
}

function creatureStats(id, lvl) {
  const sp = SPECIES_BY_ID[id];
  const [a, h] = BASE_STATS[id];
  const [ga, gh] = GROWTH[sp.role];
  const m = (1 + 0.1 * evoStage(lvl)) * RARITY[sp.rarity].mult;
  return {
    atk: Math.max(1, Math.round((a + ga * (lvl - 1)) * m)),
    hp: Math.max(1, Math.round((h + gh * (lvl - 1)) * m)),
  };
}

// t = power tier (1-3), grows when the creature evolves.
const ABILITY = {
  mossbun:   { name: 'Cozy Fluff',     trig: 'start',     text: (t) => `Start of battle: gains +${2 * t} HP.`,
               run: (c, u, t) => c.buff(u, 0, 2 * t) },
  thistlet:  { name: 'Prickly Goodbye', trig: 'faint',    text: (t) => `When it faints: deals ${2 * t} damage to the front foe.`,
               run: (c, u, t, o) => c.damage(u, o.foes[0], 2 * t) },
  fernwhisk: { name: 'Fern Blessing',  trig: 'start',     text: (t) => `Start of battle: gives every other ally +${t} HP.`,
               run: async (c, u, t, o) => { for (const a of [...o.allies]) if (a !== u) await c.buff(a, 0, t); } },
  puddlepup: { name: 'Splashback',     trig: 'hurt',      text: (t) => `When hurt: gains +${t} attack.`,
               run: (c, u, t) => c.buff(u, t, 0) },
  driplet:   { name: 'Last Drop',      trig: 'faint',     text: (t) => `When it faints: gives the next ally +${t} attack and +${t} HP.`,
               run: (c, u, t, o) => o.allies[o.extra.idx] && c.buff(o.allies[o.extra.idx], t, t) },
  emberkit:  { name: 'Spark Toss',     trig: 'start',     text: (t) => `Start of battle: deals ${2 * t} damage to a random foe.`,
               run: (c, u, t, o) => c.damage(u, o.foes[Math.floor(Math.random() * o.foes.length)], 2 * t) },
  cindermole:{ name: 'Warm Up',        trig: 'start',     text: (t) => `Start of battle: gains +${t} attack and +${t} HP.`,
               run: (c, u, t) => c.buff(u, t, t) },
  wickling:  { name: 'Wick Pop',       trig: 'faint',     text: (t) => `When it faints: deals ${t} damage to every foe.`,
               run: async (c, u, t, o) => { for (const f of [...o.foes]) await c.damage(u, f, t); } },
  pebbleton: { name: 'Pebble Skin',    trig: 'passive',   text: (t) => `Takes ${t} less damage from every hit.`,
               run: () => {} },
  ripplefox: { name: 'Ripple',         trig: 'attack',    text: (t) => `After attacking: deals ${t} damage to the second foe in line.`,
               run: (c, u, t, o) => c.damage(u, o.foes[1], t) },
  shellby:   { name: 'Shell Share',    trig: 'start',     text: (t) => `Start of battle: gives the front ally +${2 * t} HP.`,
               run: (c, u, t, o) => c.buff(o.allies[0], 0, 2 * t) },
  duskmoth:  { name: 'Dusk Dust',      trig: 'start',     text: (t) => `Start of battle: lowers the front foe's attack by ${t}.`,
               run: (c, u, t, o) => o.foes[0] && c.buff(o.foes[0], -t, 0) },
  hootlet:   { name: 'Watchful',       trig: 'allyFaint', text: (t) => `When an ally faints: gains +${t} attack and +${t} HP.`,
               run: (c, u, t) => c.buff(u, t, t) },
  zappip:    { name: 'Chain Zap',      trig: 'start',     text: (t) => `Start of battle: deals ${t} damage to the two front foes.`,
               run: async (c, u, t, o) => { const [a, b] = o.foes; await c.damage(u, a, t); await c.damage(u, b, t); } },
  voltail:   { name: 'Tail Bolt',      trig: 'attack',    text: (t) => `After attacking: deals ${t} damage to the last foe in line.`,
               run: (c, u, t, o) => c.damage(u, o.foes[o.foes.length - 1], t) },
};

function abilityText(id, lvl) {
  return ABILITY[id].text(evoStage(lvl) + 1);
}

// team: array of { id, lvl } (nulls are skipped), index 0 = front.
// ui: optional object of async hooks used to animate the battle.
async function runBattle(allyTeam, enemyTeam, ui = null) {
  let n = 0;
  const make = (c, side) => {
    const st = creatureStats(c.id, c.lvl);
    return { key: side + n++, id: c.id, sp: SPECIES_BY_ID[c.id], lvl: c.lvl, t: evoStage(c.lvl) + 1, atk: st.atk, hp: st.hp, side, out: false };
  };
  const B = { ally: allyTeam.filter(Boolean).map((c) => make(c, 'ally')), enemy: enemyTeam.filter(Boolean).map((c) => make(c, 'enemy')) };
  const call = async (hook, ...args) => { if (ui && ui[hook]) await ui[hook](...args); };
  const foesOf = (u) => B[u.side === 'ally' ? 'enemy' : 'ally'];

  async function fire(u, extra = {}) {
    const ab = ABILITY[u.id];
    await call('trigger', u, ab.name);
    await ab.run(ctx, u, u.t, { foes: foesOf(u), allies: B[u.side], extra });
  }

  const ctx = {
    async damage(src, target, amount, tag = '') {
      if (!target || target.out || target.hp <= 0) return;
      if (target.id === 'pebbleton') amount -= target.t;
      amount = Math.max(1, amount);
      target.hp -= amount;
      await call('damage', target, amount, tag);
      if (target.hp > 0 && ABILITY[target.id].trig === 'hurt') await fire(target);
    },
    async buff(u, atk, hp) {
      if (!u || u.out || u.hp <= 0) return;
      u.atk = Math.max(1, u.atk + atk);
      u.hp += hp;
      await call('buff', u, atk, hp);
    },
  };

  async function resolveFaints() {
    for (let guard = 0; guard < 50; guard++) {
      const fallen = [...B.ally, ...B.enemy].filter((u) => u.hp <= 0 && !u.out);
      if (!fallen.length) return;
      for (const u of fallen) {
        u.out = true;
        const team = B[u.side];
        const idx = team.indexOf(u);
        team.splice(idx, 1);
        await call('faint', u);
        if (ABILITY[u.id].trig === 'faint') await fire(u, { idx });
        for (const a of [...team]) if (a.hp > 0 && ABILITY[a.id].trig === 'allyFaint') await fire(a);
      }
      await call('layout', B);
    }
  }

  function hitFor(src, target) {
    if (ELEMENTS[src.sp.el].beats.includes(target.sp.el)) return [Math.round(src.atk * 1.3) + (src.atk < 4 ? 1 : 0), 'strong'];
    return [src.atk, ''];
  }

  await call('setup', B);

  // Start-of-battle abilities, alternating sides from the front.
  const starters = [];
  for (let i = 0; i < 5; i++) for (const side of ['ally', 'enemy']) if (B[side][i]) starters.push(B[side][i]);
  for (const u of starters) if (!u.out && u.hp > 0 && ABILITY[u.id].trig === 'start') await fire(u);
  await resolveFaints();

  for (let round = 0; round < 60 && B.ally.length && B.enemy.length; round++) {
    const a = B.ally[0], e = B.enemy[0];
    const [toE, tagE] = hitFor(a, e);
    const [toA, tagA] = hitFor(e, a);
    await call('clash', a, e);
    await ctx.damage(a, e, toE, tagE);
    await ctx.damage(e, a, toA, tagA);
    for (const u of [a, e]) if (u.hp > 0 && ABILITY[u.id].trig === 'attack') await fire(u);
    await resolveFaints();
  }

  const result = B.ally.length && !B.enemy.length ? 'win' : !B.ally.length && B.enemy.length ? 'lose' : 'draw';
  await call('end', result);
  return result;
}

if (typeof module !== 'undefined') module.exports = { runBattle, creatureStats, evoStage, abilityText, ABILITY };
