// Lineup battles: each side stands in a line. The two front creatures hit each other
// at the same time. When one faints, the next in line steps up. Abilities and traits add twists.

function evoStage(lvl) {
  return lvl >= 25 ? 2 : lvl >= 10 ? 1 : 0;
}

// c: { id, lvl, roll: { a, h } (0-1), traits: [] }
function creatureStats(c) {
  const sp = SPECIES_BY_ID[c.id];
  const [a, h] = sp.base;
  const [ga, gh] = GROWTH[sp.role];
  const roll = c.roll || { a: 0.5, h: 0.5 };
  const traits = c.traits || [];
  const m = (1 + 0.1 * evoStage(c.lvl)) * RARITY[sp.rarity].mult;
  let atk = (a + ga * (c.lvl - 1)) * m * (0.85 + 0.3 * roll.a);
  let hp = (h + gh * (c.lvl - 1)) * m * (0.85 + 0.3 * roll.h);
  if (traits.includes('brave')) atk *= 1.15;
  if (traits.includes('hardy')) hp *= 1.15;
  if (traits.includes('giant')) { hp *= 1.3; atk *= 0.9; }
  if (traits.includes('glass')) { atk *= 1.3; hp *= 0.8; }
  return { atk: Math.max(1, Math.round(atk)), hp: Math.max(1, Math.round(hp)) };
}

function stars(roll) {
  return 1 + Math.round(((roll.a + roll.h) / 2) * 4);
}

// Shared ability pool. t = power tier (1-3), grows when the creature evolves.
const ABILITY = {
  fluff:      { name: 'Cozy Fluff',      trig: 'start',     text: (t) => `Start of battle: gains +${2 * t} HP.`,
                run: (c, u, t) => c.buff(u, 0, 2 * t) },
  bless:      { name: 'Blessing',        trig: 'start',     text: (t) => `Start of battle: gives every other ally +${t} HP.`,
                run: async (c, u, t, o) => { for (const a of [...o.allies]) if (a !== u) await c.buff(a, 0, t); } },
  sparktoss:  { name: 'Spark Toss',      trig: 'start',     text: (t) => `Start of battle: deals ${2 * t} damage to a random foe.`,
                run: (c, u, t, o) => c.damage(u, o.foes[Math.floor(Math.random() * o.foes.length)], 2 * t) },
  warmup:     { name: 'Warm Up',         trig: 'start',     text: (t) => `Start of battle: gains +${t} attack and +${t} HP.`,
                run: (c, u, t) => c.buff(u, t, t) },
  sharefront: { name: 'Share',           trig: 'start',     text: (t) => `Start of battle: gives the front ally +${2 * t} HP.`,
                run: (c, u, t, o) => c.buff(o.allies[0], 0, 2 * t) },
  dust:       { name: 'Sleepy Dust',     trig: 'start',     text: (t) => `Start of battle: lowers the front foe's attack by ${t}.`,
                run: (c, u, t, o) => o.foes[0] && c.buff(o.foes[0], -t, 0) },
  chainzap:   { name: 'Chain Zap',       trig: 'start',     text: (t) => `Start of battle: deals ${t} damage to the two front foes.`,
                run: async (c, u, t, o) => { const [a, b] = o.foes; await c.damage(u, a, t); await c.damage(u, b, t); } },
  rally:      { name: 'Rally',           trig: 'start',     text: (t) => `Start of battle: gives the ally behind it +${t} attack.`,
                run: (c, u, t, o) => c.buff(o.allies[o.allies.indexOf(u) + 1], t, 0) },
  snipeback:  { name: 'Sneak Shot',      trig: 'start',     text: (t) => `Start of battle: deals ${2 * t} damage to the last foe in line.`,
                run: (c, u, t, o) => c.damage(u, o.foes[o.foes.length - 1], 2 * t) },
  armor:      { name: 'Iron Plating',    trig: 'passive',   text: () => 'Blocks the first hit it takes.',
                run: () => {} },
  toughskin:  { name: 'Tough Skin',      trig: 'passive',   text: (t) => `Takes ${t} less damage from every hit.`,
                run: () => {} },
  splashback: { name: 'Splashback',      trig: 'hurt',      text: (t) => `When hurt: gains +${t} attack.`,
                run: (c, u, t) => c.buff(u, t, 0) },
  thorns:     { name: 'Thorny',          trig: 'hurt',      text: (t) => `When hurt by a foe: deals ${t} damage back.`,
                run: (c, u, t, o) => o.extra.src && o.extra.src.side !== u.side && c.damage(u, o.extra.src, t) },
  bounce:     { name: 'Bounce Back',     trig: 'hurt',      text: (t) => `When hurt: heals ${t} HP.`,
                run: (c, u, t) => c.buff(u, 0, t) },
  prickly:    { name: 'Prickly Goodbye', trig: 'faint',     text: (t) => `When it faints: deals ${2 * t} damage to the front foe.`,
                run: (c, u, t, o) => c.damage(u, o.foes[0], 2 * t) },
  lastdrop:   { name: 'Last Gift',       trig: 'faint',     text: (t) => `When it faints: gives the next ally +${t} attack and +${t} HP.`,
                run: (c, u, t, o) => o.allies[o.extra.idx] && c.buff(o.allies[o.extra.idx], t, t) },
  wickpop:    { name: 'Pop!',            trig: 'faint',     text: (t) => `When it faints: deals ${t} damage to every foe.`,
                run: async (c, u, t, o) => { for (const f of [...o.foes]) await c.damage(u, f, t); } },
  spore:      { name: 'Spore Cloud',     trig: 'faint',     text: (t) => `When it faints: gives every ally +${t} attack.`,
                run: async (c, u, t, o) => { for (const a of [...o.allies]) await c.buff(a, t, 0); } },
  ripple:     { name: 'Ripple',          trig: 'attack',    text: (t) => `After attacking: deals ${t} damage to the second foe in line.`,
                run: (c, u, t, o) => c.damage(u, o.foes[1], t) },
  tailbolt:   { name: 'Tail Bolt',       trig: 'attack',    text: (t) => `After attacking: deals ${t} damage to the last foe in line.`,
                run: (c, u, t, o) => c.damage(u, o.foes[o.foes.length - 1], t) },
  whetstone:  { name: 'Sharpen',         trig: 'attack',    text: () => 'After attacking: gains +1 attack.',
                run: (c, u) => c.buff(u, 1, 0) },
  snack:      { name: 'Snack Share',     trig: 'attack',    text: (t) => `After attacking: gives the ally behind it +${t} HP.`,
                run: (c, u, t, o) => c.buff(o.allies[o.allies.indexOf(u) + 1], 0, t) },
  watchful:   { name: 'Watchful',        trig: 'allyFaint', text: (t) => `When an ally faints: gains +${t} attack and +${t} HP.`,
                run: (c, u, t) => c.buff(u, t, t) },
  avenge:     { name: 'Avenger',         trig: 'allyFaint', text: (t) => `When an ally faints: gains +${2 * t} attack.`,
                run: (c, u, t) => c.buff(u, 2 * t, 0) },
};

function abilityKey(c) {
  const list = SPECIES_BY_ID[c.id].abilities;
  return list[Math.min(c.ab || 0, list.length - 1)];
}
function abilityText(key, lvl) {
  return ABILITY[key].text(evoStage(lvl) + 1);
}

// Element team bonus: 3+ of one element gives each of them +1/+1, 5 gives +2/+2.
function elementBonus(team) {
  const counts = {};
  for (const c of team) if (c) { const el = SPECIES_BY_ID[c.id].el; counts[el] = (counts[el] || 0) + 1; }
  const out = {};
  for (const [el, n] of Object.entries(counts)) if (n >= 3) out[el] = n >= 5 ? 2 : 1;
  return out;
}

// team: array of creatures (nulls skipped), index 0 = front.
// ui: optional object of async hooks used to animate the battle.
async function runBattle(allyTeam, enemyTeam, ui = null) {
  let n = 0;
  const make = (c, side, bonus) => {
    const st = creatureStats(c);
    const sp = SPECIES_BY_ID[c.id];
    const b = bonus[sp.el] || 0;
    return {
      key: side + n++, id: c.id, sp, lvl: c.lvl, t: evoStage(c.lvl) + 1, shiny: !!c.shiny,
      atk: st.atk + b, hp: st.hp + b, side, out: false,
      ab: abilityKey(c), traits: c.traits || [], opened: false, blocked: false, stood: false,
    };
  };
  const build = (team, side) => { const list = team.filter(Boolean); const bonus = elementBonus(list); return list.map((c) => make(c, side, bonus)); };
  const B = { ally: build(allyTeam, 'ally'), enemy: build(enemyTeam, 'enemy') };
  const call = async (hook, ...args) => { if (ui && ui[hook]) await ui[hook](...args); };
  const foesOf = (u) => B[u.side === 'ally' ? 'enemy' : 'ally'];
  const has = (u, t) => u.traits.includes(t);

  async function fire(u, extra = {}) {
    const ab = ABILITY[u.ab];
    await call('trigger', u, ab.name);
    await ab.run(ctx, u, u.t, { foes: foesOf(u), allies: B[u.side], extra });
  }
  async function trait(u, key, fn) {
    await call('trigger', u, TRAITS[key].name);
    await fn();
  }

  const ctx = {
    async damage(src, target, amount, tag = '') {
      if (!target || target.out || target.hp <= 0) return;
      if (target.ab === 'armor' && !target.blocked) {
        target.blocked = true;
        await call('trigger', target, 'Blocked!');
        return;
      }
      if (target.ab === 'toughskin') amount -= target.t;
      if (has(target, 'thickfur')) amount -= 1;
      amount = Math.max(1, amount);
      target.hp -= amount;
      await call('damage', target, amount, tag);
      if (target.hp > 0 && ABILITY[target.ab].trig === 'hurt') await fire(target, { src });
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
        if (ABILITY[u.ab].trig === 'faint') await fire(u, { idx });
        for (const a of [...team]) {
          if (a.hp <= 0) continue;
          if (ABILITY[a.ab].trig === 'allyFaint') await fire(a);
          if (has(a, 'vengeful')) await trait(a, 'vengeful', () => ctx.buff(a, 1, 0));
        }
        if (team.length === 1 && has(team[0], 'laststand') && !team[0].stood && team[0].hp > 0) {
          team[0].stood = true;
          await trait(team[0], 'laststand', () => ctx.buff(team[0], 4, 0));
        }
      }
      await call('layout', B);
    }
  }

  function hitFor(src, target) {
    let n = src.atk, tag = '';
    if (ELEMENTS[src.sp.el].beats.includes(target.sp.el)) { n = Math.round(n * 1.3) + (n < 4 ? 1 : 0); tag = 'strong'; }
    if (has(src, 'opener') && !src.opened) { src.opened = true; n += 4; }
    return [n, tag];
  }

  await call('setup', B);

  // Start of battle, alternating sides from the front.
  const order = [];
  for (let i = 0; i < 5; i++) for (const side of ['ally', 'enemy']) if (B[side][i]) order.push(B[side][i]);
  for (const u of order) {
    if (u.out || u.hp <= 0) continue;
    if (ABILITY[u.ab].trig === 'start') await fire(u);
    if (has(u, 'quick')) await trait(u, 'quick', () => ctx.damage(u, foesOf(u)[0], 2));
    if (has(u, 'guardian')) await trait(u, 'guardian', () => ctx.buff(B[u.side][B[u.side].indexOf(u) + 1], 0, 3));
  }
  await resolveFaints();

  for (let round = 0; round < 60 && B.ally.length && B.enemy.length; round++) {
    const a = B.ally[0], e = B.enemy[0];
    const [toE, tagE] = hitFor(a, e);
    const [toA, tagA] = hitFor(e, a);
    await call('clash', a, e);
    await ctx.damage(a, e, toE, tagE);
    await ctx.damage(e, a, toA, tagA);
    for (const u of [a, e]) {
      if (u.hp <= 0) continue;
      if (ABILITY[u.ab].trig === 'attack') await fire(u);
      if (has(u, 'sapling') && u.hp > 0) await trait(u, 'sapling', () => ctx.buff(u, 0, 1));
    }
    await resolveFaints();
  }

  const result = B.ally.length && !B.enemy.length ? 'win' : !B.ally.length && B.enemy.length ? 'lose' : 'draw';
  await call('end', result);
  return result;
}

if (typeof module !== 'undefined') module.exports = { runBattle, creatureStats, evoStage, abilityText, ABILITY };
