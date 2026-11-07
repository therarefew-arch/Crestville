// Auto-battle engine. Pure logic: the UI listens to events it emits.

function evoStage(lvl) {
  return lvl >= 25 ? 2 : lvl >= 10 ? 1 : 0;
}

function creatureStats(id, lvl, bonus = { hp: 1, atk: 1 }) {
  const sp = SPECIES_BY_ID[id];
  const role = ROLES[sp.role];
  const stage = evoStage(lvl);
  const m = (1 + 0.12 * (lvl - 1)) * (1 + 0.1 * stage) * RARITY[sp.rarity].mult;
  return {
    hp: Math.round(60 * role.hp * m * bonus.hp),
    atk: Math.round(10 * role.atk * m * bonus.atk),
    interval: 1.2 / role.spd,
  };
}

// Team bonuses from matching elements and roles. `members` is a list of species ids.
function teamSynergy(members) {
  const els = {}, roles = {};
  for (const id of members) {
    const sp = SPECIES_BY_ID[id];
    els[sp.el] = (els[sp.el] || 0) + 1;
    roles[sp.role] = (roles[sp.role] || 0) + 1;
  }
  const bonus = { hp: 1, atk: 1, regen: 0, labels: [] };
  for (const [el, n] of Object.entries(els)) {
    if (n >= 4) { bonus.atk += 0.3; bonus.hp += 0.2; bonus.labels.push(`${n} ${ELEMENTS[el].name}: +30% attack, +20% HP`); }
    else if (n === 3) { bonus.atk += 0.2; bonus.hp += 0.1; bonus.labels.push(`3 ${ELEMENTS[el].name}: +20% attack, +10% HP`); }
    else if (n === 2) { bonus.atk += 0.1; bonus.labels.push(`2 ${ELEMENTS[el].name}: +10% attack`); }
  }
  if ((roles.tank || 0) >= 2) { bonus.hp += 0.15; bonus.labels.push('2 Tanks: +15% HP'); }
  if ((roles.support || 0) >= 2) { bonus.regen = 0.015; bonus.labels.push('2 Supports: team slowly heals'); }
  if ((roles.striker || 0) >= 2) { bonus.atk += 0.1; bonus.labels.push('2 Strikers: +10% attack'); }
  return bonus;
}

// team: array of 5 entries, each null or { id, lvl }. Index 0-1 = front row, 2-4 = back row.
function buildSide(team, side) {
  const ids = team.filter(Boolean).map((c) => c.id);
  const bonus = teamSynergy(ids);
  const units = [];
  team.forEach((c, slot) => {
    if (!c) return;
    const sp = SPECIES_BY_ID[c.id];
    const st = creatureStats(c.id, c.lvl, bonus);
    units.push({
      sp, lvl: c.lvl, side, slot, front: slot < 2,
      name: sp.names[evoStage(c.lvl)],
      maxHp: st.hp, hp: st.hp, atk: st.atk, interval: st.interval,
      timer: Math.random() * st.interval * 0.6,
      energy: 0, shield: 0, alive: true, regen: bonus.regen,
    });
  });
  return units;
}

class Battle {
  constructor(allies, enemies, onEvent) {
    this.units = [...allies, ...enemies];
    this.onEvent = onEvent || (() => {});
    this.time = 0;
    this.over = false;
    this.winner = null;
    this.limit = 50;
  }

  foes(u) { return this.units.filter((x) => x.alive && x.side !== u.side); }
  friends(u) { return this.units.filter((x) => x.alive && x.side === u.side); }

  pickTarget(u, preferBack = false) {
    const foes = this.foes(u);
    if (!foes.length) return null;
    const row = preferBack ? foes.filter((f) => !f.front) : foes.filter((f) => f.front);
    const pool = row.length ? row : foes;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  hit(src, target, mult, label) {
    let m = mult * (0.9 + Math.random() * 0.2);
    let tag = '';
    if (ELEMENTS[src.sp.el].beats.includes(target.sp.el)) { m *= 1.5; tag = 'strong'; }
    else if (ELEMENTS[target.sp.el].beats.includes(src.sp.el)) { m *= 0.75; tag = 'weak'; }
    let dmg = Math.max(1, Math.round(src.atk * m));
    const absorbed = Math.min(target.shield, dmg);
    target.shield -= absorbed;
    target.hp -= dmg - absorbed;
    this.onEvent({ type: 'hit', src, target, dmg, tag, label });
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      this.onEvent({ type: 'faint', unit: target });
    }
  }

  act(u) {
    if (u.energy >= 100) {
      u.energy = 0;
      const skill = SKILLS[u.sp.role](u.sp.el);
      this.onEvent({ type: 'skill', unit: u, name: skill.name });
      if (u.sp.role === 'tank') {
        u.shield += Math.round(u.maxHp * 0.3);
        this.onEvent({ type: 'shield', unit: u });
      } else if (u.sp.role === 'striker') {
        const t = this.pickTarget(u);
        if (t) this.hit(u, t, 2.3, skill.name);
      } else if (u.sp.role === 'support') {
        const hurt = this.friends(u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (hurt) {
          const amount = Math.round(u.atk * 2.5 + hurt.maxHp * 0.08);
          hurt.hp = Math.min(hurt.maxHp, hurt.hp + amount);
          this.onEvent({ type: 'heal', src: u, target: hurt, amount });
        }
      } else if (u.sp.role === 'trickster') {
        const t = this.pickTarget(u, true);
        if (t) {
          this.hit(u, t, 1.6, skill.name);
          t.energy = Math.max(0, t.energy - 40);
        }
      }
    } else {
      const t = this.pickTarget(u, u.sp.role === 'trickster' && Math.random() < 0.4);
      if (t) {
        this.onEvent({ type: 'attack', unit: u });
        this.hit(u, t, 1, null);
        u.energy = Math.min(100, u.energy + 34);
      }
    }
  }

  step(dt) {
    if (this.over) return;
    this.time += dt;
    for (const u of this.units) {
      if (!u.alive) continue;
      if (u.regen) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * u.regen * dt);
      u.timer += dt;
      if (u.timer >= u.interval) {
        u.timer -= u.interval;
        this.act(u);
        if (this.checkEnd()) return;
      }
    }
    if (this.time >= this.limit) this.finish(this.hpShare('ally') > this.hpShare('enemy') ? 'ally' : 'enemy');
  }

  hpShare(side) {
    const us = this.units.filter((u) => u.side === side);
    return us.reduce((s, u) => s + u.hp, 0) / us.reduce((s, u) => s + u.maxHp, 0);
  }

  checkEnd() {
    const allyAlive = this.units.some((u) => u.side === 'ally' && u.alive);
    const enemyAlive = this.units.some((u) => u.side === 'enemy' && u.alive);
    if (!allyAlive || !enemyAlive) { this.finish(allyAlive ? 'ally' : 'enemy'); return true; }
    return false;
  }

  finish(winner) {
    if (this.over) return;
    this.over = true;
    this.winner = winner;
    this.onEvent({ type: 'end', winner });
  }
}

// Run a whole battle instantly (used for tests and balancing).
function simulate(teamA, teamB) {
  const b = new Battle(buildSide(teamA, 'ally'), buildSide(teamB, 'enemy'));
  while (!b.over) b.step(0.05);
  return b.winner;
}

if (typeof module !== 'undefined') module.exports = { Battle, buildSide, simulate, teamSynergy, creatureStats, evoStage };
