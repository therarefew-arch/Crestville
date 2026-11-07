// Crestville: state, overworld events, lineup battles, buildings and menus.

const SAVE_KEY = 'crestville-save-v2';

function newSeed() { return 1 + Math.floor(Math.random() * 1e9); }

function freshState() {
  return {
    name: '', coins: 60, berries: 2, crests: 0,
    roster: [], team: [null, null, null, null, null], nextUid: 1,
    eggCost: 100, trophies: 0, rivals: null, speed: 1, dust: 0, pity: 0, seen: [], visited: ['town'], lastTown: 'town', music: true, sfx: true, bike: false, riding: null, worldSeed: newSeed(), charms: [], nextCid: 1,
    res: { ore: 0, fish: 0, herbs: 0, gems: 0 }, items: { stew: 0, feast: 0 }, jobs: [],
    skills: { mining: { lvl: 1, xp: 0 }, fishing: { lvl: 1, xp: 0 }, foraging: { lvl: 1, xp: 0 }, cooking: { lvl: 1, xp: 0 }, smithing: { lvl: 1, xp: 0 } },
    map: 'town', x: MAPS.town.start[0], y: MAPS.town.start[1], dir: 'down', beaten: {},
  };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return migrate(Object.assign(freshState(), JSON.parse(raw)));
  } catch (e) { /* storage unavailable: start fresh */ }
  return freshState();
}
// Older saves: give creatures random traits, average stars and their first ability.
function migrate(st) {
  for (const c of st.roster) {
    if (!c.roll) c.roll = { a: 0.5, h: 0.5 };
    if (!c.traits) c.traits = rollTraits(SPECIES_BY_ID[c.id]);
    if (c.ab == null) c.ab = 0;
    if (!c.skills) c.skills = defaultSkills(c.id, c.lvl, c.ab);
    c.lvl = Math.min(MAX_LEVEL, c.lvl);
    if (c.shiny == null) c.shiny = false;
  }
  st.roster = st.roster.filter((c) => SPECIES_BY_ID[c.id]);
  if (!st.visited.includes('town')) st.visited.unshift('town');
  if (!st.worldSeed) st.worldSeed = newSeed();
  for (const c of st.roster) if (!c.charms) c.charms = [];
  const fresh = freshState();
  for (const k of ['res', 'items', 'skills']) st[k] = Object.assign(fresh[k], st[k] || {});
  if (!Array.isArray(st.jobs)) st.jobs = [];
  st.team = st.team.map((u) => (st.roster.some((c) => c.uid === u) ? u : null));
  return st;
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}
let S = load();

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function toast(msg) {
  const t = h(`<div class="toast">${msg}</div>`);
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3100);
}
// Numbers roll up instead of just changing, with soft rising ticks.
function countUp(el, from, to, ms = 900, { sound = true, fmt = (v) => v.toLocaleString() } = {}) {
  return new Promise((resolve) => {
    if (!el) return resolve();
    const t0 = performance.now();
    let last = null, lastTick = 0;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (v !== last) {
        el.textContent = fmt(v); last = v;
        if (sound && t - lastTick > 60) { sfx('count', k * 20); lastTick = t; }
      }
      if (k < 1) requestAnimationFrame(step); else { el.textContent = fmt(to); resolve(); }
    };
    requestAnimationFrame(step);
  });
}
// Any element with data-count="to" (and optional data-from, data-delay, data-ms) rolls up.
function animateCounts(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count), from = Number(el.dataset.from || 0);
    el.textContent = from.toLocaleString();
    setTimeout(() => countUp(el, from, to, Number(el.dataset.ms || 800), { sound: el.dataset.quiet == null }).then(() => {
      el.classList.add('counted');
      if (el.dataset.pop != null) { restartClass(el, 'num-pop', 450); }
    }), Number(el.dataset.delay || 0));
  });
}

function restartClass(el, cls, ms) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  clearTimeout(el['_t' + cls]);
  el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms);
}
function crestSVG(r, earned) {
  const fill = earned ? TOWN_CRESTS[r].color : '#efe2c9';
  const star = earned ? '<path d="M12 7 l1.5 3 3.3 .5 -2.4 2.3 .6 3.3 -3 -1.6 -3 1.6 .6 -3.3 -2.4 -2.3 3.3 -.5 Z" fill="#fffaf0"/>' : '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z" fill="${fill}" stroke="#5b4636" stroke-width="1.8" stroke-linejoin="round"/>${star}</svg>`;
}
function elChip(sp) {
  return `<span class="chip"><span class="dot" style="background:${ELEMENTS[sp.el].color}"></span>${ELEMENTS[sp.el].name}</span>`;
}

// ---------- creatures ----------
function byUid(uid) { return S.roster.find((c) => c.uid === uid); }
function nameOf(c) { return SPECIES_BY_ID[c.id].names[evoStage(c.lvl)]; }
function xpNeed(lvl) { return 8 + lvl * 6; }
function teamEntries() { return S.team.map((uid) => (uid != null ? byUid(uid) || null : null)); }
function teamSize() { return S.team.filter((u) => u != null).length; }
function leadCreature() { return teamEntries().find((c) => c && !(World.mount && World.mount.uid === c.uid)) || null; }
function art(c, sp = SPECIES_BY_ID[c.id]) { return creatureSVG(sp, evoStage(c.lvl), { shiny: c.shiny }); }
function starText(c) { const n = stars(c.roll); return '★'.repeat(n) + '<span class="dim">' + '★'.repeat(5 - n) + '</span>'; }

function weightedPick(items, weightOf) {
  let roll = Math.random() * items.reduce((s, x) => s + weightOf(x), 0);
  for (const x of items) { roll -= weightOf(x); if (roll <= 0) return x; }
  return items[items.length - 1];
}

function rollTraits(sp, count) {
  if (count == null) count = Math.min(3, RARITY[sp.rarity].traits + (Math.random() < 0.15 ? 1 : 0));
  const out = [];
  for (let i = 0; i < count; i++) {
    const options = Object.keys(TRAITS).filter((k) => !out.includes(k) && !EXCLUSIVE_TRAITS.some((g) => g.includes(k) && g.some((o) => out.includes(o))));
    out.push(weightedPick(options, (k) => TRAITS[k].weight));
  }
  return out;
}

// A brand-new creature with random stars, traits, ability and a small shiny chance.
function rollCreature(id, lvl, { good = false } = {}) {
  const sp = SPECIES_BY_ID[id];
  const r = () => (good ? 0.65 + Math.random() * 0.35 : Math.random());
  const extra = good && RARITY[sp.rarity].traits < 3 ? 1 : 0;
  const ab = Math.floor(Math.random() * sp.abilities.length);
  return {
    id, lvl, xp: 0,
    roll: { a: Math.round(r() * 100) / 100, h: Math.round(r() * 100) / 100 },
    traits: rollTraits(sp, Math.min(3, RARITY[sp.rarity].traits + extra + (Math.random() < 0.15 ? 1 : 0))),
    ab, skills: defaultSkills(id, lvl, ab),
    shiny: Math.random() < 1 / 128,
  };
}
// Fixed, average creature for trainers and bosses.
function plainCreature(id, lvl) { return { id, lvl, xp: 0, roll: { a: 0.5, h: 0.5 }, traits: [], ab: 0, skills: defaultSkills(id, lvl), shiny: false }; }

// Level-ups and evolutions are collected, then celebrated together after a battle.
const levelUps = new Map(); // uid -> { from, before: stats, learned: [] }
const evoQueue = [];
function announceGrowth(c, oldLvl) {
  if (c.lvl <= oldLvl) return;
  const prev = levelUps.get(c.uid);
  levelUps.set(c.uid, prev || { from: oldLvl, before: creatureStats({ ...c, lvl: oldLvl }), learned: [] });
  const sb = evoStage(oldLvl), sa = evoStage(c.lvl);
  if (sa > sb) evoQueue.push({ uid: c.uid, fromStage: sb, toStage: sa, fromLvl: oldLvl });
}
function addXp(c, xp) {
  if (c.lvl >= MAX_LEVEL) return 0;
  const old = c.lvl;
  c.xp += Math.round(xp * xpMult(c));
  while (c.lvl < MAX_LEVEL && c.xp >= xpNeed(c.lvl)) { c.xp -= xpNeed(c.lvl); c.lvl++; }
  if (c.lvl >= MAX_LEVEL) c.xp = 0;
  afterLevelUp(c, old);
  return c.lvl - old;
}
function setLevel(c, lvl) {
  const old = c.lvl;
  c.lvl = Math.min(MAX_LEVEL, lvl);
  if (c.lvl >= MAX_LEVEL) c.xp = 0;
  afterLevelUp(c, old);
}

// New skills unlock at set levels. With a free slot they're learned right away;
// with 4 already, the player chooses what to forget (or skips it).
const learnQueue = [];
function afterLevelUp(c, old) {
  announceGrowth(c, old);
  for (const [lvl, key] of learnsetFor(c.id, c.ab || 0)) {
    if (lvl <= old || lvl > c.lvl || c.skills.includes(key)) continue;
    if (c.skills.length < MAX_SKILLS) { c.skills.push(key); const rec = levelUps.get(c.uid); if (rec) rec.learned.push(key); else toast(`${esc(nameOf(c))} learned <b>${ABILITY[key].name}</b>!`); }
    else learnQueue.push({ uid: c.uid, key });
  }
}
let celebrating = false;
async function celebrate() {
  if (celebrating) return;
  celebrating = true;
  while (lootQueue.length) await showLoot(lootQueue.shift());
  if (levelUps.size) await showLevelUps();
  while (evoQueue.length) {
    const e = evoQueue.shift();
    const c = byUid(e.uid);
    if (c) await playEvolution(c, e);
  }
  celebrating = false;
  await processLearnQueue();
}

function confettiHTML(n = 26) {
  const cols = ['#e88c7d', '#f6d36b', '#9ccfdc', '#a8cf8e', '#bfaed8', '#f3b6c8'];
  return `<div class="confetti">${Array.from({ length: n }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${(Math.random() * 0.5).toFixed(2)}s;--r:${Math.round(Math.random() * 720 - 360)}deg;--x:${Math.round(Math.random() * 80 - 40)}px"></i>`).join('')}</div>`;
}

function showLevelUps() {
  const entries = [...levelUps.entries()].map(([uid, rec]) => ({ c: byUid(uid), ...rec })).filter((e) => e.c);
  levelUps.clear();
  if (!entries.length) return Promise.resolve();
  sfx('levelup');
  const cards = entries.map((e, i) => {
    const c = e.c, sp = SPECIES_BY_ID[c.id];
    const evolving = evoQueue.some((q) => q.uid === c.uid);
    const shownStage = evolving ? evoStage(e.from) : evoStage(c.lvl);
    const now = creatureStats(c);
    const da = now.atk - e.before.atk, dh = now.hp - e.before.hp;
    const d = 0.25 + i * 0.18;
    return `<div class="lvl-card" style="animation-delay:${d}s">
      <div class="lvl-art" style="animation-delay:${d + 0.2}s">${creatureSVG(sp, shownStage, { shiny: c.shiny })}</div>
      <div class="lvl-info">
        <b>${esc(sp.names[shownStage])}</b>
        <div class="lvl-num">Lv ${e.from} <span>→</span> <em style="animation-delay:${d + 0.35}s" data-count="${c.lvl}" data-from="${e.from}" data-delay="${(d + 0.35) * 1000}" data-ms="${Math.min(1200, 350 + (c.lvl - e.from) * 120)}" data-pop>${e.from}</em></div>
        <div class="lvl-stats"><span>ATK ${e.before.atk} → <b data-count="${now.atk}" data-from="${e.before.atk}" data-delay="${(d + 0.6) * 1000}" data-ms="700" data-quiet data-pop>${e.before.atk}</b></span>
          <span>HP ${e.before.hp} → <b data-count="${now.hp}" data-from="${e.before.hp}" data-delay="${(d + 0.7) * 1000}" data-ms="700" data-quiet data-pop>${e.before.hp}</b></span></div>
        <div class="lvl-gains">${da ? `<span class="gain atk" style="animation-delay:${d + 1.2}s">+${da} ATK</span>` : ''}${dh ? `<span class="gain hp" style="animation-delay:${d + 1.3}s">+${dh} HP</span>` : ''}
          ${e.learned.map((k, j) => `<span class="gain skill" style="animation-delay:${d + 0.7 + j * 0.1}s">New skill: ${ABILITY[k].name}</span>`).join('')}</div>
        ${evolving ? `<div class="lvl-evo" style="animation-delay:${d + 0.8}s">Something is happening…</div>` : ''}
      </div></div>`;
  }).join('');
  return new Promise((resolve) => {
    const sheet = openModal(`<div class="lvl-wrap">${confettiHTML()}
      <h2 class="center lvl-title">Level up!</h2>
      <div class="lvl-list">${cards}</div>
      <button class="btn primary block" data-close style="margin-top:14px">Yay!</button></div>`);
    entries.forEach((e, i) => setTimeout(() => sfx('pop', i * 2), 450 + i * 180));
    animateCounts(sheet);
    sheet.querySelector('[data-close]').onclick = () => { closeModal(); resolve(); };
  });
}

// The big moment: the screen darkens, the creature flickers between forms faster and
// faster, then a flash, a burst of stars and its new form.
async function playEvolution(c, e) {
  const sp = SPECIES_BY_ID[c.id];
  const ov = $('#evo'), oldEl = $('#evo-old'), newEl = $('#evo-new');
  const before = creatureStats({ ...c, lvl: e.fromLvl }), after = creatureStats(c);
  oldEl.innerHTML = creatureSVG(sp, e.fromStage, { shiny: c.shiny });
  newEl.innerHTML = creatureSVG(sp, e.toStage, { shiny: c.shiny });
  $('#evo-burst').innerHTML = '';
  $('#evo-foot').innerHTML = '';
  $('#evo-text').innerHTML = `What's this? <b>${esc(sp.names[e.fromStage])}</b> is evolving!`;
  ov.className = 'evo show';
  busy = true; syncPause();
  musicDuck(true);
  sfx('evostart');
  await sleep(1300);
  ov.classList.add('glowing');
  sfx('charge', 3.2);
  let delay = 420, i = 0;
  while (delay > 45) {
    ov.classList.toggle('swap');
    sfx('tick', i++);
    await sleep(delay);
    delay *= 0.84;
  }
  ov.classList.remove('swap', 'glowing');
  ov.classList.add('done');
  $('#evo-flash').classList.add('go');
  sfx('flash');
  $('#evo-burst').innerHTML = Array.from({ length: 30 }, (_, k) => `<i style="--a:${(k / 30) * 360}deg;--d:${110 + Math.random() * 90}px;animation-delay:${(Math.random() * 0.15).toFixed(2)}s"></i>`).join('');
  await sleep(250);
  sfx('fanfare');
  $('#evo-text').innerHTML = `Congratulations! <b>${esc(sp.names[e.fromStage])}</b> evolved into <b class="evo-name">${esc(sp.names[e.toStage])}</b>!
    <div class="evo-stats"><span>ATK ${before.atk} → <b data-count="${after.atk}" data-from="${before.atk}" data-delay="350" data-ms="900" data-pop>${before.atk}</b></span><span>HP ${before.hp} → <b data-count="${after.hp}" data-from="${before.hp}" data-delay="500" data-ms="900" data-quiet data-pop>${before.hp}</b></span></div>`;
  animateCounts($('#evo-text'));
  await sleep(900);
  await new Promise((resolve) => {
    $('#evo-foot').innerHTML = '<button class="btn primary">Amazing!</button>';
    $('#evo-foot button').onclick = resolve;
  });
  ov.className = 'evo hidden';
  $('#evo-flash').classList.remove('go');
  musicDuck(false);
  busy = false; syncPause();
  save(); refreshPanel();
}

let learning = false;
async function processLearnQueue() {
  if (learning) return;
  learning = true;
  while (learnQueue.length) {
    const { uid, key } = learnQueue.shift();
    const c = byUid(uid);
    if (!c || c.skills.includes(key)) continue;
    if (c.skills.length < MAX_SKILLS) { c.skills.push(key); continue; }
    await promptLearn(c, key);
  }
  learning = false;
  save();
}
function promptLearn(c, key, fromPage = false) {
  return new Promise((resolve) => {
    const sheet = openModal(`<div class="center"><div class="big-art" style="width:90px;height:90px">${art(c)}</div>
      <h2>${esc(nameOf(c))} wants to learn ${ABILITY[key].name}!</h2></div>
      <div class="trait-row ability-row"><b>${ABILITY[key].name}</b> ${abilityText(key, c.lvl)}</div>
      <p class="hint" style="margin-top:10px">It already knows 4 skills. Forget one to make room?</p>
      <div class="choice-list">${c.skills.map((k) => `<button class="btn block choice" data-forget="${k}"><b>Forget ${ABILITY[k].name}</b><small>${abilityText(k, c.lvl)}</small></button>`).join('')}</div>
      <button class="btn primary block" data-act="skip" style="margin-top:10px">Don't learn it</button>
      <p class="hint center" style="font-size:12px;margin-top:6px">Unlocked skills can be swapped in later from its page.</p>`);
    sheet.querySelector('[data-act=skip]').onclick = () => { closeModal(); if (fromPage) showCreature(c.uid); resolve(false); };
    sheet.querySelectorAll('[data-forget]').forEach((b) => (b.onclick = () => {
      c.skills[c.skills.indexOf(b.dataset.forget)] = key;
      save(); closeModal();
      toast(`${esc(nameOf(c))} forgot ${ABILITY[b.dataset.forget].name} and learned <b>${ABILITY[key].name}</b>!`);
      if (fromPage) showCreature(c.uid);
      refreshPanel();
      resolve(true);
    }));
  });
}

// XP comes from knockouts: the creature that lands it gets the full amount,
// and every teammate gets a small share.
function killXp(victimLvl) { return Math.round(4 + victimLvl * 3); }
function awardKills(report, mult = 1) {
  const team = teamEntries().filter(Boolean);
  const earned = new Map(team.map((c) => [c, 0]));
  const koCount = new Map();
  let total = 0;
  for (const k of (report && report.kills) || []) {
    if (k.killerSide !== 'ally') continue;
    const xp = Math.round(killXp(k.victimLvl) * mult);
    total += xp;
    if (earned.has(k.killer)) { earned.set(k.killer, earned.get(k.killer) + xp); koCount.set(k.killer, (koCount.get(k.killer) || 0) + 1); }
  }
  for (const c of team) earned.set(c, earned.get(c) + Math.round(total * 0.2));
  const dmg = new Map(((report && report.damage) || []).filter((d) => d.side === 'ally').map((d) => [d.c, d.dmg]));
  let mvp = null;
  for (const c of team) if ((dmg.get(c) || 0) > 0 && (!mvp || dmg.get(c) > dmg.get(mvp))) mvp = c;
  const rows = [];
  team.forEach((c, i) => {
    const xp = earned.get(c);
    const fromLvl = c.lvl, fromXp = c.xp;
    const gain = c.lvl >= MAX_LEVEL ? 0 : Math.round(xp * xpMult(c));
    if (xp) addXp(c, xp);
    const sp = SPECIES_BY_ID[c.id];
    rows.push(`<div class="xp-line ${c === mvp ? 'mvp' : ''}" data-from-lvl="${fromLvl}" data-from-xp="${fromXp}" data-to-lvl="${c.lvl}" data-to-xp="${c.xp}" data-delay="${200 + i * 140}">
      <div class="mini">${creatureSVG(sp, evoStage(fromLvl), { shiny: c.shiny })}</div>
      <div class="xp-mid">
        <div class="xp-top"><b>${esc(sp.names[evoStage(fromLvl)])}</b>${c === mvp ? '<span class="mvp-tag">★ MVP</span>' : ''}
          <span class="xp-lv">Lv <em>${fromLvl}</em></span></div>
        <div class="xp-track"><i style="width:${fromLvl >= MAX_LEVEL ? 100 : (100 * fromXp) / xpNeed(fromLvl)}%"></i><span class="xp-burst">LEVEL UP!</span></div>
        <div class="xp-sub"><span class="xp-gain">+<em data-count="${gain}" data-delay="${200 + i * 140}" data-ms="900" ${i ? 'data-quiet' : ''}>0</em> XP</span>
          ${dmg.get(c) ? `<span><em data-count="${dmg.get(c)}" data-delay="${350 + i * 140}" data-ms="800" data-quiet>0</em> dmg</span>` : ''}
          ${koCount.get(c) ? `<span>${koCount.get(c)} K.O.</span>` : ''}</div>
      </div></div>`);
  });
  save();
  return rows.length ? `<div class="xp-panel">${rows.join('')}</div>` : '';
}

// Fill each XP bar; when one fills up it bursts, the level ticks up and it keeps going.
function animateXp(root) {
  root.querySelectorAll('.xp-line').forEach((line) => {
    const d = line.dataset;
    let lvl = Number(d.fromLvl), xp = Number(d.fromXp);
    const toLvl = Number(d.toLvl), toXp = Number(d.toXp);
    const bar = line.querySelector('.xp-track i'), lvEl = line.querySelector('.xp-lv em'), burst = line.querySelector('.xp-burst');
    const fill = (pct, ms) => { bar.style.transition = `width ${ms}ms cubic-bezier(.3,.7,.4,1)`; bar.style.width = pct + '%'; return sleep(ms); };
    setTimeout(async () => {
      while (lvl < toLvl) {
        await fill(100, 520);
        lvl++;
        lvEl.textContent = lvl;
        restartClass(lvEl, 'num-pop', 450);
        restartClass(burst, 'go', 900);
        restartClass(line, 'lvl-flash', 700);
        sfx('ding');
        await sleep(260);
        bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth;
        xp = 0;
      }
      if (lvl >= MAX_LEVEL) await fill(100, 300);
      else await fill((100 * toXp) / xpNeed(lvl), 600);
    }, Number(d.delay || 0));
  });
}

function giveCoins(n) { n = Math.round(n * coinBonus()); S.coins += n; save(); updateHud(); return n; }

function giveCreature(c) {
  c = { ...c, uid: S.nextUid++, xp: 0, charms: c.charms || [] };
  S.roster.push(c);
  const empty = S.team.indexOf(null);
  if (empty >= 0) S.team[empty] = c.uid;
  return c;
}
function coinBonus() {
  const team = teamEntries().filter(Boolean);
  return (team.some((c) => c.traits.includes('lucky')) ? 1.25 : 1) + team.reduce((s, c) => s + charmTotals(c).coins, 0) / 100;
}
function xpMult(c) { return (c.traits.includes('scholar') ? 1.3 : 1) + charmTotals(c).xp / 100; }

// ---------- charms ----------
const lootQueue = [];
function makeCharm(lvl, rarity) {
  const R = CHARM_RARITY[rarity];
  const keys = Object.keys(AFFIXES).sort(() => Math.random() - 0.5).slice(0, R.affixes);
  const affixes = keys.map((k) => {
    const A = AFFIXES[k];
    const v = A.pct ? Math.round((A.pct[0] + Math.random() * (A.pct[1] - A.pct[0])) * R.mult)
      : Math.max(1, Math.round(lvl * A.per * R.mult * (0.75 + Math.random() * 0.5))) + (k === 'hp' ? 2 : 0);
    return { k, v };
  });
  return { cid: S.nextCid++, name: `${rand(CHARM_ADJ[rarity])} ${AFFIXES[affixes[0].k].noun} Charm`, rarity, lvl: Math.round(lvl), affixes };
}
const DROP_TABLES = {
  wild: { common: 70, rare: 25, epic: 5 },
  trainer: { common: 50, rare: 38, epic: 12 },
  champion: { rare: 40, epic: 42, legendary: 18 },
};
function dropCharm(lvl, table) {
  const w = DROP_TABLES[table];
  const ch = makeCharm(lvl, weightedPick(Object.keys(w), (k) => w[k]));
  S.charms.push(ch);
  lootQueue.push(ch);
  save();
  return ch;
}
function charmSVG(ch, size = 48) {
  const R = CHARM_RARITY[ch.rarity], kind = AFFIXES[ch.affixes[0].k].kind;
  const glyph = kind === 'attack' ? '<path d="M24 22 L29 34 L24 31 L19 34 Z" fill="#fffaf0"/>'
    : kind === 'guard' ? '<path d="M24 21 L30 23 V28 C30 32 27 34.5 24 36 C21 34.5 18 32 18 28 V23 Z" fill="#fffaf0"/>'
      : '<path d="M24 21 C30 24 30 32 24 36 C18 32 18 24 24 21 Z M24 23 V35" fill="#fffaf0" stroke="#fffaf0"/>';
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
    <path d="M24 4 C18 4 16 9 18 13 M24 4 C30 4 32 9 30 13" fill="none" stroke="#8a7461" stroke-width="2" stroke-linecap="round"/>
    <circle cx="24" cy="28" r="17" fill="${R.glow}" opacity=".6"/>
    <path d="M24 12 L37 20 V36 L24 44 L11 36 V20 Z" fill="${R.color}" stroke="#5b4636" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M24 12 L37 20 L24 26 L11 20 Z" fill="#ffffff" opacity=".28"/>${glyph}
  </svg>`;
}
function affixList(ch, anim = false) {
  return ch.affixes.map((a, i) => `<div class="affix" ${anim ? `style="animation-delay:${0.7 + i * 0.35}s"` : ''}>${AFFIXES[a.k].text(a.v)}</div>`).join('');
}
function ownerOf(ch) { return S.roster.find((c) => (c.charms || []).some((x) => x.cid === ch.cid)); }

function showLoot(ch) {
  const R = CHARM_RARITY[ch.rarity];
  sfx(ch.rarity === 'legendary' ? 'fanfare' : 'levelup');
  return new Promise((resolve) => {
    const sheet = openModal(`<div class="loot r-${ch.rarity}" style="--rc:${R.color};--rg:${R.glow}">
      ${ch.rarity === 'legendary' || ch.rarity === 'epic' ? confettiHTML(ch.rarity === 'legendary' ? 40 : 20) : ''}
      <div class="loot-rays"></div>
      <div class="loot-title">Loot!</div>
      <div class="loot-gem">${charmSVG(ch, 110)}</div>
      <div class="loot-rarity">${R.name}</div>
      <h2 class="loot-name">${esc(ch.name)}</h2>
      <div class="hint center">Charm level ${ch.lvl}</div>
      <div class="loot-affixes">${affixList(ch, true)}</div>
      <p class="hint center" style="margin-top:8px">Equip it from Team → Charms. Each creature can wear 2.</p>
      <button class="btn primary block" data-close style="margin-top:10px">Nice!</button></div>`);
    ch.affixes.forEach((a, i) => setTimeout(() => sfx('pop', 4 + i * 3), 700 + i * 350));
    sheet.querySelector('[data-close]').onclick = () => { closeModal(); resolve(); };
  });
}

// Choose who wears a charm (or which charm a creature wears).
function equipCharm(c, ch, back) {
  if (c.charms.length >= 2) {
    const sheet = openModal(`<h2>${esc(nameOf(c))} already wears 2 charms</h2><p class="hint">Swap one out for ${esc(ch.name)}?</p>
      <div class="choice-list">${c.charms.map((x) => `<button class="btn block choice" data-out="${x.cid}"><b>Take off ${esc(x.name)}</b><small>${x.affixes.map((a) => AFFIXES[a.k].text(a.v)).join(' · ')}</small></button>`).join('')}</div>
      <button class="btn block" data-act="back" style="margin-top:10px">Back</button>`);
    sheet.querySelector('[data-act=back]').onclick = back;
    sheet.querySelectorAll('[data-out]').forEach((b) => (b.onclick = () => {
      const out = c.charms.find((x) => x.cid === Number(b.dataset.out));
      c.charms = c.charms.filter((x) => x !== out); S.charms.push(out);
      equipCharm(c, ch, back);
    }));
    return;
  }
  S.charms = S.charms.filter((x) => x.cid !== ch.cid);
  c.charms.push(ch);
  save(); sfx('pop', 6);
  toast(`${esc(nameOf(c))} is wearing ${esc(ch.name)}!`);
  back();
}
function unequipCharm(c, ch) {
  c.charms = c.charms.filter((x) => x.cid !== ch.cid);
  S.charms.push(ch); save();
}
function pickCreatureFor(ch, back) {
  const list = [...S.roster].sort((a, b) => (S.team.includes(b.uid) - S.team.includes(a.uid)) || b.lvl - a.lvl);
  const sheet = openModal(`<h2>Who wears ${esc(ch.name)}?</h2><div class="grid" style="margin-top:8px">${list.map((c) => monCard(c)).join('')}</div>
    <button class="btn block" data-act="back" style="margin-top:10px">Back</button>`);
  sheet.querySelector('[data-act=back]').onclick = back;
  sheet.querySelectorAll('.mon').forEach((el) => (el.onclick = () => equipCharm(byUid(Number(el.dataset.uid)), ch, () => { closeModal(); refreshPanel(); })));
}
function pickCharmFor(c) {
  const bag = [...S.charms].sort((a, b) => Object.keys(CHARM_RARITY).indexOf(b.rarity) - Object.keys(CHARM_RARITY).indexOf(a.rarity) || b.lvl - a.lvl);
  const sheet = openModal(`<h2>Equip a charm on ${esc(nameOf(c))}</h2>
    ${bag.length ? `<div class="charm-list">${bag.map((ch) => charmRow(ch)).join('')}</div>` : '<p class="hint">Your bag is empty. Champions always drop charms, and trainers and rare wild creatures sometimes do.</p>'}
    <button class="btn block" data-act="back" style="margin-top:10px">Back</button>`);
  sheet.querySelector('[data-act=back]').onclick = () => showCreature(c.uid);
  sheet.querySelectorAll('[data-cid]').forEach((el) => (el.onclick = () => equipCharm(c, S.charms.find((x) => x.cid === Number(el.dataset.cid)), () => showCreature(c.uid))));
}
function charmRow(ch, extra = '') {
  const R = CHARM_RARITY[ch.rarity];
  return `<div class="charm-row" data-cid="${ch.cid}" style="--rc:${R.color}">${charmSVG(ch, 44)}
    <div class="cr-mid"><b style="color:${R.color}">${esc(ch.name)}</b><small>${R.name} · Lv ${ch.lvl}</small>${affixList(ch)}</div>${extra}</div>`;
}
let confirmSalvage = null;
function renderCharms(body) {
  const order = Object.keys(CHARM_RARITY);
  const worn = S.roster.flatMap((c) => c.charms.map((ch) => ({ ch, c })));
  const bag = [...S.charms].sort((a, b) => order.indexOf(b.rarity) - order.indexOf(a.rarity) || b.lvl - a.lvl);
  body.innerHTML = `${teamTabs()}
    <p class="hint">Each creature can wear 2 charms. Tap a charm in your bag to equip it, or salvage it for stardust.</p>
    <h3>In your bag (${bag.length})</h3>
    ${bag.length ? `<div class="charm-list">${bag.map((ch) => charmRow(ch, `<div class="cr-btns"><button class="btn small primary" data-equip="${ch.cid}">Equip</button><button class="btn small" data-salvage="${ch.cid}">${confirmSalvage === ch.cid ? 'Sure?' : `+${CHARM_RARITY[ch.rarity].salvage} dust`}</button></div>`)).join('')}</div>` : '<p class="hint">Empty for now. Champions always drop charms. Trainers and rare wild creatures sometimes do.</p>'}
    <h3>Being worn (${worn.length})</h3>
    ${worn.length ? `<div class="charm-list">${worn.map(({ ch, c }) => charmRow(ch, `<div class="cr-btns"><span class="hint">${esc(nameOf(c))}</span><button class="btn small" data-unequip="${ch.cid}">Take off</button></div>`)).join('')}</div>` : '<p class="hint">No one is wearing a charm yet.</p>'}`;
  bindTeamTabs(body);
  body.querySelectorAll('[data-equip]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); pickCreatureFor(S.charms.find((x) => x.cid === Number(b.dataset.equip)), closeModal); }));
  body.querySelectorAll('[data-salvage]').forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    const id = Number(b.dataset.salvage);
    if (confirmSalvage !== id) { confirmSalvage = id; refreshPanel(); return; }
    const ch = S.charms.find((x) => x.cid === id);
    S.charms = S.charms.filter((x) => x.cid !== id); S.dust += CHARM_RARITY[ch.rarity].salvage; confirmSalvage = null;
    save(); toast(`Salvaged for ${CHARM_RARITY[ch.rarity].salvage} stardust.`); refreshPanel();
  }));
  body.querySelectorAll('[data-unequip]').forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    const id = Number(b.dataset.unequip), { ch, c } = worn.find((w) => w.ch.cid === id);
    unequipCharm(c, ch); refreshPanel();
  }));
}
let teamTab = 'creatures';
function teamTabs() {
  const ready = S.jobs.some((j) => jobStored(j) > 0);
  const tab = (k, label, badge = '') => `<button class="${teamTab === k ? 'on' : ''}" data-tab="${k}">${label}${badge}</button>`;
  return `<div class="tabs-row">${tab('creatures', 'Team')}${tab('charms', 'Charms', S.charms.length ? `<span class="count">${S.charms.length}</span>` : '')}${tab('jobs', 'Jobs', ready ? '<span class="count">!</span>' : '')}${tab('workshop', 'Craft')}</div>`;
}
function bindTeamTabs(body) {
  body.querySelectorAll('.tabs-row [data-tab]').forEach((b) => (b.onclick = () => { teamTab = b.dataset.tab; refreshPanel(); body.scrollTop = 0; }));
}
function dustValue(c) { return 5 * stars(c.roll) + 8 * c.traits.length + (c.shiny ? 100 : 0); }

function traitChips(c, withDesc = false) {
  if (!c.traits.length) return '<span class="hint">No traits</span>';
  return c.traits.map((k) => `<span class="chip trait t-${TRAITS[k].weight <= 5 ? 'rare' : 'common'}" title="${esc(TRAITS[k].desc)}">${TRAITS[k].name}${withDesc ? `<small>${TRAITS[k].desc}</small>` : ''}</span>`).join('');
}

// Card shown when a creature joins: stars and traits pop in one by one.
function revealHTML(c, title, note) {
  const sp = SPECIES_BY_ID[c.id];
  const n = stars(c.roll);
  return `<div class="center reveal">
    <h2>${title}</h2>
    ${c.shiny ? '<div class="shiny-banner">✦ Shiny! ✦</div>' : ''}
    <div class="big-art pop">${art(c)}</div>
    <h2>${esc(nameOf(c))} <span class="hint">Lv ${c.lvl}</span></h2>
    <div class="synergies" style="justify-content:center">${elChip(sp)}<span class="chip">${ROLES[sp.role].name}</span>
      <span class="chip" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span></div>
    <div class="stars-big">${[0, 1, 2, 3, 4].map((i) => `<span class="${i < n ? 'on' : 'off'}" style="animation-delay:${0.35 + i * 0.12}s">★</span>`).join('')}</div>
    <div class="trait-list">${c.traits.map((k, i) => `<div class="trait-row" style="animation-delay:${1 + i * 0.25}s"><b>${TRAITS[k].name}</b> ${TRAITS[k].desc}</div>`).join('')}</div>
    <div class="skill-head" style="animation-delay:${1 + c.traits.length * 0.25}s">Skills</div>
    ${c.skills.map((k, i) => `<div class="trait-row ability-row" style="animation-delay:${1.1 + (c.traits.length + i) * 0.2}s"><b>${ABILITY[k].name}</b> ${abilityText(k, c.lvl)}</div>`).join('')}
    ${note ? `<p class="hint" style="margin-top:8px">${note}</p>` : ''}
  </div>`;
}

// ---------- HUD ----------
let shownCoins = null, coinAnim = 0;
function updateHud() {
  if (shownCoins === null) { shownCoins = S.coins; $('#coins').textContent = S.coins.toLocaleString(); }
  else if (shownCoins !== S.coins) {
    const from = shownCoins, to = S.coins, token = ++coinAnim;
    shownCoins = to;
    const pill = $('#coins').closest('.pill');
    if (to > from) {
      sfx('coin');
      const f = h(`<span class="coin-float">+${(to - from).toLocaleString()}</span>`);
      pill.appendChild(f); setTimeout(() => f.remove(), 1100);
      restartClass(pill, 'pill-bump', 500);
    }
    const el = $('#coins');
    const t0 = performance.now(), ms = Math.min(1200, 400 + Math.abs(to - from) * 6);
    const step = (t) => {
      if (token !== coinAnim) return;
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  $('#berries').textContent = S.berries;
  const crestText = `${S.crests}/${TOWN_CRESTS.length}`;
  if ($('#crests').textContent !== crestText && $('#crests').textContent) restartClass($('#crests').closest('.pill'), 'pill-bump', 500);
  $('#crests').textContent = crestText;
  $('#map-name').textContent = World.map ? World.map.name : 'Crestville';
}
function syncPause() {
  World.paused = dialogOpen || !$('#battle').classList.contains('hidden') || !$('#panel').classList.contains('hidden') || !$('#modal').classList.contains('hidden') || busy;
  if (World.paused) World.held = null;
}
let busy = false; // during scripted moments (encounters, transitions)

// ---------- dialog ----------
let dialogOpen = false, dialogNext = null;
async function say(who, lines) {
  dialogOpen = true; syncPause();
  const box = $('#dialog');
  box.classList.remove('hidden');
  for (const line of [].concat(lines)) {
    $('#dialog-who').textContent = who || '';
    $('#dialog-text').innerHTML = line;
    await new Promise((r) => (dialogNext = r));
  }
  box.classList.add('hidden');
  dialogOpen = false; dialogNext = null; syncPause();
}
function advanceDialog() { if (dialogNext) { const r = dialogNext; dialogNext = null; r(); } }

// ---------- modal ----------
function openModal(html) {
  $('#sheet').innerHTML = html;
  $('#modal').classList.remove('hidden');
  syncPause();
  return $('#sheet');
}
function closeModal() { $('#modal').classList.add('hidden'); syncPause(); }

// ---------- panels ----------
let panelRender = null;
function openPanel(title, render) {
  $('#panel-title').textContent = title;
  panelRender = render;
  $('#panel').classList.remove('hidden');
  render($('#panel-body'));
  $('#panel-body').scrollTop = 0;
  syncPause();
}
function refreshPanel() { if (panelRender && !$('#panel').classList.contains('hidden')) panelRender($('#panel-body')); }
function closePanel() { $('#panel').classList.add('hidden'); panelRender = null; syncPause(); }

// ---------- battle view ----------
const BUI = { skip: false };
function bwait(ms) { return BUI.skip ? Promise.resolve() : sleep(ms / S.speed); }

let laneObserver = null;
function makeBattleUI() {
  const lane = $('#lane');
  const els = new Map();
  let slot = 60, lastB = null;
  const el = (u) => els.get(u.key);
  if (laneObserver) laneObserver.disconnect();
  laneObserver = new ResizeObserver(() => lastB && place(lastB));
  laneObserver.observe(lane);
  function place(B) {
    lastB = B;
    const H = lane.clientHeight, E = B.enemy.length, A = B.ally.length;
    slot = Math.max(26, Math.min(66, (H - 48) / Math.max(2, E + A)));
    const top0 = Math.max(8, (H - (E + A) * slot - 32) / 2);
    const mid = top0 + E * slot + 16;
    $('#vs').style.top = mid + 'px';
    lane.style.setProperty('--mid', mid + 'px');
    const size = slot - 6;
    const put = (u, top) => { const e = el(u); if (!e) return; e.style.top = top + 'px'; e.style.width = e.style.height = size + 'px'; };
    B.enemy.forEach((u, i) => put(u, mid - 16 - (i + 1) * slot));
    B.ally.forEach((u, i) => put(u, mid + 16 + i * slot + 6));
  }
  function badges(u, pulseAtk, pulseHp) {
    const e = el(u); if (!e) return;
    e.querySelector('.badge-atk').textContent = u.atk;
    e.querySelector('.badge-hp').textContent = Math.max(0, u.hp);
    if (pulseAtk) restartClass(e.querySelector('.badge-atk'), 'pulse', 200);
    if (pulseHp) restartClass(e.querySelector('.badge-hp'), 'pulse', 200);
  }
  function float(u, text, cls) {
    const e = el(u); if (!e) return null;
    const f = h(`<span class="float ${cls}">${text}</span>`);
    f.style.marginLeft = (Math.random() * 16 - 8) + 'px';
    e.appendChild(f);
    setTimeout(() => f.remove(), 1100);
    return f;
  }
  return {
    async setup(B, instant = false) {
      lane.querySelectorAll('.bu').forEach((e) => e.remove());
      els.clear();
      for (const u of [...B.ally, ...B.enemy]) {
        const stage = u.stage;
        const e = h(`<div class="bu ${u.side} stage-${stage}"><div class="spr">${creatureSVG(u.sp, stage, { shiny: u.shiny })}</div>
          <div class="badge-atk">${u.atk}</div><div class="badge-hp">${u.hp}</div>
          <div class="lbl">${esc(u.sp.names[stage])}<small>Lv ${u.lvl}</small></div></div>`);
        lane.appendChild(e);
        els.set(u.key, e);
      }
      place(B);
      if (!instant) await bwait(600);
    },
    async trigger(u, name) {
      const e = el(u); if (!e) return;
      restartClass(e, 'glow', 700);
      const s = h(`<div class="say">${esc(name)}</div>`);
      e.appendChild(s);
      setTimeout(() => s.remove(), 950);
      await bwait(450);
    },
    async damage(u, n, tag) {
      // Bigger hits get bigger numbers; huge ones shake the arena.
      const ratio = n / Math.max(1, u.hp + n);
      const f = float(u, `-${n}${tag === 'strong' ? '!' : ''}`, tag);
      if (f) f.style.fontSize = Math.round(18 + Math.min(20, ratio * 24) + Math.min(10, n / 3) + (tag === 'strong' ? 3 : 0)) + 'px';
      if (ratio >= 0.5 || n >= 15) { restartClass(lane, 'shake', 320); if (!BUI.skip) sfx('bighit'); }
      if (u.hp <= 0) float(u, 'K.O.!', 'ko');
      restartClass(el(u), 'hurt', 300);
      badges(u, false, true);
      await bwait(260);
    },
    async buff(u, atk, hp) {
      const parts = [];
      if (atk) parts.push(`${atk > 0 ? '+' : ''}${atk} atk`);
      if (hp) parts.push(`+${hp} hp`);
      float(u, parts.join(' '), 'buff');
      badges(u, !!atk, !!hp);
      await bwait(300);
    },
    async clash(a, e) {
      restartClass(el(a), 'lunge-up', 260);
      restartClass(el(e), 'lunge-down', 260);
      await bwait(220);
    },
    async faint(u) {
      const e = el(u); if (!e) return;
      e.classList.add('out');
      setTimeout(() => e.remove(), 1200);
      await bwait(300);
    },
    async layout(B) { place(B); await bwait(340); },
  };
}

// Before a fight: see both lineups, swap your order, then start.
function previewSide(team, side) {
  const list = team.filter(Boolean);
  const bonus = elementBonus(list);
  return list.map((c, i) => {
    const st = creatureStats(c), sp = SPECIES_BY_ID[c.id], b = bonus[sp.el] || 0;
    return { key: 'p' + side + i, id: c.id, sp, lvl: c.lvl, stage: evoStage(c.lvl), shiny: !!c.shiny, atk: st.atk + b, hp: st.hp + b, side };
  });
}

async function scout(ui, enemy, canRun) {
  for (;;) {
    ui.setup({ ally: previewSide(teamEntries(), 'ally'), enemy: previewSide(enemy, 'enemy') }, true);
    const mine = S.team.map((uid, i) => {
      const c = uid != null && byUid(uid);
      return `<div class="mini-slot ${c ? '' : 'empty'} ${scoutSel === i ? 'sel' : ''}" data-s="${i}">${c ? art(c) : ''}</div>`;
    }).join('');
    const buttons = [{ key: 'fight', label: 'Fight!', cls: 'primary' }];
    if (canRun) buttons.push({ key: 'run', label: 'Run away' });
    const p = battleFooter(`<div class="scout"><span class="hint">Your order (tap two to swap):</span><div class="mini-row">${mine}</div></div>`, buttons);
    const swapped = new Promise((resolve) => {
      $('#b-foot').querySelectorAll('[data-s]').forEach((el) => (el.onclick = () => {
        const i = Number(el.dataset.s);
        if (scoutSel === null) { if (S.team[i] != null) scoutSel = i; }
        else { [S.team[scoutSel], S.team[i]] = [S.team[i], S.team[scoutSel]]; scoutSel = null; save(); }
        resolve('swap');
      }));
    });
    const choice = await Promise.race([p, swapped]);
    if (choice !== 'swap') { scoutSel = null; return choice; }
  }
}
let scoutSel = null;
let lastReport = {};

async function playBattle(title, enemy, { canRun = false } = {}) {
  busy = true; syncPause();
  BUI.skip = false;
  $('#b-title').textContent = title;
  $('#b-speed').textContent = S.speed + '×';
  const lt = (World.th || THEMES.meadow).lane;
  $('#lane').style.background = `linear-gradient(${lt[0]} 0%, ${lt[1]} calc(var(--mid) - 24px), ${lt[2]} calc(var(--mid) + 24px), ${lt[3]} 100%)`;
  $('#battle').classList.remove('hidden');
  musicPlay('battle');
  await nextFrame();
  const ui = makeBattleUI();
  const choice = await scout(ui, enemy, canRun);
  if (choice === 'run') return 'run';
  $('#b-foot').innerHTML = '<p class="hint center">Front fights front. When one faints, the next steps up.</p>';
  lastReport = {};
  const result = await runBattle(teamEntries(), enemy, ui, lastReport);
  await sleep(BUI.skip ? 100 : 400);
  return result;
}

function battleFooter(html, buttons) {
  return new Promise((resolve) => {
    const foot = $('#b-foot');
    foot.innerHTML = `${html}<div class="btn-row" style="grid-template-columns:repeat(${buttons.length},1fr);margin-top:0">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>`;
    foot.querySelectorAll('[data-i]').forEach((btn) => (btn.onclick = () => resolve(buttons[Number(btn.dataset.i)].key)));
    animateXp(foot);
    animateCounts(foot);
  });
}
function closeBattle(celebrateNow = true) {
  $('#battle').classList.add('hidden');
  musicPlay((World.map && World.map.music) || 'meadow');
  busy = false; syncPause();
  if (celebrateNow) setTimeout(celebrate, 50);
}

// ---------- encounters ----------
let stepsSinceBattle = 0;

function avgLvl(team) { const t = team.filter(Boolean); return t.reduce((s, c) => s + c.lvl, 0) / Math.max(1, t.length); }

async function flashIn() {
  const f = $('#flash');
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  await sleep(850);
  f.classList.remove('go');
}

// regions: list of region numbers, or a map's wild settings ({ regions } or { els }).
// In towns, creatures get stronger the closer you are to the far gate,
// reaching about the Champion's level right before you move on.
function wildLevel(w) {
  const m = World.map, p = World.player;
  if (!m.entryPt) return randInt(w.min, w.max);
  const d = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  const t = Math.max(0, Math.min(1, d([p.x, p.y], m.entryPt) / Math.max(1, d(m.exitPt, m.entryPt))));
  return Math.max(w.min, Math.min(w.max, Math.round(w.min + (w.max - w.min) * t) + randInt(-1, 1)));
}

function pickWild(regions, faraway = false) {
  let test;
  if (Array.isArray(regions)) test = (s) => regions.includes(s.region);
  else if (regions.els) test = (s) => regions.els.includes(s.el);
  else test = (s) => regions.regions.includes(s.region);
  if (!Array.isArray(regions) && !regions.els && !regions.regions) test = () => true;
  const list = SPECIES.filter((s) => (faraway ? !test(s) : test(s)));
  return weightedPick(list.length ? list : SPECIES, (s) => RARITY[s.rarity].wild);
  return weightedPick(list, (s) => RARITY[s.rarity].wild);
}

async function wildEncounter() {
  busy = true; syncPause();
  const w = World.map.wild;
  const n = randInt(1, Math.max(1, Math.min(w.pack, teamSize())));
  // A small chance that a creature from a faraway region wanders in.
  const visitor = Math.random() < 0.05;
  const enemy = [];
  for (let i = 0; i < n; i++) {
    const sp = pickWild(w, visitor && i === 0);
    enemy.push(rollCreature(sp.id, wildLevel(w)));
  }
  S.seen = [...new Set([...(S.seen || []), ...enemy.map((e) => e.id)])];
  await flashIn();
  const names = [...new Set(enemy.map((e) => nameOf(e)))].join(' & ');
  const result = await playBattle(`${visitor ? 'Rare visitor! ' : 'Wild '}${names}`, enemy, { canRun: true });
  stepsSinceBattle = 0;

  if (result === 'run') {
    await battleFooter('<div class="result-banner">You slipped away safely.</div>', [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
  } else if (result === 'win') {
    const lv = avgLvl(enemy);
    const xpRows = awardKills(lastReport);
    const coins = giveCoins(4 + lv * 2);
    const pick = enemy.find((e) => e.shiny) || rand(enemy);
    const loot = enemy.some((e) => e.shiny) || Math.random() < (visitor ? 0.3 : 0.05) ? dropCharm(lv, 'wild') : null;
    await befriend(pick, `<div class="result-banner win">You won! <span class="hint">+${coins} coins</span></div>${loot ? `<div class="loot-tease" style="--rc:${CHARM_RARITY[loot.rarity].color}">✦ A ${CHARM_RARITY[loot.rarity].name} charm dropped!</div>` : ''}${xpRows}`);
  } else if (result === 'draw') {
    await battleFooter(`<div class="result-banner">A tie!</div><p class="hint center">The wild creatures wandered off.</p>${awardKills(lastReport)}`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
  } else {
    await battleFooter(`<div class="result-banner lose">Your team is worn out</div><p class="hint center">Time to rest at home.</p>${awardKills(lastReport)}`, [{ key: 'ok', label: 'Go home', cls: 'primary' }]);
    closeBattle(false);
    await goHome();
    return celebrate();
  }
  closeBattle();
}

const JOIN_CHANCE = { common: 0.45, rare: 0.3, epic: 0.15 };

async function befriend(wild, header) {
  const sp = SPECIES_BY_ID[wild.id];
  const name = nameOf(wild);
  const card = `<div class="wild-card"><div class="mini" style="width:58px;height:58px">${art(wild)}</div>
    <div><b>${esc(name)}</b> <span class="hint">Lv ${wild.lvl}</span> ${wild.shiny ? '<b class="shiny-tag">✦ Shiny</b>' : ''}
      <div class="stars-line">${starText(wild)}</div>
      <div class="synergies">${traitChips(wild)}</div>
      <div class="hint" style="font-size:12px">Skills: ${wild.skills.map((k) => `<b>${ABILITY[k].name}</b>`).join(', ')}</div>
    </div></div>
    <p class="hint center" style="font-size:13px">It's watching you curiously.</p>`;
  const buttons = [{ key: 'wave', label: 'Wave hello' }, { key: 'leave', label: 'Leave' }];
  if (S.berries > 0) buttons.unshift({ key: 'berry', label: `Berry (${S.berries})`, cls: 'primary' });
  else buttons[0].cls = 'primary';
  const choice = await battleFooter(header + card, buttons);
  if (choice === 'leave') return;
  let chance = JOIN_CHANCE[sp.rarity] + (wild.shiny ? 0.2 : 0);
  if (choice === 'berry') { S.berries--; chance += 0.35; updateHud(); }
  if (Math.random() < chance) {
    const c = giveCreature(wild);
    save();
    const note = S.team.includes(c.uid) ? 'It joined your team!' : 'Your team is full, so it went to rest at Home.';
    const sheet = openModal(revealHTML(c, `${esc(name)} wants to come along!`, note) + '<button class="btn primary block" data-close style="margin-top:12px">Yay!</button>');
    await new Promise((r) => (sheet.querySelector('[data-close]').onclick = r));
    closeModal();
  } else {
    await battleFooter(`<div class="result-banner">${esc(name)} scampered off.</div><p class="hint center">${choice === 'berry' ? 'It took the berry though!' : 'A Sweet Berry might help next time.'}</p>`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
  }
  save();
}

async function trainerBattle(npc) {
  const tr = npc.trainer;
  if (!teamSize()) { await say(npc.name, 'Come back when you have a creature with you!'); return; }
  await say(npc.name, tr.before);
  busy = true; syncPause();
  await flashIn();
  const enemy = tr.team.map(([id, lvl]) => { const c = plainCreature(id, lvl); if (tr.quality) c.roll = { a: tr.quality, h: tr.quality }; return c; });
  const result = await playBattle(npc.name, enemy);
  stepsSinceBattle = 0;
  if (result === 'win') {
    S.beaten[npc.id] = true;
    const xpRows = awardKills(lastReport, 2);
    const coins = giveCoins(tr.coins);
    const top = Math.max(...enemy.map((e) => e.lvl));
    const loot = tr.crest != null ? dropCharm(top, 'champion') : Math.random() < 0.4 ? dropCharm(top, 'trainer') : null;
    await battleFooter(`<div class="result-banner win">You beat ${esc(npc.name)}!</div><p class="hint center">+${coins} coins · Trainer battles give double XP</p>${loot ? `<div class="loot-tease" style="--rc:${CHARM_RARITY[loot.rarity].color}">✦ A ${CHARM_RARITY[loot.rarity].name} charm dropped!</div>` : ''}${xpRows}`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
    closeBattle(false);
    await say(npc.name, tr.after);
    if (tr.crest != null && S.crests < tr.crest + 1) { S.crests = tr.crest + 1; save(); updateHud(); await showCrest(tr.crest); }
    await celebrate();
  } else if (result === 'draw') {
    await battleFooter(`<div class="result-banner">A tie!</div><p class="hint center">Talk to ${esc(npc.name)} again for a rematch.</p>${awardKills(lastReport, 2)}`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
    closeBattle();
  } else {
    await battleFooter(`<div class="result-banner lose">${esc(npc.name)} won this time</div><p class="hint center">Train up, try a new lineup, and come back.</p>${awardKills(lastReport, 2)}`, [{ key: 'ok', label: 'Go home', cls: 'primary' }]);
    closeBattle(false);
    await goHome();
    await celebrate();
  }
}

async function goHome() {
  busy = true; syncPause();
  await flashIn();
  const id = MAPS[S.lastTown] ? S.lastTown : 'town';
  const [x, y] = MAPS[id].start;
  enterMap(id, x, y, 'down');
  busy = false; syncPause();
  await say('', id === 'town' ? 'You rested at home. Your team feels cozy and refreshed.' : `You rested in ${MAPS[id].name}. Your team feels cozy and refreshed.`);
}

function showCrest(r) {
  sfx('fanfare');
  const sheet = openModal(`<div class="center">
    <h2>You earned the ${TOWN_CRESTS[r].name}!</h2>
    <div class="crest-big">${crestSVG(r, true)}</div>
    <p class="hint">${S.crests}/${TOWN_CRESTS.length} crests. ${r < TOWN_CRESTS.length - 1 ? 'The road to the next town is open, and Meadow Eggs may hold new kinds of creatures.' : 'You collected every crest. Crestville will tell stories about you!'}</p>
    <button class="btn primary block" data-close style="margin-top:14px">Hooray!</button></div>`);
  return new Promise((resolve) => (sheet.querySelector('[data-close]').onclick = () => { closeModal(); resolve(); }));
}

// ---------- world events ----------
function enterMap(id, x, y, dir) {
  worldLoad(id, x, y, dir);
  S.map = id; S.x = x; S.y = y;
  if (World.map.town) {
    S.lastTown = id;
    if (!S.visited.includes(id)) S.visited.push(id);
  }
  musicPlay(World.map.music || 'meadow');
  save(); updateHud();
}

async function onStep(x, y) {
  S.x = x; S.y = y; S.dir = World.player.dir;
  stepsSinceBattle++;
  const exit = World.map.exits.find((e) => e.x === x && e.y === y);
  if (exit) {
    if (exit.need && S.crests < exit.need) {
      // Step back and explain which crest opens the road.
      const p = World.player, [dx, dy] = DIRS[p.dir];
      p.x -= dx; p.y -= dy; p.fx = p.x; p.fy = p.y; p.t = 1;
      p.dir = Object.keys(DIRS).find((d) => DIRS[d][0] === -dx && DIRS[d][1] === -dy);
      S.x = p.x; S.y = p.y;
      await say('Gatekeeper', `The road ahead is wild. Earn the ${TOWN_CRESTS[exit.need - 1].name} first.`);
      return;
    }
    busy = true; syncPause();
    await flashIn();
    enterMap(exit.to, exit.tx, exit.ty, World.player.dir);
    busy = false; syncPause();
    if (World.map.town && MAPS[exit.to].town) toast(`Welcome to <b>${esc(World.map.name)}</b>`);
    return;
  }
  save();
  if (await checkSight()) return;
  if (tileAt(x, y) === ',' && World.map.wild && stepsSinceBattle > 2 && teamSize() && Math.random() < 0.13 * (World.mount && World.mount.calm ? 0.5 : 1)) wildEncounter();
}

async function checkSight() {
  const p = World.player;
  for (const n of World.map.npcs) {
    if (!n.trainer || S.beaten[n.id]) continue;
    const [dx, dy] = DIRS[n.dir];
    for (let k = 1; k <= 4; k++) {
      const tx = n.x + dx * k, ty = n.y + dy * k;
      if (tx === p.x && ty === p.y) {
        busy = true; syncPause();
        World.bubbles[n.id] = true;
        await sleep(700);
        World.bubbles[n.id] = false;
        p.dir = Object.keys(DIRS).find((d) => DIRS[d][0] === -dx && DIRS[d][1] === -dy);
        busy = false;
        await trainerBattle(n);
        return true;
      }
      if (!walkable(tx, ty)) break;
    }
  }
  return false;
}

async function interact() {
  musicUnlock();
  if (dialogOpen) { advanceDialog(); return; }
  if (World.paused || World.player.moving) return;
  const [x, y] = facingTile();
  const npc = npcAt(x, y);
  if (npc) {
    const p = World.player;
    npc.dir = Object.keys(DIRS).find((d) => DIRS[d][0] === p.x - npc.x && DIRS[d][1] === p.y - npc.y) || npc.dir;
    if (npc.action === 'travel') { await say(npc.name, 'Hop on! Where would you like to go?'); return openPanel('Travel', renderTravel); }
    if (npc.trainer && !S.beaten[npc.id]) return trainerBattle(npc);
    return say(npc.name, npc.trainer ? npc.trainer.after : npc.lines);
  }
  if (isSign(x, y)) return say('Sign', World.map.signs[`${x},${y}`]);
  const door = doorAt(x, y);
  if (door) return enterBuilding(door);
}

function enterBuilding(b) {
  if (b.action === 'home') openPanel('Home', renderTeam);
  if (b.action === 'hatchery') openPanel('Hatchery', renderHatchery);
  if (b.action === 'market') openPanel('Market', renderMarket);
  if (b.action === 'arena') openPanel('Arena', renderArena);
  if (b.action === 'travel') openPanel('Travel', renderTravel);
}

// ---------- travel ----------
const TOWN_ORDER = ['town', ...TOWN_DEFS.map((d) => d.id)];
function renderTravel(body) {
  body.innerHTML = `<p class="hint">Hop on a cozy coach to any town you've visited.</p>
    <div class="travel-list">${TOWN_ORDER.map((id, i) => {
      const m = MAPS[id], seen = S.visited.includes(id), here = World.mapId === id;
      const t = THEMES[m.theme || 'meadow'];
      return `<div class="travel-row ${seen ? '' : 'locked'}" style="--c1:${t.grass};--c2:${t.canopy[0]}">
        <div class="tr-badge">${crestSVG(i, S.crests > i)}</div>
        <div class="tr-name"><b>${seen ? esc(m.name) : '???'}</b><small>${seen ? (i === 0 ? 'Home town' : `Wild Lv ${m.wild.min}-${m.wild.max}`) : 'Not visited yet'}</small></div>
        ${here ? '<span class="hint">You are here</span>' : seen ? `<button class="btn primary small" data-go="${id}">Travel</button>` : ''}
      </div>`;
    }).join('')}</div>`;
  body.querySelectorAll('[data-go]').forEach((b) => (b.onclick = async () => {
    closePanel();
    busy = true; syncPause();
    await flashIn();
    const id = b.dataset.go, [x, y] = MAPS[id].start;
    enterMap(id, x, y, 'down');
    busy = false; syncPause();
    toast(`Welcome to <b>${esc(MAPS[id].name)}</b>`);
  }));
}

// ---------- team ----------
let selectedSlot = null;

function slotHTML(i) {
  const c = S.team[i] != null ? byUid(S.team[i]) : null;
  if (!c) return `<div class="slot" data-slot="${i}"><span class="num">${i + 1}</span><div class="plus">+</div></div>`;
  const st = creatureStats(c);
  return `<div class="slot filled ${selectedSlot === i ? 'selected' : ''}" data-slot="${i}"><span class="num">${i + 1}</span>
    <div class="art">${art(c)}</div>
    <span>${esc(nameOf(c))}</span><span class="stats-line"><b>${st.atk}</b> / <i>${st.hp}</i> · Lv${c.lvl}</span></div>`;
}

function monCard(c) {
  const sp = SPECIES_BY_ID[c.id];
  return `<div class="mon" data-uid="${c.uid}">${S.team.includes(c.uid) ? '<span class="tag">Team</span>' : ''}${c.shiny ? '<span class="tag shiny">✦</span>' : ''}
    <div class="mini">${art(c)}</div><div>${esc(nameOf(c))}</div>
    <div class="stars-line small">${starText(c)}</div>
    <div class="lv">${ELEMENTS[sp.el].name} · Lv ${c.lvl} · ${c.traits.length}T</div></div>`;
}

let rosterSort = 'level';
function renderTeam(body) {
  if (teamTab === 'charms') return renderCharms(body);
  if (teamTab === 'jobs') return renderJobs(body);
  if (teamTab === 'workshop') return renderWorkshop(body);
  const bonus = elementBonus(teamEntries().filter(Boolean));
  const bonusChips = Object.entries(bonus).map(([el, n]) => `<span class="chip"><span class="dot" style="background:${ELEMENTS[el].color}"></span>${ELEMENTS[el].name} team: +${n}/+${n}</span>`).join('');
  const sorters = { level: (a, b) => b.lvl - a.lvl, stars: (a, b) => stars(b.roll) - stars(a.roll) || b.traits.length - a.traits.length, kind: (a, b) => a.id.localeCompare(b.id) || b.lvl - a.lvl };
  body.innerHTML = `${teamTabs()}
    <p class="hint">#1 fights first. Tap two creatures to swap them, or tap one twice to see it.</p>
    <div class="card" style="margin-top:8px">
      <div class="lineup-labels"><span>◀ Front</span><span>Back ▶</span></div>
      <div class="lineup">${[0, 1, 2, 3, 4].map(slotHTML).join('')}</div>
      <div class="synergies">${bonusChips || '<span class="hint" style="font-size:12px">Put 3 creatures of one element together for a team bonus.</span>'}</div>
    </div>
    <div class="row-head"><h3>All creatures (${S.roster.length})</h3>
      <div class="seg">${['level', 'stars', 'kind'].map((k) => `<button class="${rosterSort === k ? 'on' : ''}" data-sort="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
    <p class="hint" style="font-size:12px;margin-bottom:8px">Stardust: <b>${S.dust}</b> · Earn it by releasing creatures. Spend it to reroll traits.</p>
    <div class="grid">${[...S.roster].sort(sorters[rosterSort]).map(monCard).join('')}</div>`;
  body.querySelectorAll('.slot').forEach((el) => (el.onclick = () => onSlot(Number(el.dataset.slot))));
  body.querySelectorAll('.mon').forEach((el) => (el.onclick = () => showCreature(Number(el.dataset.uid))));
  body.querySelectorAll('[data-sort]').forEach((el) => (el.onclick = () => { rosterSort = el.dataset.sort; refreshPanel(); }));
  bindTeamTabs(body);
}

function onSlot(i) {
  if (selectedSlot === null) {
    if (S.team[i] == null) { toast('Tap a creature below to add it.'); return; }
    selectedSlot = i;
  } else if (selectedSlot === i) {
    selectedSlot = null;
    showCreature(S.team[i]);
  } else {
    [S.team[selectedSlot], S.team[i]] = [S.team[i], S.team[selectedSlot]];
    selectedSlot = null;
    save();
  }
  refreshPanel();
}

function snackCost(c) { return 10 * c.lvl; }
const REROLL_COST = 40, POLISH_COST = 60;

function showCreature(uid, confirmRelease = false) {
  const c = byUid(uid);
  if (!c) return;
  const sp = SPECIES_BY_ID[c.id];
  const stage = evoStage(c.lvl);
  const st = creatureStats(c);
  const inTeam = S.team.includes(uid);
  const unlocked = [...new Set([sp.abilities[Math.min(c.ab || 0, sp.abilities.length - 1)], ...learnsetFor(c.id, c.ab || 0).filter(([l]) => l <= c.lvl).map(([, k]) => k)])].filter((k) => !c.skills.includes(k));
  const upcoming = learnsetFor(c.id, c.ab || 0).filter(([l, k]) => l > c.lvl && !c.skills.includes(k));
  const nextEvo = stage === 0 ? `Grows into ${sp.names[1]} at Lv 10.` : stage === 1 ? `Grows into ${sp.names[2]} at Lv 25.` : 'Fully grown!';
  const beats = ELEMENTS[sp.el].beats.map((e) => ELEMENTS[e].name).join(' & ');
  const twins = S.roster.filter((x) => x.id === c.id && x.uid !== uid);
  const sheet = openModal(`<div class="center">
      ${c.shiny ? '<div class="shiny-banner">✦ Shiny ✦</div>' : ''}
      <div class="big-art">${art(c)}</div>
      <h2>${esc(nameOf(c))}</h2>
      <div class="stars-big static">${starText(c)}</div>
      <div class="synergies" style="justify-content:center">${elChip(sp)}<span class="chip">${ROLES[sp.role].name}</span>
        <span class="chip" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span></div>
    </div>
    <div style="margin-top:12px">Level ${c.lvl} <span class="hint">· ${c.xp}/${xpNeed(c.lvl)} XP · ${nextEvo}</span></div>
    <div class="xpbar"><i style="width:${(100 * c.xp) / xpNeed(c.lvl)}%"></i></div>
    <div class="stats">
      <div class="stat">Attack<b>${st.atk}</b><small>${Math.round(c.roll.a * 100)}% roll</small></div>
      <div class="stat">HP<b>${st.hp}</b><small>${Math.round(c.roll.h * 100)}% roll</small></div>
      <div class="stat wide">Skills (${c.skills.length}/${MAX_SKILLS})
        <div class="skill-list">${c.skills.map((k) => `<div class="skill"><b>${ABILITY[k].name}</b> ${abilityText(k, c.lvl)}</div>`).join('')}</div>
        ${unlocked.length ? `<div class="skill-sub">Unlocked, tap to swap in:</div><div class="skill-list">${unlocked.map((k) => `<button class="skill swap" data-teach="${k}"><b>${ABILITY[k].name}</b> ${abilityText(k, c.lvl)}</button>`).join('')}</div>` : ''}
        ${upcoming.length ? `<div class="skill-sub">Coming up:</div><div class="skill-list">${upcoming.map(([l, k]) => `<div class="skill locked"><b>Lv ${l}</b> ${ABILITY[k].name}</div>`).join('')}</div>` : ''}
      </div>
      <div class="stat wide">Traits<div class="synergies trait-desc">${traitChips(c, true)}</div></div>
      <div class="stat wide">Charms (${c.charms.length}/2)
        <div class="charm-list">${c.charms.map((ch) => charmRow(ch, `<button class="btn small" data-off="${ch.cid}">Take off</button>`)).join('')}</div>
        ${c.charms.length < 2 ? '<button class="btn small block" data-act="charm" style="margin-top:6px">Equip a charm</button>' : ''}
      </div>
      ${isWorking(uid) ? `<div class="stat wide">Working: ${(() => { const j = S.jobs.find((x) => x.uid === uid); return `${SKILLS_LIST[j.kind].name} in ${esc(MAPS[j.town].name)}`; })()}</div>` : ''}
      ${S.items.stew || S.items.feast ? `<div class="stat wide">Food<div class="btn-row" style="margin-top:6px">
        <button class="btn small" data-feed="stew" ${S.items.stew ? '' : 'disabled'}>Level Stew (${S.items.stew})</button>
        <button class="btn small" data-feed="feast" ${S.items.feast ? '' : 'disabled'}>Golden Feast (${S.items.feast})</button></div></div>` : ''}
      <div class="stat wide">Hits ${beats} for extra damage.</div>
    </div>
    <div class="btn-row">
      <button class="btn ${inTeam ? '' : 'green'}" data-act="team">${inTeam ? 'Rest at home' : 'Add to team'}</button>
      <button class="btn primary" data-act="snack" ${c.lvl >= MAX_LEVEL ? 'disabled' : ''}>${c.lvl >= MAX_LEVEL ? 'Max level' : `Snack +1 Lv<br><small>${snackCost(c)} coins</small>`}</button>
    </div>
    <div class="btn-row">
      <button class="btn" data-act="merge" ${twins.length ? '' : 'disabled'}>Merge<br><small>${twins.length ? `${twins.length} other ${esc(sp.names[0])}` : `Needs another ${esc(sp.names[0])}`}</small></button>
      <button class="btn" data-act="reroll">Reroll traits<br><small>${REROLL_COST} stardust</small></button>
    </div>
    <div class="btn-row">
      <button class="btn" data-act="polish">Polish stats<br><small>${POLISH_COST} stardust</small></button>
      <button class="btn" data-act="release">${confirmRelease ? 'Tap again to confirm' : 'Release'}<br><small>+${dustValue(c)} stardust</small></button>
    </div>
    <button class="btn block" data-act="close" style="margin-top:8px">Close</button>`);
  const on = (act, fn) => (sheet.querySelector(`[data-act=${act}]`).onclick = fn);
  on('close', closeModal);
  on('team', () => {
    if (inTeam) {
      if (teamSize() <= 1) { toast('Your team needs at least one creature.'); return; }
      S.team[S.team.indexOf(uid)] = null;
    } else {
      const empty = S.team.indexOf(null);
      if (empty < 0) { toast('Your team is full. Rest someone first.'); return; }
      if (isWorking(uid)) stopJob(uid);
      S.team[empty] = uid;
    }
    save(); closeModal(); refreshPanel();
  });
  on('snack', () => {
    const cost = snackCost(c);
    if (S.coins < cost) { toast(`You need ${cost} coins for a snack.`); return; }
    S.coins -= cost;
    if (c.lvl >= MAX_LEVEL) return;
    setLevel(c, c.lvl + 1);
    save(); updateHud(); refreshPanel();
    if (levelUps.size || evoQueue.length || learnQueue.length) { closeModal(); celebrate().then(() => showCreature(uid)); } else showCreature(uid);
  });
  on('merge', () => { if (twins.length) pickMergeDonor(c, twins); });
  sheet.querySelectorAll('[data-feed]').forEach((b) => (b.onclick = () => feedCreature(c, b.dataset.feed)));
  const cb = sheet.querySelector('[data-act=charm]');
  if (cb) cb.onclick = () => pickCharmFor(c);
  sheet.querySelectorAll('[data-off]').forEach((b) => (b.onclick = () => { unequipCharm(c, c.charms.find((x) => x.cid === Number(b.dataset.off))); showCreature(uid); refreshPanel(); }));
  sheet.querySelectorAll('[data-teach]').forEach((b) => (b.onclick = () => {
    const k = b.dataset.teach;
    if (c.skills.length < MAX_SKILLS) { c.skills.push(k); save(); showCreature(uid); refreshPanel(); }
    else promptLearn(c, k, true);
  }));
  on('reroll', () => {
    if (S.dust < REROLL_COST) { toast(`You need ${REROLL_COST} stardust.`); return; }
    S.dust -= REROLL_COST;
    c.traits = rollTraits(sp, Math.max(1, c.traits.length));
    save(); toast('New traits rolled!'); showCreature(uid); refreshPanel();
  });
  on('polish', () => {
    if (S.dust < POLISH_COST) { toast(`You need ${POLISH_COST} stardust.`); return; }
    S.dust -= POLISH_COST;
    const before = stars(c.roll);
    c.roll = { a: Math.max(c.roll.a, Math.round(Math.random() * 100) / 100), h: Math.max(c.roll.h, Math.round(Math.random() * 100) / 100) };
    save(); toast(stars(c.roll) > before ? 'It sparkles! Stars went up.' : 'Stats polished a little.'); showCreature(uid); refreshPanel();
  });
  on('release', () => {
    if (S.roster.length <= 1) { toast("You can't release your only creature."); return; }
    if (inTeam && teamSize() <= 1) { toast('Add another creature to your team first.'); return; }
    if (!confirmRelease) { showCreature(uid, true); return; }
    if (S.riding === uid) setRiding(null);
    if (isWorking(uid)) stopJob(uid);
    S.charms.push(...c.charms); c.charms = [];
    S.roster = S.roster.filter((x) => x.uid !== uid);
    if (inTeam) S.team[S.team.indexOf(uid)] = null;
    S.dust += dustValue(c);
    save(); closeModal(); refreshPanel();
    toast(`${esc(nameOf(c))} went back to the wild. +${dustValue(c)} stardust`);
  });
}

// Merge: another creature of the same kind joins this one. Keep the better stats,
// gain a level, and pass on one trait or its ability.
function pickMergeDonor(c, twins) {
  const sheet = openModal(`<h2>Merge into ${esc(nameOf(c))}</h2>
    <p class="hint">Pick who to merge in. ${esc(nameOf(c))} keeps the better stats of both, gains a level, and can learn one trait or skill from it.</p>
    <div class="grid" style="margin-top:10px">${twins.map(monCard).join('')}</div>
    <button class="btn block" data-act="back" style="margin-top:12px">Back</button>`);
  sheet.querySelector('[data-act=back]').onclick = () => showCreature(c.uid);
  sheet.querySelectorAll('.mon').forEach((el) => (el.onclick = () => pickMergeGift(c, byUid(Number(el.dataset.uid)))));
}

function pickMergeGift(c, donor) {
  const sp = SPECIES_BY_ID[c.id];
  const gifts = donor.traits.filter((k) => !c.traits.includes(k) && !EXCLUSIVE_TRAITS.some((g) => g.includes(k) && g.some((o) => o !== k && c.traits.includes(o))))
    .map((k) => ({ key: 't:' + k, label: `Learn trait: ${TRAITS[k].name}`, desc: TRAITS[k].desc }));
  for (const k of donor.skills) if (!c.skills.includes(k)) gifts.push({ key: 's:' + k, label: `Learn skill: ${ABILITY[k].name}`, desc: abilityText(k, c.lvl) });
  gifts.push({ key: 'none', label: 'Just merge', desc: 'Keep traits and ability as they are.' });
  const sheet = openModal(`<h2>What should ${esc(nameOf(c))} learn?</h2>
    <p class="hint">${esc(nameOf(donor))} (Lv ${donor.lvl}) will merge in.${c.traits.length >= 3 ? ' Learning a trait replaces one of the current three.' : ''}</p>
    <div class="choice-list">${gifts.map((g) => `<button class="btn block choice" data-g="${g.key}"><b>${g.label}</b><small>${g.desc}</small></button>`).join('')}</div>
    <button class="btn block" data-act="back" style="margin-top:12px">Back</button>`);
  sheet.querySelector('[data-act=back]').onclick = () => showCreature(c.uid);
  sheet.querySelectorAll('[data-g]').forEach((el) => (el.onclick = () => {
    const g = el.dataset.g;
    if (g.startsWith('t:') && c.traits.length >= 3) return pickTraitToReplace(c, donor, g.slice(2));
    doMerge(c, donor, g);
  }));
}

function pickTraitToReplace(c, donor, newTrait) {
  const sheet = openModal(`<h2>Replace which trait?</h2>
    <p class="hint">${TRAITS[newTrait].name}: ${TRAITS[newTrait].desc}</p>
    <div class="choice-list">${c.traits.map((k) => `<button class="btn block choice" data-r="${k}"><b>${TRAITS[k].name}</b><small>${TRAITS[k].desc}</small></button>`).join('')}</div>
    <button class="btn block" data-act="back" style="margin-top:12px">Back</button>`);
  sheet.querySelector('[data-act=back]').onclick = () => pickMergeGift(c, donor);
  sheet.querySelectorAll('[data-r]').forEach((el) => (el.onclick = () => {
    c.traits = c.traits.filter((k) => k !== el.dataset.r);
    doMerge(c, donor, 't:' + newTrait);
  }));
}

function doMerge(c, donor, gift) {
  if (gift.startsWith('t:')) c.traits.push(gift.slice(2));
  if (gift.startsWith('s:')) {
    const k = gift.slice(2);
    if (c.skills.length < MAX_SKILLS) c.skills.push(k); else learnQueue.push({ uid: c.uid, key: k });
  }
  c.roll = { a: Math.max(c.roll.a, donor.roll.a), h: Math.max(c.roll.h, donor.roll.h) };
  c.shiny = c.shiny || donor.shiny;
  setLevel(c, Math.max(c.lvl, donor.lvl) + 1);
  S.charms.push(...(donor.charms || []));
  S.roster = S.roster.filter((x) => x.uid !== donor.uid);
  const di = S.team.indexOf(donor.uid);
  if (di >= 0) S.team[di] = S.team.includes(c.uid) ? null : c.uid;
  save();
  const sheet = openModal(revealHTML(c, 'Merged!', '') + '<button class="btn primary block" data-close style="margin-top:12px">Great!</button>');
  sheet.querySelector('[data-close]').onclick = () => { closeModal(); refreshPanel(); celebrate(); };
  refreshPanel();
}

// ---------- hatchery ----------
function eggCost() { return Math.min(300, S.eggCost); }
const MYSTERY_COST = 350;

function renderHatchery(body) {
  const owned = new Set(S.roster.map((c) => c.id));
  const seen = new Set([...(S.seen || []), ...owned]);
  const regionMax = eggRegionMax();
  body.innerHTML = `
    <div class="egg-pair">
      <div class="card hatch-card">
        <div class="egg-wrap" id="egg-meadow">${eggSVG()}</div>
        <b>Meadow Egg</b>
        <p class="hint" style="font-size:12px">Creatures from ${REGIONS.slice(0, regionMax + 1).map((r) => r.name).join(', ')}.</p>
        <button class="btn primary small" data-egg="meadow">${eggCost()} coins</button>
      </div>
      <div class="card hatch-card">
        <div class="egg-wrap" id="egg-mystery">${eggSVG(false, true)}</div>
        <b>Mystery Egg</b>
        <p class="hint" style="font-size:12px">Any creature from anywhere. Better odds for rare ones.</p>
        <button class="btn primary small" data-egg="mystery">${MYSTERY_COST} coins</button>
      </div>
    </div>
    <p class="hint" style="margin-top:10px">Eggs hatch at Lv 3 with random stars and traits. Every 10th egg is guaranteed to be a great one (${S.pity}/10).</p>
    <h3>Creature book (${owned.size}/${SPECIES.length} befriended)</h3>
    ${REGIONS.map((reg, r) => `<h4 class="region-head">${reg.name}</h4><div class="grid">${SPECIES.filter((sp) => sp.region === r).map((sp) => {
      const known = owned.has(sp.id), met = seen.has(sp.id);
      return `<div class="mon ${known || met ? '' : 'unknown'}"><div class="mini">${creatureSVG(sp, 0)}</div>
        <div>${known || met ? sp.names[0] : '???'}</div><div class="lv">${known ? `${ELEMENTS[sp.el].name} · ${RARITY[sp.rarity].name}` : met ? 'Seen' : ''}</div></div>`;
    }).join('')}</div>`).join('')}`;
  body.querySelectorAll('[data-egg]').forEach((b) => (b.onclick = () => hatch(b.dataset.egg)));
}

function eggRegionMax() { return Math.min(4, 1 + Math.floor(S.crests / 2)); }

function rollEgg(kind) {
  const regionMax = eggRegionMax();
  const list = kind === 'mystery' ? SPECIES : SPECIES.filter((s) => s.region <= regionMax);
  const w = kind === 'mystery' ? { common: 50, rare: 38, epic: 12 } : { common: 70, rare: 25, epic: 5 };
  const rarity = weightedPick(Object.keys(w), (k) => w[k]);
  const pool = list.filter((s) => s.rarity === rarity);
  return rand(pool.length ? pool : list);
}

let hatching = false;
function hatch(kind) {
  if (hatching) return;
  const cost = kind === 'mystery' ? MYSTERY_COST : eggCost();
  if (S.coins < cost) { toast(`You need ${cost} coins. Win battles to earn more!`); return; }
  hatching = true;
  S.coins -= cost;
  if (kind !== 'mystery') S.eggCost += 25;
  S.pity = (S.pity || 0) + 1;
  const good = S.pity >= 10;
  const sp = rollEgg(kind);
  const c = giveCreature(rollCreature(sp.id, 3, { good }));
  if (good || (stars(c.roll) >= 4 && c.traits.length >= 2)) S.pity = 0;
  save(); updateHud();
  const egg = $(kind === 'mystery' ? '#egg-mystery' : '#egg-meadow');
  egg.classList.add('wobble');
  setTimeout(() => {
    egg.innerHTML = eggSVG(true, kind === 'mystery');
    setTimeout(() => {
      hatching = false;
      const note = (good ? 'Lucky egg! ' : '') + (S.team.includes(c.uid) ? 'They joined your team!' : 'Your team is full, so they are resting at Home.');
      const sheet = openModal(revealHTML(c, 'A new friend!', note) + '<button class="btn primary block" data-close style="margin-top:12px">Lovely!</button>');
      sheet.querySelector('[data-close]').onclick = () => { closeModal(); refreshPanel(); };
    }, 350);
  }, 1200);
}

// ---------- market ----------
function renderMarket(body) {
  body.innerHTML = `
    <div class="mayor"><div class="mini">${creatureSVG(SPECIES_BY_ID.shellby, 1)}</div><div>Welcome, dear! Sweet Berries make shy wild creatures much more likely to join you.</div></div>
    <div class="card shop-row">
      <span class="berry-big"></span>
      <div><b>Sweet Berry</b><div class="hint">15 coins · You have ${S.berries}</div></div>
      <button class="btn primary small" data-buy="1">Buy 1</button>
      <button class="btn small" data-buy="5">Buy 5</button>
    </div>
    <div class="card shop-row" style="margin-top:10px">
      <span class="bike-big">${ICONS.bike}</span>
      <div><b>Bicycle</b><div class="hint">${S.bike ? 'You own one! Tap Ride to hop on.' : `${BIKE_COST} coins · Twice as fast as walking`}</div></div>
      ${S.bike ? '' : '<button class="btn primary small" id="buy-bike">Buy</button>'}
    </div>
    <p class="hint" style="margin-top:14px">Creatures at Lv ${MOUNT_LEVEL}+ can be ridden too. Some can cross water or lava.</p>`;
  const bb = $('#buy-bike');
  if (bb) bb.onclick = () => {
    if (S.coins < BIKE_COST) { toast(`You need ${BIKE_COST} coins.`); return; }
    S.coins -= BIKE_COST; S.bike = true; save(); updateHud(); refreshPanel();
    sfx('bell'); toast('You got a Bicycle! Tap <b>Ride</b> to hop on.');
  };
  body.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
    const n = Number(b.dataset.buy), cost = 15 * n;
    if (S.coins < cost) { toast(`You need ${cost} coins.`); return; }
    S.coins -= cost; S.berries += n; save(); updateHud(); refreshPanel();
    toast(`Bought ${n} Sweet Berr${n > 1 ? 'ies' : 'y'}!`);
  }));
}

// ---------- jobs and skilling ----------
const JOB_CAP_HOURS = 8;
function skillNeed(l) { return Math.round(25 * Math.pow(l, 1.5)); }
function addSkillXp(key, xp) {
  const sk = S.skills[key];
  if (sk.lvl >= 99) return;
  sk.xp += xp;
  let up = false;
  while (sk.lvl < 99 && sk.xp >= skillNeed(sk.lvl)) { sk.xp -= skillNeed(sk.lvl); sk.lvl++; up = true; }
  if (up) { sfx('ding'); toast(`${SKILLS_LIST[key].name} is now level <b>${sk.lvl}</b>!`); }
}
function jobSlots() {
  const g = S.skills.mining.lvl + S.skills.fishing.lvl + S.skills.foraging.lvl;
  return Math.min(6, 3 + Math.floor((g - 3) / 30));
}
function townTier(id) { return Math.max(0, TOWN_ORDER.indexOf(id)); }
function jobRate(job, c) {
  const sp = SPECIES_BY_ID[c.id];
  const match = JOB_ELEMENTS[job.kind].includes(sp.el) ? 1.5 : 1;
  return 6 * (1 + townTier(job.town) * 0.3) * (1 + c.lvl / 40) * match * (1 + (S.skills[job.kind].lvl - 1) * 0.02);
}
function jobStored(job) {
  const c = byUid(job.uid);
  if (!c) return 0;
  const hours = Math.min(JOB_CAP_HOURS, (Date.now() - job.since) / 3.6e6);
  return Math.floor(jobRate(job, c) * hours);
}
function collectJob(job) {
  const c = byUid(job.uid), n = jobStored(job);
  if (!c || n <= 0) return { n: 0, gems: 0 };
  const make = SKILLS_LIST[job.kind].makes;
  S.res[make] += n;
  let gems = 0;
  if (job.kind === 'mining') { const p = 0.04 + townTier(job.town) * 0.006; for (let i = 0; i < n; i++) if (Math.random() < p) gems++; S.res.gems += gems; }
  addSkillXp(job.kind, n * 4);
  addXp(c, n * 2);
  job.since = Date.now();
  return { n, gems, make };
}
function isWorking(uid) { return S.jobs.some((j) => j.uid === uid); }
function stopJob(uid) { const j = S.jobs.find((x) => x.uid === uid); if (j) collectJob(j); S.jobs = S.jobs.filter((x) => x.uid !== uid); save(); }

function resIcon(k, size = 22) {
  const c = RESOURCES[k].color, ink = '#5b4636';
  const shapes = {
    ore: `<path d="M5 17 L8 8 L15 5 L20 11 L18 18 L10 20 Z" fill="${c}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 10 L13 9 M14 14 L16 13" stroke="#fffaf0" stroke-width="1.6" stroke-linecap="round"/>`,
    fish: `<path d="M3 12 C7 6 14 6 18 12 C14 18 7 18 3 12 Z M18 12 L22 8 V16 Z" fill="${c}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="11" r="1.2" fill="${ink}"/>`,
    herbs: `<path d="M12 21 V10 M12 13 C6 13 4 8 5 4 C10 4 12 8 12 13 Z M12 11 C17 11 20 7 19 3 C14 3 12 7 12 11 Z" fill="${c}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>`,
    gems: `<path d="M6 4 H18 L22 9 L12 21 L2 9 Z" fill="${c}" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 9 H22 M8 4 L12 21 L16 4" fill="none" stroke="${ink}" stroke-width="1.2" opacity=".5"/>`,
  };
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${shapes[k]}</svg>`;
}
function resBar() {
  return `<div class="res-bar">${Object.keys(RESOURCES).map((k) => `<span class="res">${resIcon(k)}<b data-res="${k}">${S.res[k].toLocaleString()}</b></span>`).join('')}</div>`;
}

function renderJobs(body) {
  const slots = jobSlots();
  const skillRows = ['mining', 'fishing', 'foraging', 'cooking', 'smithing'].map((k) => {
    const sk = S.skills[k];
    return `<div class="skill-row"><b>${SKILLS_LIST[k].name}</b><span class="sk-lv">Lv ${sk.lvl}</span><div class="xpbar"><i style="width:${sk.lvl >= 99 ? 100 : (100 * sk.xp) / skillNeed(sk.lvl)}%"></i></div></div>`;
  }).join('');
  const jobCards = S.jobs.map((j) => {
    const c = byUid(j.uid);
    if (!c) return '';
    const stored = jobStored(j), rate = jobRate(j, c), cap = Math.floor(rate * JOB_CAP_HOURS);
    const make = SKILLS_LIST[j.kind].makes;
    return `<div class="job-card"><div class="mini">${art(c)}</div>
      <div class="job-mid"><b>${esc(nameOf(c))}</b> <span class="hint">· ${SKILLS_LIST[j.kind].name} in ${esc(MAPS[j.town].name)}</span>
        <div class="xpbar"><i style="width:${Math.min(100, (100 * stored) / Math.max(1, cap))}%"></i></div>
        <small>${resIcon(make, 14)} ${stored} ready · ${rate.toFixed(1)}/hour · holds ${JOB_CAP_HOURS}h</small></div>
      <div class="cr-btns"><button class="btn small primary" data-collect="${j.uid}" ${stored ? '' : 'disabled'}>Collect</button><button class="btn small" data-stop="${j.uid}">Stop</button></div></div>`;
  }).join('');
  const empty = Math.max(0, slots - S.jobs.length);
  body.innerHTML = `${teamTabs()}
    ${resBar()}
    <p class="hint">Creatures resting at home can work in towns you've visited. They gather while you play and while you're away (up to ${JOB_CAP_HOURS} hours), and slowly gain XP.</p>
    <div class="row-head"><h3>Helpers (${S.jobs.length}/${slots})</h3>${S.jobs.some((j) => jobStored(j)) ? '<button class="btn small primary" id="collect-all">Collect all</button>' : ''}</div>
    <div class="job-list">${jobCards}${Array.from({ length: empty }, () => '<button class="job-card empty" data-new>+ Start a job</button>').join('')}</div>
    <h3>Skills</h3><div class="card skills-card">${skillRows}<p class="hint" style="font-size:12px;margin-top:6px">Gathering skills raise yields. Higher total gathering levels unlock more helper slots.</p></div>`;
  bindTeamTabs(body);
  const doCollect = (jobs) => {
    const got = { ore: 0, fish: 0, herbs: 0, gems: 0 };
    const before = { ...S.res };
    for (const j of jobs) { const r = collectJob(j); if (r.n) { got[r.make] += r.n; got.gems += r.gems; } }
    save();
    if (!Object.values(got).some(Boolean)) return;
    sfx('coin');
    refreshPanel();
    const bar = $('#panel-body');
    for (const k of Object.keys(got)) if (got[k]) { const el = bar.querySelector(`[data-res="${k}"]`); if (el) { countUp(el, before[k], S.res[k], 800); restartClass(el.parentElement, 'pill-bump', 500); } }
    toast(`Collected ${Object.entries(got).filter(([, v]) => v).map(([k, v]) => `${v} ${RESOURCES[k].name.toLowerCase()}`).join(', ')}!`);
    setTimeout(celebrate, 900);
  };
  body.querySelectorAll('[data-collect]').forEach((b) => (b.onclick = () => doCollect(S.jobs.filter((j) => j.uid === Number(b.dataset.collect)))));
  const all = $('#collect-all'); if (all) all.onclick = () => doCollect(S.jobs);
  body.querySelectorAll('[data-stop]').forEach((b) => (b.onclick = () => { stopJob(Number(b.dataset.stop)); refreshPanel(); }));
  body.querySelectorAll('[data-new]').forEach((b) => (b.onclick = pickJob));
}

function pickJob() {
  const offers = TOWN_ORDER.filter((id) => S.visited.includes(id)).flatMap((id) => (TOWN_JOBS[id] || []).map((kind) => ({ id, kind })));
  const sheet = openModal(`<h2>Pick a job</h2><p class="hint">Later towns pay more. Matching elements work 50% faster.</p>
    <div class="choice-list">${offers.map((o, i) => `<button class="btn block choice" data-o="${i}"><b>${resIcon(SKILLS_LIST[o.kind].makes, 16)} ${SKILLS_LIST[o.kind].name} in ${esc(MAPS[o.id].name)}</b><small>Good for ${JOB_ELEMENTS[o.kind].map((e) => ELEMENTS[e].name).join(', ')} creatures${o.kind === 'mining' ? ' · sometimes finds gems' : ''}</small></button>`).join('')}</div>
    <button class="btn block" data-act="back" style="margin-top:10px">Back</button>`);
  sheet.querySelector('[data-act=back]').onclick = closeModal;
  sheet.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => pickWorker(offers[Number(b.dataset.o)])));
}
function pickWorker(offer) {
  const free = S.roster.filter((c) => !S.team.includes(c.uid) && !isWorking(c.uid))
    .sort((a, b) => (JOB_ELEMENTS[offer.kind].includes(SPECIES_BY_ID[b.id].el) - JOB_ELEMENTS[offer.kind].includes(SPECIES_BY_ID[a.id].el)) || b.lvl - a.lvl);
  const sheet = openModal(`<h2>Who works ${SKILLS_LIST[offer.kind].name.toLowerCase()} in ${esc(MAPS[offer.id].name)}?</h2>
    ${free.length ? `<div class="grid" style="margin-top:8px">${free.map((c) => monCard(c).replace('</div></div>', `</div><div class="lv">${jobRate({ ...offer, town: offer.id }, c).toFixed(1)}/hour</div></div>`)).join('')}</div>`
      : '<p class="hint">Everyone is busy. Only creatures resting at home (not on your team) can work. Befriend or hatch more creatures!</p>'}
    <button class="btn block" data-act="back" style="margin-top:10px">Back</button>`);
  sheet.querySelector('[data-act=back]').onclick = pickJob;
  sheet.querySelectorAll('.mon').forEach((el) => (el.onclick = () => {
    S.jobs.push({ uid: Number(el.dataset.uid), town: offer.id, kind: offer.kind, since: Date.now() });
    save(); closeModal(); sfx('pop', 6); refreshPanel();
    toast(`${esc(nameOf(byUid(Number(el.dataset.uid))))} started ${SKILLS_LIST[offer.kind].name.toLowerCase()}!`);
  }));
}

function renderWorkshop(body) {
  const can = (r) => S.skills[r.skill].lvl >= r.lvl && Object.entries(r.cost).every(([k, v]) => S.res[k] >= v);
  body.innerHTML = `${teamTabs()}
    ${resBar()}
    <p class="hint">Turn what your helpers gather into useful things. Crafting raises Cooking and Smithing.</p>
    <div class="recipe-list">${RECIPES.map((r) => {
      const locked = S.skills[r.skill].lvl < r.lvl;
      return `<div class="recipe ${locked ? 'locked' : ''}">
        <div class="rc-mid"><b>${r.name}</b><small>${r.desc}</small>
          <div class="rc-cost">${Object.entries(r.cost).map(([k, v]) => `<span class="${S.res[k] >= v ? '' : 'short'}">${resIcon(k, 14)} ${v}</span>`).join('')}
          <span class="hint">· ${SKILLS_LIST[r.skill].name} ${locked ? `Lv ${r.lvl} needed` : `+${r.xp} XP`}</span></div></div>
        <button class="btn small primary" data-craft="${r.id}" ${can(r) ? '' : 'disabled'}>Make</button></div>`;
    }).join('')}</div>
    ${S.items.stew || S.items.feast ? `<p class="hint" style="margin-top:10px">In your bag: ${S.items.stew} Level Stew, ${S.items.feast} Golden Feast. Feed them from a creature's page.</p>` : ''}`;
  bindTeamTabs(body);
  body.querySelectorAll('[data-craft]').forEach((b) => (b.onclick = () => craft(RECIPES.find((r) => r.id === b.dataset.craft))));
}
function craft(r) {
  for (const [k, v] of Object.entries(r.cost)) S.res[k] -= v;
  addSkillXp(r.skill, r.xp);
  if (r.id === 'berries') { S.berries += 3; updateHud(); toast('Made 3 Sweet Berries!'); }
  if (r.id === 'stew') { S.items.stew++; toast('Made a Level Stew! Feed it from a creature\'s page.'); }
  if (r.id === 'feast') { S.items.feast++; toast('Made a Golden Feast! Feed it from a creature\'s page.'); }
  if (r.id === 'dust') { S.dust += 40; toast('Made 40 stardust!'); }
  if (r.id === 'charm') {
    const sm = S.skills.smithing.lvl;
    const w = { common: Math.max(20, 70 - sm), rare: 25 + sm * 0.3, epic: 5 + sm * 0.4, legendary: Math.max(0, (sm - 30) * 0.25) };
    const ch = makeCharm(teamPower(), weightedPick(Object.keys(w), (k) => w[k]));
    S.charms.push(ch); lootQueue.push(ch);
  }
  sfx('pop', 8);
  save(); refreshPanel();
  if (lootQueue.length) celebrate();
}
function feedCreature(c, kind) {
  if (!S.items[kind]) return;
  S.items[kind]--;
  setLevel(c, c.lvl + (kind === 'feast' ? 3 : 1));
  save(); closeModal(); refreshPanel();
  celebrate().then(() => showCreature(c.uid));
}

// ---------- mounts ----------
const BIKE_COST = 400, MOUNT_LEVEL = 20;
// Each creature mount has a perk based on its element and how it moves.
function mountPerks(c) {
  const sp = SPECIES_BY_ID[c.id], A = alienOf(sp);
  const swim = sp.el === 'water' || A.move === 'hover';
  const lava = sp.el === 'fire';
  const calm = sp.el === 'leaf' || sp.el === 'shade';
  const speed = sp.el === 'spark' ? 0.1 : 0.12;
  const text = [speed < 0.12 ? 'Extra fast' : 'Fast', swim && 'crosses water', lava && 'crosses lava', calm && 'half as many wild battles'].filter(Boolean).join(' · ');
  return { swim, lava, calm, speed, text };
}
function applyMount() {
  const r = S.riding;
  if (r === 'bike' && S.bike) World.mount = { type: 'bike', speed: 0.13 };
  else if (r != null && r !== 'bike') {
    const c = byUid(r);
    if (c && c.lvl >= MOUNT_LEVEL) World.mount = { type: 'creature', uid: c.uid, id: c.id, stage: evoStage(c.lvl), shiny: c.shiny, ...mountPerks(c) };
    else { S.riding = null; World.mount = null; }
  } else World.mount = null;
  const b = $('#btn-ride');
  if (b) b.classList.toggle('on', !!World.mount);
}
function setRiding(r) {
  // Don't leave the player stuck on water or lava after getting off.
  const p = World.player, c = tileAt(p.x, p.y);
  const prev = S.riding;
  S.riding = r; applyMount();
  if (c === '~' && !canCross(c)) { S.riding = prev; applyMount(); toast("You can't get off here. Head back to land first."); return; }
  save();
  if (World.mount) sfx(World.mount.type === 'bike' ? 'bell' : 'mount');
}
function openRide() {
  if (busy || dialogOpen) return;
  const mounts = S.roster.filter((c) => c.lvl >= MOUNT_LEVEL).sort((a, b) => b.lvl - a.lvl);
  const row = (key, art, name, note, on) => `<button class="ride-row ${on ? 'on' : ''}" data-ride="${key}"><span class="ride-art">${art}</span><span><b>${name}</b><small>${note}</small></span></button>`;
  const sheet = openModal(`<h2>Ride</h2>
    <div class="ride-list">
      ${row('walk', ICONS.walk, 'Walk', 'A gentle stroll.', !S.riding)}
      ${S.bike ? row('bike', ICONS.bike, 'Bicycle', 'Twice as fast. Ding ding!', S.riding === 'bike') : `<div class="ride-row locked"><span class="ride-art">${ICONS.bike}</span><span><b>Bicycle</b><small>Buy one at any Market for ${BIKE_COST} coins.</small></span></div>`}
      ${mounts.map((c) => row(c.uid, art(c), `${esc(nameOf(c))} <span class="hint">Lv ${c.lvl}</span>`, mountPerks(c).text, S.riding === c.uid)).join('')}
      ${mounts.length ? '' : `<p class="hint">Creatures at Lv ${MOUNT_LEVEL} or higher can be ridden. Some can cross water or lava.</p>`}
    </div>
    <button class="btn block" data-close style="margin-top:10px">Close</button>`);
  sheet.querySelector('[data-close]').onclick = closeModal;
  sheet.querySelectorAll('[data-ride]').forEach((b) => (b.onclick = () => {
    const k = b.dataset.ride;
    closeModal();
    setRiding(k === 'walk' ? null : k === 'bike' ? 'bike' : Number(k));
  }));
}

// ---------- arena ----------
function teamPower() { return Math.max(1, Math.round(avgLvl(teamEntries()))); }
function genRivals() {
  const p = teamPower();
  const regions = [0, 1, 2, 3, 4].filter((r) => r <= eggRegionMax());
  const names = [...RIVAL_NAMES].sort(() => Math.random() - 0.5);
  return [{ off: -1, mult: 1, tro: 5 }, { off: 0, mult: 1.5, tro: 10 }, { off: 2, mult: 2.2, tro: 20 }].map((d, i) => {
    const lvl = Math.max(1, p + d.off);
    const size = Math.max(2, Math.min(5, teamSize() + (i === 2 ? 1 : 0)));
    const team = Array.from({ length: size }, () => rollCreature(pickWild(regions).id, lvl));
    return { name: names[i], lvl, team, coins: Math.round((20 + lvl * 5) * d.mult), trophies: d.tro };
  });
}

// Friend codes carry each creature's level, stars, traits, ability and shiny.
function encodeTeam() {
  const t = teamEntries().filter(Boolean).map((c) => [c.id, c.lvl, Math.round(c.roll.a * 100), Math.round(c.roll.h * 100), c.traits.join('.'), c.skills.join('.'), c.shiny ? 1 : 0]);
  const bytes = new TextEncoder().encode(JSON.stringify({ n: S.name || 'Tamer', t }));
  return 'CV3-' + btoa(String.fromCharCode(...bytes));
}
function decodeTeam(code) {
  try {
    code = code.trim();
    if (!/^CV[123]-/.test(code)) return null;
    const bin = atob(code.slice(4));
    const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
    if (!Array.isArray(d.t) || d.t.length > 5) return null;
    const pct = (v) => Math.max(0, Math.min(100, Number(v) || 0)) / 100;
    const team = d.t.filter(Boolean).map((x) => {
      const [id, lvlRaw, a = 50, hh = 50, tr = '', ab = 0, sh = 0] = x;
      const lvl = Math.floor(Number(lvlRaw));
      if (!SPECIES_BY_ID[id] || !(lvl >= 1 && lvl <= 200)) throw new Error('bad');
      const traits = String(tr).split('.').filter((k) => TRAITS[k]).slice(0, 3);
      const lv = Math.min(MAX_LEVEL, lvl);
      const skills = typeof ab === 'string' ? ab.split('.').filter((k) => ABILITY[k]).slice(0, MAX_SKILLS) : defaultSkills(id, lv, Math.max(0, Math.min(1, Number(ab) || 0)));
      return { id, lvl: lv, xp: 0, roll: { a: pct(a), h: pct(hh) }, traits, ab: 0, skills: skills.length ? skills : defaultSkills(id, lv), shiny: !!sh };
    });
    if (!team.length) return null;
    return { name: String(d.n || 'Friend').slice(0, 20), team };
  } catch (e) { return null; }
}

function renderArena(body) {
  if (!S.rivals) { S.rivals = genRivals(); save(); }
  body.innerHTML = `
    <p class="hint">Battle copies of other tamers' teams. You have <b>${S.trophies}</b> trophies.</p>
    <h3>Rival tamers</h3>
    ${S.rivals.map((rv, i) => `<div class="card rival">
      <div class="who"><b>${esc(rv.name)}</b> <span class="hint">· Lv ${rv.lvl}</span>
        <div class="minis">${rv.team.map((m) => `<div class="mini">${art(m)}</div>`).join('')}</div>
        <div class="reward">Win: ${rv.coins} coins · ${rv.trophies} trophies</div></div>
      <button class="btn primary" data-rival="${i}">Battle</button></div>`).join('')}
    <button class="btn block" id="btn-new-rivals">Find new rivals</button>
    <h3>Battle a friend</h3>
    <div class="card">
      <p class="hint">Send your team code to a friend. They paste it into their Crestville to battle a copy of your team, and you can battle theirs.</p>
      <textarea id="my-code" rows="2" readonly></textarea>
      <button class="btn block" id="btn-copy" style="margin-top:8px">Copy my team code</button>
      <div class="code-row"><input type="text" id="friend-code" placeholder="Paste a friend's code" autocomplete="off"><button class="btn primary" id="btn-friend">Battle</button></div>
    </div>
    <p class="hint" style="margin-top:12px;text-align:center">Online matchmaking with other players is coming later.</p>`;
  $('#my-code').value = encodeTeam();
  body.querySelectorAll('[data-rival]').forEach((b) => (b.onclick = () => arenaBattle({ rival: S.rivals[Number(b.dataset.rival)] })));
  $('#btn-new-rivals').onclick = () => { S.rivals = genRivals(); save(); refreshPanel(); };
  $('#btn-copy').onclick = async () => {
    const code = $('#my-code').value;
    try { await navigator.clipboard.writeText(code); toast('Team code copied!'); }
    catch (e) { $('#my-code').select(); toast('Select the code and copy it.'); }
  };
  $('#btn-friend').onclick = () => {
    const f = decodeTeam($('#friend-code').value);
    if (!f) { toast("That code doesn't look right. Check it was copied fully."); return; }
    arenaBattle({ friend: f });
  };
}

async function arenaBattle({ rival, friend }) {
  const foe = rival ? rival.name : friend.name;
  const result = await playBattle(`Arena · vs ${foe}`, rival ? rival.team : friend.team);
  let reward = '';
  if (rival) {
    if (result === 'win') {
      S.coins += rival.coins; S.trophies += rival.trophies; reward = `+${rival.coins} coins · +${rival.trophies} trophies`;
      if (Math.random() < 0.2) { const ch = dropCharm(rival.lvl, 'trainer'); reward += ` · ✦ ${CHARM_RARITY[ch.rarity].name} charm!`; }
    }
    else if (result === 'lose') { S.trophies = Math.max(0, S.trophies - 3); reward = '-3 trophies'; }
    S.rivals = genRivals();
  } else if (result === 'win') { S.coins += 20; reward = '+20 coins'; }
  save(); updateHud();
  const xpRows = awardKills(lastReport, 0.5);
  const title = result === 'win' ? `<div class="result-banner win">You beat ${esc(foe)}!</div>` : result === 'lose' ? `<div class="result-banner lose">${esc(foe)} won this time</div>` : '<div class="result-banner">A tie!</div>';
  await battleFooter(`${title}${reward ? `<p class="hint center">${reward}</p>` : ''}${xpRows}`, [{ key: 'ok', label: 'Back to Arena', cls: 'primary' }]);
  closeBattle();
  refreshPanel();
}

// ---------- intro ----------
function showIntro() {
  let pick = null;
  const sheet = openModal(`
    <h2 class="center" style="font-size:26px">Welcome to Crestville!</h2>
    <div class="mayor"><div class="mini">${creatureSVG(SPECIES_BY_ID.fernwhisk, 2)}</div>
      <div>Hello, new neighbor! I'm Mayor Bramble. Every tamer here starts with one partner. Who will walk with you?</div></div>
    <div class="starters">${STARTERS.map((id) => {
      const sp = SPECIES_BY_ID[id];
      return `<div class="mon" data-pick="${id}"><div class="mini">${creatureSVG(sp, 0)}</div><div>${sp.names[0]}</div><div class="lv">${ELEMENTS[sp.el].name} · ${ROLES[sp.role].name}</div></div>`;
    }).join('')}</div>
    <p class="hint" id="pick-info" style="min-height:40px">Tap a creature to meet it.</p>
    <input type="text" id="tamer-name" maxlength="16" placeholder="Your tamer name" autocomplete="off">
    <button class="btn primary block" id="btn-begin" style="margin-top:12px" disabled>Begin</button>
    <p class="hint center" style="font-size:12px;margin-top:8px">Crestville ${VERSION}</p>`);
  sheet.querySelectorAll('[data-pick]').forEach((el) => (el.onclick = () => {
    pick = el.dataset.pick;
    sheet.querySelectorAll('[data-pick]').forEach((x) => x.classList.toggle('picked', x === el));
    $('#pick-info').innerHTML = `Starts with <b>${SPECIES_BY_ID[pick].abilities.map((k) => ABILITY[k].name).join('</b> or <b>')}</b>, and learns up to 4 skills as it levels (max Lv ${MAX_LEVEL}).`;
    $('#btn-begin').disabled = false;
  }));
  $('#btn-begin').onclick = async () => {
    if (!pick) return;
    S.name = $('#tamer-name').value.trim().slice(0, 16) || 'Tamer';
    const c = giveCreature(rollCreature(pick, 5));
    save(); updateHud();
    const sheet = openModal(revealHTML(c, `Meet your ${esc(nameOf(c))}!`, 'Every creature is one of a kind: its stars, traits and ability are rolled at random.') + '<button class="btn primary block" data-close style="margin-top:12px">Let\'s go!</button>');
    await new Promise((r) => (sheet.querySelector('[data-close]').onclick = r));
    closeModal();
    await say('Mayor Bramble', [
      `Wonderful, ${esc(S.name)}! ${SPECIES_BY_ID[pick].names[0]} already adores you.`,
      'Head north to Meadow Route. Walk through the tall grass to meet wild creatures.',
      'Win a battle and a wild creature might want to join your team. Sweet Berries help!',
    ]);
  };
}

// ---------- settings ----------
let confirmReset = false;
function renderSettings(body) {
  body.innerHTML = `
    <div class="card settings">
      <div class="set-row"><div><b>Music</b><small>Each town has its own song.</small></div>
        <button class="btn small ${S.music ? 'primary' : ''}" id="set-music">${S.music ? 'On' : 'Off'}</button></div>
      <div class="set-row"><div><b>Sound effects</b><small>Level-ups, evolutions and more.</small></div>
        <button class="btn small ${S.sfx !== false ? 'primary' : ''}" id="set-sfx">${S.sfx !== false ? 'On' : 'Off'}</button></div>
      <div class="set-row"><div><b>Battle speed</b><small>How fast battles play out.</small></div>
        <div class="seg">${[1, 2, 3].map((n) => `<button class="${S.speed === n ? 'on' : ''}" data-speed="${n}">${n}×</button>`).join('')}</div></div>
      <div class="set-row"><div><b>Save game</b><small>The game also saves by itself as you play.</small></div>
        <button class="btn small primary" id="set-save">Save</button></div>
    </div>
    <h3>Controls</h3>
    <div class="card"><p class="hint">Drag the stick to walk. Push it all the way out to jog. <b>A</b> talks, reads signs and opens doors.</p></div>
    <h3>Start over</h3>
    <div class="card">
      <p class="hint">Begin a brand-new game with a newly shaped world. Your creatures and progress will be gone.</p>
      <button class="btn block" id="set-reset" style="margin-top:8px">${confirmReset ? 'Tap again to erase and start over' : 'Start a new game'}</button>
    </div>
    <p class="hint center" style="margin-top:14px">Crestville ${VERSION}</p>`;
  $('#set-music').onclick = () => { S.music = !S.music; save(); musicSetEnabled(S.music); refreshPanel(); };
  $('#set-sfx').onclick = () => { S.sfx = S.sfx === false; Sfx.enabled = S.sfx; save(); if (S.sfx) sfx('pop'); refreshPanel(); };
  body.querySelectorAll('[data-speed]').forEach((b) => (b.onclick = () => { S.speed = Number(b.dataset.speed); save(); refreshPanel(); }));
  $('#set-save').onclick = () => { save(); toast('Game saved!'); };
  $('#set-reset').onclick = () => {
    if (!confirmReset) { confirmReset = true; refreshPanel(); return; }
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  };
}

// ---------- input ----------
function setupInput() {
  // Thumbstick: drag anywhere on the left Joy-Con. Push far to run.
  const pad = $('#joy-left'), stick = $('#stick'), knob = $('#knob');
  let pid = null;
  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width * 0.38;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    if (d < R * 0.28) { heldDir = null; World.run = false; return; }
    heldDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    World.run = d > R * 0.92;
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    musicUnlock();
    pid = e.pointerId;
    pad.setPointerCapture(pid);
    stick.classList.add('on');
    moveStick(e);
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === pid) moveStick(e); });
  const release = (e) => {
    if (e.pointerId !== pid) return;
    pid = null; heldDir = null; World.run = false;
    stick.classList.remove('on');
    knob.style.transform = '';
  };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerdown', musicUnlock, { once: true });

  const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (keys[e.key]) { heldDir = keys[e.key]; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') { e.preventDefault(); interact(); }
  });
  window.addEventListener('keyup', (e) => { if (keys[e.key] === heldDir) heldDir = null; });

  $('#btn-a').onclick = interact;
  $('#dialog').onclick = advanceDialog;
  $('#btn-ride').onclick = openRide;
  $('#btn-team').onclick = () => { if (!busy && !dialogOpen) openPanel('Team', renderTeam); };
  $('#btn-settings').onclick = () => { if (!busy && !dialogOpen) openPanel('Settings', renderSettings); };
  $('#panel-close').onclick = closePanel;
  $('#modal').onclick = (e) => { if (e.target.id === 'modal' && S.roster.length) closeModal(); };
  $('#b-speed').onclick = () => { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1; $('#b-speed').textContent = S.speed + '×'; save(); };
  $('#b-skip').onclick = () => { BUI.skip = true; };
}
let heldDir = null;

// Keep the world's held direction in sync with input while not paused.
function inputTick() {
  World.held = World.paused ? null : heldDir;
  requestAnimationFrame(inputTick);
}

// ---------- start ----------
function init() {
  document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = ICONS[el.dataset.icon]));
  $('#version').textContent = VERSION;
  Music.enabled = S.music !== false;
  Sfx.enabled = S.sfx !== false;
  setupInput();
  buildWorld(S.worldSeed);
  save();
  const map = MAPS[S.map] ? S.map : 'town';
  worldInit($('#world'), { onStep, onDoor: (b) => enterBuilding(b), leadCreature });
  // Saves from before random layouts may point at a spot that's now a tree.
  const okSpot = (m, x, y) => { const c = (MAPS[m].tiles[y] || '')[x]; return c && !'T~#BS^'.includes(c) && !MAPS[m].npcs.some((n) => n.x === x && n.y === y); };
  if (okSpot(map, S.x, S.y)) enterMap(map, S.x, S.y, S.dir);
  else enterMap(map, MAPS[map].start[0], MAPS[map].start[1], 'down');
  applyMount();
  if (S.jobs.some((j) => jobStored(j) > 0)) setTimeout(() => toast('Your helpers gathered things while you were away! Collect them in <b>Team → Jobs</b>.'), 1200);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => worldBake());
  updateHud();
  inputTick();
  if (!S.roster.length) showIntro();
}

init();
