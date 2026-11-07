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
  const ch = charmTotals(c);
  atk = atk * (1 + ch.atkPct / 100) + ch.atk;
  hp = hp * (1 + ch.hpPct / 100) + ch.hp;
  return { atk: Math.max(1, Math.round(atk)), hp: Math.max(1, Math.round(hp)) };
}

// Sum of every bonus stat on a creature's equipped charms.
function charmTotals(c) {
  const t = { atk: 0, hp: 0, atkPct: 0, hpPct: 0, opener: 0, lead: 0, thorny: 0, mend: 0, guard: 0, xp: 0, coins: 0 };
  for (const ch of c.charms || []) for (const a of ch.affixes) t[a.k] += a.v;
  return t;
}

// Skill power grows with evolution and every 30 levels.
function tierOf(lvl) {
  return evoStage(lvl) + 1 + Math.floor(lvl / 30);
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

const MAX_LEVEL = 100;
const MAX_SKILLS = 4;
const LEARN_LEVELS = [6, 14, 24, 36, 50, 65, 80, 95];
const SKILL_POOLS = {
  tank: ['fluff', 'bounce', 'toughskin', 'armor', 'splashback', 'thorns', 'sharefront', 'warmup'],
  striker: ['whetstone', 'sparktoss', 'snipeback', 'ripple', 'tailbolt', 'avenge', 'warmup', 'prickly'],
  support: ['bless', 'sharefront', 'snack', 'lastdrop', 'rally', 'watchful', 'bounce', 'spore'],
  trickster: ['dust', 'tailbolt', 'snipeback', 'chainzap', 'wickpop', 'thorns', 'spore', 'ripple'],
  fire: ['sparktoss', 'warmup'], water: ['ripple', 'splashback'], leaf: ['bless', 'spore', 'prickly'],
  spark: ['chainzap', 'tailbolt'], stone: ['toughskin', 'thorns'], shade: ['dust', 'avenge', 'snipeback'], gear: ['armor', 'whetstone'],
};

// Each species learns the same skills at the same levels: [[level, skill], ...]
const LEARNSETS = {};
function learnset(id) {
  if (LEARNSETS[id]) return LEARNSETS[id];
  const sp = SPECIES_BY_ID[id];
  let seed = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const pool = [...new Set([...SKILL_POOLS[sp.el], ...SKILL_POOLS[sp.role]])].filter((k) => !sp.abilities.includes(k));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const order = [...sp.abilities.slice(1), ...pool];
  LEARNSETS[id] = LEARN_LEVELS.slice(0, order.length).map((lvl, i) => [lvl, order[i]]);
  return LEARNSETS[id];
}
// A creature's own learnset: whichever signature skill it didn't start with comes first.
function learnsetFor(id, ab = 0) {
  const sp = SPECIES_BY_ID[id];
  if (ab !== 1 || sp.abilities.length < 2) return learnset(id);
  return learnset(id).map(([l, k]) => [l, k === sp.abilities[1] ? sp.abilities[0] : k]);
}
// Starting skill (rolled) plus everything learned by this level, keeping the newest 4.
function defaultSkills(id, lvl, ab = 0) {
  const sp = SPECIES_BY_ID[id];
  const first = sp.abilities[Math.min(ab, sp.abilities.length - 1)];
  const learned = learnsetFor(id, ab).filter(([l, k]) => l <= lvl && k !== first).map(([, k]) => k);
  return [first, ...learned].slice(-MAX_SKILLS);
}
function skillsOf(c) {
  return c.skills && c.skills.length ? c.skills : defaultSkills(c.id, c.lvl, c.ab || 0);
}
function abilityText(key, lvl) {
  return ABILITY[key].text(tierOf(lvl));
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
async function runBattle(allyTeam, enemyTeam, ui = null, report = null) {
  let n = 0;
  const make = (c, side, bonus) => {
    const st = creatureStats(c);
    const sp = SPECIES_BY_ID[c.id];
    const b = bonus[sp.el] || 0;
    return {
      key: side + n++, id: c.id, sp, lvl: c.lvl, t: tierOf(c.lvl), stage: evoStage(c.lvl), shiny: !!c.shiny,
      atk: st.atk + b, hp: st.hp + b, side, out: false, src: c,
      skills: skillsOf(c), traits: c.traits || [], opened: false, blocked: false, stood: false, ch: charmTotals(c),
    };
  };
  const build = (team, side) => { const list = team.filter(Boolean); const bonus = elementBonus(list); return list.map((c) => make(c, side, bonus)); };
  const B = { ally: build(allyTeam, 'ally'), enemy: build(enemyTeam, 'enemy') };
  const call = async (hook, ...args) => { if (ui && ui[hook]) await ui[hook](...args); };
  const foesOf = (u) => B[u.side === 'ally' ? 'enemy' : 'ally'];
  const has = (u, t) => u.traits.includes(t);
  const knows = (u, k) => u.skills.includes(k);
  const kills = [];
  const dealt = new Map();

  // Fire every skill this creature holds that matches the trigger.
  async function fire(u, trig, extra = {}) {
    for (const key of u.skills) {
      const ab = ABILITY[key];
      if (ab.trig !== trig || (trig !== 'faint' && (u.out || u.hp <= 0))) continue;
      await call('trigger', u, ab.name);
      await ab.run(ctx, u, u.t, { foes: foesOf(u), allies: B[u.side], extra });
    }
  }
  async function trait(u, key, fn) {
    await call('trigger', u, TRAITS[key].name);
    await fn();
  }

  const ctx = {
    async damage(src, target, amount, tag = '') {
      if (!target || target.out || target.hp <= 0) return;
      if (knows(target, 'armor') && !target.blocked) {
        target.blocked = true;
        await call('trigger', target, 'Blocked!');
        return;
      }
      if (knows(target, 'toughskin')) amount -= target.t;
      amount -= target.ch.guard;
      if (has(target, 'thickfur')) amount -= 1;
      amount = Math.max(1, amount);
      const wasUp = target.hp > 0;
      target.hp -= amount;
      if (wasUp && target.hp <= 0 && src && src.side !== target.side) kills.push({ killer: src, victim: target });
      if (src && src.side !== target.side) dealt.set(src, (dealt.get(src) || 0) + amount);
      await call('damage', target, amount, tag);
      if (target.hp > 0) await fire(target, 'hurt', { src });
      if (target.hp > 0 && target.ch.thorny && src && src.side !== target.side && tag !== 'thorn') {
        await call('trigger', target, 'Thorn Charm');
        await ctx.damage(target, src, target.ch.thorny, 'thorn');
      }
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
        await fire(u, 'faint', { idx });
        for (const a of [...team]) {
          if (a.hp <= 0) continue;
          await fire(a, 'allyFaint');
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
    if ((has(src, 'opener') || src.ch.opener) && !src.opened) { src.opened = true; n += (has(src, 'opener') ? 4 : 0) + src.ch.opener; }
    if (src.ch.lead && B[src.side][0] === src) n += src.ch.lead;
    return [n, tag];
  }

  await call('setup', B);

  // Start of battle, alternating sides from the front.
  const order = [];
  for (let i = 0; i < 5; i++) for (const side of ['ally', 'enemy']) if (B[side][i]) order.push(B[side][i]);
  for (const u of order) {
    if (u.out || u.hp <= 0) continue;
    await fire(u, 'start');
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
      await fire(u, 'attack');
      if (u.ch.mend && u.hp > 0) { await call('trigger', u, 'Dewdrop Charm'); await ctx.buff(u, 0, u.ch.mend); }
      if (has(u, 'sapling') && u.hp > 0) await trait(u, 'sapling', () => ctx.buff(u, 0, 1));
    }
    await resolveFaints();
  }

  const result = B.ally.length && !B.enemy.length ? 'win' : !B.ally.length && B.enemy.length ? 'lose' : 'draw';
  if (report) report.kills = kills.map((k) => ({ killer: k.killer.src, killerSide: k.killer.side, victimLvl: k.victim.lvl }));
  if (report) report.damage = [...dealt].map(([u, dmg]) => ({ c: u.src, side: u.side, dmg }));
  await call('end', result);
  return result;
}

if (typeof module !== 'undefined') module.exports = { runBattle, creatureStats, evoStage, abilityText, ABILITY, learnset, defaultSkills };
