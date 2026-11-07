// Crestville: state, overworld events, lineup battles, buildings and menus.

const SAVE_KEY = 'crestville-save-v2';

function freshState() {
  return {
    name: '', coins: 60, berries: 2, crests: 0,
    roster: [], team: [null, null, null, null, null], nextUid: 1,
    eggCost: 100, trophies: 0, rivals: null, speed: 1, dust: 0, pity: 0, seen: [],
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
function restartClass(el, cls, ms) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  clearTimeout(el['_t' + cls]);
  el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms);
}
function crestSVG(r, earned) {
  const fill = earned ? REGIONS[r].hill2 : '#efe2c9';
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
function leadCreature() { return teamEntries().find(Boolean) || null; }
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

function announceGrowth(c, oldLvl) {
  const before = evoStage(oldLvl), after = evoStage(c.lvl);
  if (after > before) toast(`✨ ${SPECIES_BY_ID[c.id].names[before]} grew into <b>${nameOf(c)}</b>!`);
}
function addXp(c, xp) {
  if (c.lvl >= MAX_LEVEL) return 0;
  const old = c.lvl;
  c.xp += Math.round(xp * (c.traits.includes('scholar') ? 1.3 : 1));
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
    if (c.skills.length < MAX_SKILLS) { c.skills.push(key); toast(`${esc(nameOf(c))} learned <b>${ABILITY[key].name}</b>!`); }
    else learnQueue.push({ uid: c.uid, key });
  }
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
  let total = 0;
  for (const k of (report && report.kills) || []) {
    if (k.killerSide !== 'ally') continue;
    const xp = Math.round(killXp(k.victimLvl) * mult);
    total += xp;
    if (earned.has(k.killer)) earned.set(k.killer, earned.get(k.killer) + xp);
  }
  for (const c of team) earned.set(c, earned.get(c) + Math.round(total * 0.2));
  const rows = [];
  for (const [c, xp] of earned) {
    if (!xp) continue;
    const before = c.lvl;
    const capped = c.lvl >= MAX_LEVEL;
    addXp(c, xp);
    rows.push(`<span class="xp-chip">${esc(nameOf(c))} ${capped ? 'max' : `+${Math.round(xp * (c.traits.includes('scholar') ? 1.3 : 1))}`}${c.lvl > before ? ` <b>Lv ${c.lvl}!</b>` : ''}</span>`);
  }
  save();
  return rows.length ? `<div class="xp-row">${rows.join('')}</div>` : '';
}
function giveCoins(n) { n = Math.round(n * coinBonus()); S.coins += n; save(); updateHud(); return n; }

function giveCreature(c) {
  c = { ...c, uid: S.nextUid++, xp: 0 };
  S.roster.push(c);
  const empty = S.team.indexOf(null);
  if (empty >= 0) S.team[empty] = c.uid;
  return c;
}
function coinBonus() { return teamEntries().some((c) => c && c.traits.includes('lucky')) ? 1.25 : 1; }
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
function updateHud() {
  $('#coins').textContent = S.coins.toLocaleString();
  $('#berries').textContent = S.berries;
  $('#crests').textContent = `${S.crests}/5`;
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
    const e = el(u); if (!e) return;
    const f = h(`<span class="float ${cls}">${text}</span>`);
    f.style.marginLeft = (Math.random() * 16 - 8) + 'px';
    e.appendChild(f);
    setTimeout(() => f.remove(), 950);
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
      float(u, `-${n}${tag === 'strong' ? '!' : ''}`, tag);
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
  $('#battle').classList.remove('hidden');
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
  });
}
function closeBattle() {
  $('#battle').classList.add('hidden');
  busy = false; syncPause();
  if (learnQueue.length) setTimeout(processLearnQueue, 50);
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

function pickWild(regions) {
  const list = SPECIES.filter((s) => regions.includes(s.region));
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
    const sp = visitor && i === 0 ? pickWild([0, 1, 2, 3, 4].filter((r) => !w.regions.includes(r))) : pickWild(w.regions);
    enemy.push(rollCreature(sp.id, randInt(w.min, w.max)));
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
    await befriend(pick, `<div class="result-banner win">You won! <span class="hint">+${coins} coins</span></div>${xpRows}`);
  } else if (result === 'draw') {
    await battleFooter(`<div class="result-banner">A tie!</div><p class="hint center">The wild creatures wandered off.</p>${awardKills(lastReport)}`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
  } else {
    await battleFooter(`<div class="result-banner lose">Your team is worn out</div><p class="hint center">Time to rest at home.</p>${awardKills(lastReport)}`, [{ key: 'ok', label: 'Go home', cls: 'primary' }]);
    closeBattle();
    return goHome();
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
  const enemy = tr.team.map(([id, lvl]) => plainCreature(id, lvl));
  const result = await playBattle(npc.name, enemy);
  stepsSinceBattle = 0;
  if (result === 'win') {
    S.beaten[npc.id] = true;
    const xpRows = awardKills(lastReport, 2);
    const coins = giveCoins(tr.coins);
    await battleFooter(`<div class="result-banner win">You beat ${esc(npc.name)}!</div><p class="hint center">+${coins} coins · Trainer battles give double XP</p>${xpRows}`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
    closeBattle();
    await say(npc.name, tr.after);
    if (tr.crest != null && S.crests < tr.crest + 1) { S.crests = tr.crest + 1; save(); updateHud(); showCrest(tr.crest); }
  } else if (result === 'draw') {
    await battleFooter(`<div class="result-banner">A tie!</div><p class="hint center">Talk to ${esc(npc.name)} again for a rematch.</p>${awardKills(lastReport, 2)}`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
    closeBattle();
  } else {
    await battleFooter(`<div class="result-banner lose">${esc(npc.name)} won this time</div><p class="hint center">Train up, try a new lineup, and come back.</p>${awardKills(lastReport, 2)}`, [{ key: 'ok', label: 'Go home', cls: 'primary' }]);
    closeBattle();
    await goHome();
  }
}

async function goHome() {
  busy = true; syncPause();
  await flashIn();
  const [x, y] = MAPS.town.start;
  enterMap('town', x, y, 'down');
  busy = false; syncPause();
  await say('', 'You rested at home. Your team feels cozy and refreshed.');
}

function showCrest(r) {
  const sheet = openModal(`<div class="center">
    <h2>You earned the ${REGIONS[r].crest}!</h2>
    <div class="crest-big">${crestSVG(r, true)}</div>
    <p class="hint">Creatures from ${REGIONS[Math.min(4, r + 1)].name} will now hatch from Meadow Eggs.</p>
    <button class="btn primary block" data-close style="margin-top:14px">Hooray!</button></div>`);
  sheet.querySelector('[data-close]').onclick = closeModal;
}

// ---------- world events ----------
function enterMap(id, x, y, dir) {
  worldLoad(id, x, y, dir);
  S.map = id; S.x = x; S.y = y;
  save(); updateHud();
}

async function onStep(x, y) {
  S.x = x; S.y = y; S.dir = World.player.dir;
  stepsSinceBattle++;
  const exit = World.map.exits.find((e) => e.x === x && e.y === y);
  if (exit) {
    busy = true; syncPause();
    enterMap(exit.to, exit.tx, exit.ty, World.player.dir);
    busy = false; syncPause();
    return;
  }
  save();
  if (await checkSight()) return;
  if (tileAt(x, y) === ',' && World.map.wild && stepsSinceBattle > 2 && teamSize() && Math.random() < 0.13) wildEncounter();
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
  if (dialogOpen) { advanceDialog(); return; }
  if (World.paused || World.player.moving) return;
  const [x, y] = facingTile();
  const npc = npcAt(x, y);
  if (npc) {
    const p = World.player;
    npc.dir = Object.keys(DIRS).find((d) => DIRS[d][0] === p.x - npc.x && DIRS[d][1] === p.y - npc.y) || npc.dir;
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
  const bonus = elementBonus(teamEntries().filter(Boolean));
  const bonusChips = Object.entries(bonus).map(([el, n]) => `<span class="chip"><span class="dot" style="background:${ELEMENTS[el].color}"></span>${ELEMENTS[el].name} team: +${n}/+${n}</span>`).join('');
  const sorters = { level: (a, b) => b.lvl - a.lvl, stars: (a, b) => stars(b.roll) - stars(a.roll) || b.traits.length - a.traits.length, kind: (a, b) => a.id.localeCompare(b.id) || b.lvl - a.lvl };
  body.innerHTML = `
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
    if (learnQueue.length) { processLearnQueue().then(() => showCreature(uid)); } else showCreature(uid);
  });
  on('merge', () => { if (twins.length) pickMergeDonor(c, twins); });
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
  S.roster = S.roster.filter((x) => x.uid !== donor.uid);
  const di = S.team.indexOf(donor.uid);
  if (di >= 0) S.team[di] = S.team.includes(c.uid) ? null : c.uid;
  save();
  const sheet = openModal(revealHTML(c, 'Merged!', '') + '<button class="btn primary block" data-close style="margin-top:12px">Great!</button>');
  sheet.querySelector('[data-close]').onclick = () => { closeModal(); refreshPanel(); processLearnQueue(); };
  refreshPanel();
}

// ---------- hatchery ----------
function eggCost() { return Math.min(300, S.eggCost); }
const MYSTERY_COST = 350;

function renderHatchery(body) {
  const owned = new Set(S.roster.map((c) => c.id));
  const seen = new Set([...(S.seen || []), ...owned]);
  const regionMax = Math.max(1, Math.min(4, S.crests + 1));
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

function rollEgg(kind) {
  const regionMax = Math.max(1, Math.min(4, S.crests + 1));
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
    <p class="hint" style="margin-top:14px">More goods are on the way: gear, charms and outfits.</p>`;
  body.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
    const n = Number(b.dataset.buy), cost = 15 * n;
    if (S.coins < cost) { toast(`You need ${cost} coins.`); return; }
    S.coins -= cost; S.berries += n; save(); updateHud(); refreshPanel();
    toast(`Bought ${n} Sweet Berr${n > 1 ? 'ies' : 'y'}!`);
  }));
}

// ---------- arena ----------
function teamPower() { return Math.max(1, Math.round(avgLvl(teamEntries()))); }
function genRivals() {
  const p = teamPower();
  const regions = [0, 1, 2, 3, 4].filter((r) => r <= Math.min(4, S.crests + 1));
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
    if (result === 'win') { S.coins += rival.coins; S.trophies += rival.trophies; reward = `+${rival.coins} coins · +${rival.trophies} trophies`; }
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

// ---------- input ----------
function setupInput() {
  const dpad = $('#dpad');
  let activeBtn = null;
  const setDir = (btn) => {
    if (activeBtn === btn) return;
    if (activeBtn) activeBtn.classList.remove('on');
    activeBtn = btn;
    if (btn) btn.classList.add('on');
    World.held = btn && !World.paused ? btn.dataset.dir : null;
    heldDir = btn ? btn.dataset.dir : null;
  };
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dpad.setPointerCapture(e.pointerId);
    setDir(e.target.closest('[data-dir]'));
  });
  dpad.addEventListener('pointermove', (e) => {
    if (!activeBtn) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el && el.closest && el.closest('#dpad [data-dir]');
    if (btn) setDir(btn);
  });
  const up = () => setDir(null);
  dpad.addEventListener('pointerup', up);
  dpad.addEventListener('pointercancel', up);
  dpad.addEventListener('contextmenu', (e) => e.preventDefault());

  const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (keys[e.key]) { heldDir = keys[e.key]; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') { e.preventDefault(); interact(); }
  });
  window.addEventListener('keyup', (e) => { if (keys[e.key] === heldDir) heldDir = null; });

  $('#btn-a').onclick = interact;
  $('#dialog').onclick = advanceDialog;
  $('#btn-team').onclick = () => { if (!busy && !dialogOpen) openPanel('Team', renderTeam); };
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
  setupInput();
  const map = MAPS[S.map] ? S.map : 'town';
  worldInit($('#world'), { onStep, onDoor: (b) => enterBuilding(b), leadCreature });
  enterMap(map, S.x, S.y, S.dir);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => worldBake());
  updateHud();
  inputTick();
  if (!S.roster.length) showIntro();
}

init();
