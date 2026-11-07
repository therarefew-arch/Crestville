// Crestville: game state, screens and the battle view.

const SAVE_KEY = 'crestville-save-v1';

function freshState() {
  return {
    name: '', coins: 150, stage: 1, best: 1, crests: 0,
    roster: [], team: [null, null, null, null, null],
    eggCost: 100, trophies: 0, autoPush: true, speed: 1, nextUid: 1, rivals: null,
  };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return Object.assign(freshState(), JSON.parse(raw));
  } catch (e) { /* no storage: start fresh */ }
  return freshState();
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

function toast(msg) {
  const t = h(`<div class="toast">${msg}</div>`);
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

function crestSVG(r, earned) {
  const fill = earned ? REGIONS[r].hill2 : '#efe2c9';
  const star = earned ? `<path d="M12 7 l1.5 3 3.3 .5 -2.4 2.3 .6 3.3 -3 -1.6 -3 1.6 .6 -3.3 -2.4 -2.3 3.3 -.5 Z" fill="#fffaf0"/>` : '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z" fill="${fill}" stroke="#5b4636" stroke-width="1.8" stroke-linejoin="round"/>${star}</svg>`;
}

// ---------- creatures ----------
function byUid(uid) { return S.roster.find((c) => c.uid === uid); }
function nameOf(c) { return SPECIES_BY_ID[c.id].names[evoStage(c.lvl)]; }
function xpNeed(lvl) { return 30 + lvl * 20; }

function announceGrowth(c, oldLvl) {
  const before = evoStage(oldLvl), after = evoStage(c.lvl);
  if (after > before) toast(`✨ ${SPECIES_BY_ID[c.id].names[before]} grew into <b>${nameOf(c)}</b>!`);
}
function addXp(c, xp) {
  const old = c.lvl;
  c.xp += xp;
  while (c.xp >= xpNeed(c.lvl)) { c.xp -= xpNeed(c.lvl); c.lvl++; }
  announceGrowth(c, old);
  return c.lvl - old;
}
function addLevels(c, n) {
  const old = c.lvl;
  c.lvl += n;
  announceGrowth(c, old);
}
function giveCreature(id) {
  const existing = S.roster.find((c) => c.id === id);
  if (existing) { addLevels(existing, 1); return { dup: true, c: existing }; }
  const c = { uid: S.nextUid++, id, lvl: 1, xp: 0 };
  S.roster.push(c);
  const empty = S.team.indexOf(null);
  if (empty >= 0) S.team[empty] = c.uid;
  return { dup: false, c };
}
function teamEntries() {
  return S.team.map((uid) => {
    const c = uid != null ? byUid(uid) : null;
    return c ? { id: c.id, lvl: c.lvl } : null;
  });
}
function teamSize() { return S.team.filter((u) => u != null).length; }

// ---------- world ----------
function regionOf(stage) { return Math.min(REGIONS.length - 1, Math.floor((stage - 1) / 10)); }
function isBoss(stage) { return stage % 10 === 0; }
function poolFor(r) { return SPECIES.filter((s) => s.region <= r); }
function pickWild(r) {
  const list = poolFor(r);
  const weights = list.map((s) => (s.region === r ? 3 : 1) * (s.rarity === 'common' ? 3 : s.rarity === 'rare' ? 2 : 1));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { roll -= weights[i]; if (roll <= 0) return list[i]; }
  return list[list.length - 1];
}
function formation(members) {
  // Tanks go in front, then everyone else in order.
  const sorted = [...members].sort((a, b) => (SPECIES_BY_ID[b.id].role === 'tank') - (SPECIES_BY_ID[a.id].role === 'tank'));
  const team = [null, null, null, null, null];
  sorted.slice(0, 5).forEach((m, i) => (team[i] = m));
  return team;
}
function enemyTeam(stage) {
  const r = regionOf(stage);
  const boss = isBoss(stage);
  const n = boss ? 5 : Math.min(5, 1 + Math.floor((stage + 1) / 2));
  const lvl = Math.max(1, Math.round(1 + (stage - 1) * 0.9)) + (boss ? 2 : 0);
  const members = [];
  for (let i = 0; i < n; i++) members.push({ id: pickWild(r).id, lvl: Math.max(1, lvl + (Math.random() < 0.3 ? -1 : 0)) });
  return formation(members);
}

// ---------- battle view ----------
let cur = null;        // { mode, meta, battle }
let running = false;
let nextTimer = null;
const logLines = [];

function log(msg, cls = '') {
  logLines.push(`<div class="${cls}">${msg}</div>`);
  while (logLines.length > 2) logLines.shift();
  $('#log').innerHTML = logLines.join('');
}

function unitEl(u) {
  const stage = evoStage(u.lvl);
  const el = h(`<div class="unit ${u.side} stage-${stage}">
    <div class="art" style="animation-delay:-${(Math.random() * 2.6).toFixed(2)}s">${creatureSVG(u.sp, stage)}</div>
    <div class="bar"><i></i><b></b></div>
    <div class="ebar"><i></i></div>
    <div class="uname">${esc(u.name)} <small>Lv${u.lvl}</small></div>
  </div>`);
  u.el = el;
  u.hpEl = el.querySelector('.bar i');
  u.shEl = el.querySelector('.bar b');
  u.enEl = el.querySelector('.ebar i');
  return el;
}

function drawScenery(r) {
  const R = REGIONS[r];
  $('#scenery').innerHTML = `<svg viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R.sky[0]}"/><stop offset="1" stop-color="${R.sky[1]}"/></linearGradient></defs>
    <rect width="100" height="160" fill="url(#sky)"/>
    <circle cx="80" cy="18" r="9" fill="#fff4d6" opacity=".9"/>
    <g fill="#fffaf0" opacity=".85"><ellipse cx="22" cy="20" rx="12" ry="4"/><ellipse cx="30" cy="17" rx="7" ry="4"/><ellipse cx="58" cy="34" rx="10" ry="3"/></g>
    <path d="M0 58 Q20 46 42 56 T100 52 V160 H0 Z" fill="${R.hill2}" opacity=".7"/>
    <path d="M0 74 Q30 62 60 74 T100 70 V160 H0 Z" fill="${R.hill}"/>
    <path d="M0 160 V100 Q50 90 100 100 V160 Z" fill="${R.hill}" opacity=".6"/>
    <g fill="#fffaf0" opacity=".8"><circle cx="12" cy="92" r="1.2"/><circle cx="86" cy="84" r="1.2"/><circle cx="40" cy="128" r="1.2"/><circle cx="70" cy="140" r="1.2"/><circle cx="20" cy="150" r="1.2"/></g>
    <g fill="#f39c94" opacity=".7"><circle cx="15" cy="93" r=".8"/><circle cx="72" cy="141" r=".8"/></g>
  </svg>`;
  $('#arena').style.background = R.sky[1];
}

function renderArena() {
  ['#enemy-back', '#enemy-front', '#ally-front', '#ally-back'].forEach((s) => ($(s).innerHTML = ''));
  if (!cur) return;
  const units = [...cur.battle.units].sort((a, b) => a.slot - b.slot);
  for (const u of units) {
    const row = `#${u.side}-${u.front ? 'front' : 'back'}`;
    $(row).appendChild(unitEl(u));
  }
  updateBars();
}

function updateBars() {
  if (!cur) return;
  for (const u of cur.battle.units) {
    if (!u.el) continue;
    u.hpEl.style.width = (100 * u.hp / u.maxHp) + '%';
    u.shEl.style.width = Math.min(100, 100 * u.shield / u.maxHp) + '%';
    u.enEl.style.width = u.energy + '%';
  }
}

function restartClass(el, cls, ms) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  clearTimeout(el['_t' + cls]);
  el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms);
}
function floatText(u, text, cls) {
  if (!u.el) return;
  const f = h(`<span class="float ${cls}">${text}</span>`);
  f.style.marginLeft = (Math.random() * 20 - 10) + 'px';
  u.el.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}

function onBattleEvent(e) {
  switch (e.type) {
    case 'attack': restartClass(e.unit.el, 'lunge', 280); break;
    case 'hit':
      if (e.label) restartClass(e.src.el, 'lunge', 280);
      restartClass(e.target.el, 'hurt', 300);
      floatText(e.target, `-${e.dmg}`, e.tag);
      break;
    case 'skill':
      restartClass(e.unit.el, 'casting', 600);
      log(`${e.unit.side === 'enemy' ? 'Foe ' : ''}<b>${esc(e.unit.name)}</b> used ${e.name}!`);
      break;
    case 'heal': floatText(e.target, `+${e.amount}`, 'heal'); break;
    case 'shield': floatText(e.unit, 'Shield!', 'shield'); break;
    case 'faint': e.unit.el.classList.add('fainted'); break;
    case 'end': setTimeout(() => handleEnd(e.winner), 0); break;
  }
}

function startBattle(mode, enemy, meta) {
  clearTimeout(nextTimer);
  const allies = buildSide(teamEntries(), 'ally');
  const enemies = buildSide(enemy, 'enemy');
  cur = { mode, meta, battle: new Battle(allies, enemies, onBattleEvent) };
  renderArena();
}

function startAdventure() {
  if (!teamSize()) { toast('Add a creature to your team first.'); running = false; updateControls(); return; }
  const stage = S.stage;
  const r = regionOf(stage);
  drawScenery(r);
  startBattle('adventure', enemyTeam(stage), { stage });
  $('#banner').textContent = isBoss(stage) ? `${REGIONS[r].tamer} wants to battle!` : 'Wild creatures appeared!';
  updateStageHead();
}

function handleEnd(winner) {
  if (!cur) return;
  if (cur.mode === 'adventure') {
    const stage = cur.meta.stage;
    const boss = isBoss(stage);
    if (winner === 'ally') {
      const coins = Math.round((12 + stage * 4) * (boss ? 3 : 1));
      const xp = Math.round((15 + stage * 6) * (boss ? 2 : 1));
      S.coins += coins;
      const grew = [];
      for (const uid of S.team) {
        const c = uid != null && byUid(uid);
        if (c && addXp(c, xp) > 0) grew.push(nameOf(c));
      }
      log(`Victory! +${coins} coins, +${xp} XP${grew.length ? ` · ${grew.length > 1 ? 'Team' : esc(grew[0])} leveled up!` : ''}`, 'win');
      if (boss) {
        const r = regionOf(stage);
        if (S.crests < r + 1) { S.crests = r + 1; showCrest(r); }
      }
      S.best = Math.max(S.best, stage + 1);
      if (S.autoPush) S.stage = stage + 1;
    } else {
      log('Your team got tired. Heading back a stage to train.', 'lose');
      S.stage = Math.max(1, stage - 1);
    }
    save();
    updateHeader();
    if ($('#screen-team').classList.contains('active')) renderTeam();
    nextTimer = setTimeout(() => {
      if (running && cur && cur.battle.over && cur.mode === 'adventure') startAdventure();
    }, 1400 / S.speed);
  } else {
    arenaResult(winner);
  }
}

function updateStageHead() {
  const stage = cur && cur.mode === 'adventure' ? cur.meta.stage : S.stage;
  const r = regionOf(stage);
  $('#region-name').textContent = REGIONS[r].name;
  $('#stage-label').innerHTML = `Stage ${stage}${isBoss(stage) ? ' · <span class="boss">Boss</span>' : ''}`;
  $('#crest-row').innerHTML = REGIONS.map((_, i) => crestSVG(i, i < S.crests)).join('');
}

function updateControls() {
  $('#btn-play').textContent = running ? 'Pause' : (cur && !cur.battle.over && cur.mode === 'adventure' ? 'Resume' : 'Start adventure');
  $('#btn-play').classList.toggle('primary', !running);
  $('#btn-speed').textContent = S.speed + '×';
  $('#btn-push').innerHTML = `Auto-advance<br><b>${S.autoPush ? 'On' : 'Off'}</b>`;
}

function updateHeader() {
  $('#coins').textContent = S.coins.toLocaleString();
  $('#crests').textContent = `${S.crests}/5`;
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  if (running && cur && !cur.battle.over) {
    let rem = dt * S.speed;
    while (rem > 0 && !cur.battle.over) {
      const d = Math.min(0.05, rem);
      cur.battle.step(d);
      rem -= d;
    }
    updateBars();
  }
  requestAnimationFrame(frame);
}

// ---------- modal ----------
let modalLocked = false;
function openModal(html, locked = false) {
  $('#sheet').innerHTML = html;
  $('#modal').classList.remove('hidden');
  modalLocked = locked;
  return $('#sheet');
}
function closeModal() { $('#modal').classList.add('hidden'); modalLocked = false; }

function showCrest(r) {
  const next = REGIONS[r + 1];
  const sheet = openModal(`<div class="center">
    <h2>You earned the ${REGIONS[r].crest}!</h2>
    <div class="crest-big">${crestSVG(r, true)}</div>
    <p class="hint">${next ? `The path to <b>${next.name}</b> is open. New creatures live there, and they'll start showing up in your eggs too.` : 'You collected every crest! Crestville is proud of you. Keep climbing for fun.'}</p>
    <button class="btn primary block" data-close style="margin-top:14px">Hooray!</button>
  </div>`);
  sheet.querySelector('[data-close]').onclick = closeModal;
}

// ---------- team screen ----------
let selectedSlot = null;

function slotHTML(i) {
  const c = S.team[i] != null ? byUid(S.team[i]) : null;
  if (!c) return `<div class="slot" data-slot="${i}"><div class="plus">+</div></div>`;
  return `<div class="slot filled ${selectedSlot === i ? 'selected' : ''}" data-slot="${i}">
    <div class="art">${creatureSVG(SPECIES_BY_ID[c.id], evoStage(c.lvl))}</div>
    <span>${esc(nameOf(c))}</span><span class="hint" style="font-size:10px">Lv ${c.lvl}</span></div>`;
}

function monCard(c, extra = '') {
  const sp = SPECIES_BY_ID[c.id];
  const inTeam = S.team.includes(c.uid);
  return `<div class="mon" data-uid="${c.uid}" ${extra}>
    ${inTeam ? '<span class="badge">Team</span>' : ''}
    <div class="mini">${creatureSVG(sp, evoStage(c.lvl))}</div>
    <div>${esc(nameOf(c))}</div>
    <div class="lv"><span class="chip" style="padding:0 6px;font-size:11px"><span class="dot" style="background:${ELEMENTS[sp.el].color}"></span>${ELEMENTS[sp.el].name}</span> Lv ${c.lvl}</div>
  </div>`;
}

function renderTeam() {
  const scr = $('#screen-team');
  const syn = teamSynergy(teamEntries().filter(Boolean).map((c) => c.id));
  scr.innerHTML = `
    <h2>Your team</h2>
    <p class="hint">The front row takes hits first. Tap two creatures to swap their spots.</p>
    <div class="card">
      <div class="formation">
        <div class="frow"><div class="frow-label">Front</div>${slotHTML(0)}${slotHTML(1)}<div class="frow-label"></div></div>
        <div class="frow"><div class="frow-label">Back</div>${slotHTML(2)}${slotHTML(3)}${slotHTML(4)}</div>
      </div>
      <div class="synergies">${syn.labels.length ? syn.labels.map((l) => `<span class="chip">♥ ${l}</span>`).join('') : '<span class="hint">Team bonuses: put 2 or more of the same element or role together.</span>'}</div>
    </div>
    <h3>Your creatures (${S.roster.length})</h3>
    <div class="grid">${[...S.roster].sort((a, b) => b.lvl - a.lvl).map((c) => monCard(c)).join('')}</div>`;

  scr.querySelectorAll('.slot').forEach((el) => (el.onclick = () => onSlot(Number(el.dataset.slot))));
  scr.querySelectorAll('.mon').forEach((el) => (el.onclick = () => showCreature(Number(el.dataset.uid))));
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
  renderTeam();
}

function snackCost(c) { return 15 * c.lvl; }

function showCreature(uid) {
  const c = byUid(uid);
  if (!c) return;
  const sp = SPECIES_BY_ID[c.id];
  const stage = evoStage(c.lvl);
  const st = creatureStats(c.id, c.lvl);
  const skill = SKILLS[sp.role](sp.el);
  const inTeam = S.team.includes(uid);
  const nextEvo = stage === 0 ? `Grows into ${sp.names[1]} at Lv 10.` : stage === 1 ? `Grows into ${sp.names[2]} at Lv 25.` : 'Fully grown!';
  const beats = ELEMENTS[sp.el].beats.map((e) => ELEMENTS[e].name).join(' & ');
  const sheet = openModal(`<div class="center">
      <div class="big-art">${creatureSVG(sp, stage)}</div>
      <h2>${esc(nameOf(c))}</h2>
      <div class="synergies" style="justify-content:center">
        <span class="chip"><span class="dot" style="background:${ELEMENTS[sp.el].color}"></span>${ELEMENTS[sp.el].name}</span>
        <span class="chip">${ROLES[sp.role].name}</span>
        <span class="chip" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span>
      </div>
    </div>
    <div style="margin-top:12px">Level ${c.lvl} <span class="hint">· ${c.xp}/${xpNeed(c.lvl)} XP</span></div>
    <div class="xpbar"><i style="width:${(100 * c.xp) / xpNeed(c.lvl)}%"></i></div>
    <p class="hint">${nextEvo}</p>
    <div class="stats">
      <div class="stat">HP<b>${st.hp}</b></div>
      <div class="stat">Attack<b>${st.atk}</b></div>
      <div class="stat" style="grid-column:span 2">Skill: <b style="display:inline">${skill.name}</b><br>${skill.desc}</div>
      <div class="stat" style="grid-column:span 2">${ROLES[sp.role].desc} Strong against ${beats}.</div>
    </div>
    <div class="btn-row">
      <button class="btn ${inTeam ? '' : 'green'}" data-act="team">${inTeam ? 'Rest (remove)' : 'Add to team'}</button>
      <button class="btn primary" data-act="snack">Snack +1 Lv<br><small>${snackCost(c)} coins</small></button>
    </div>
    <button class="btn block" data-act="close" style="margin-top:8px">Close</button>`);

  sheet.querySelector('[data-act=close]').onclick = closeModal;
  sheet.querySelector('[data-act=team]').onclick = () => {
    if (inTeam) {
      if (teamSize() <= 1) { toast('Your team needs at least one creature.'); return; }
      S.team[S.team.indexOf(uid)] = null;
    } else {
      const empty = S.team.indexOf(null);
      if (empty < 0) { toast('Your team is full. Rest someone first.'); return; }
      S.team[empty] = uid;
    }
    save(); closeModal(); renderTeam();
  };
  sheet.querySelector('[data-act=snack]').onclick = () => {
    const cost = snackCost(c);
    if (S.coins < cost) { toast(`You need ${cost} coins for a snack.`); return; }
    S.coins -= cost;
    addLevels(c, 1);
    save(); updateHeader(); showCreature(uid); renderTeam();
  };
}

// ---------- hatchery ----------
function renderHatchery() {
  const scr = $('#screen-hatchery');
  const r = regionOf(S.best);
  const owned = new Set(S.roster.map((c) => c.id));
  scr.innerHTML = `
    <h2>Hatchery</h2>
    <div class="card hatch-card">
      <div class="egg-wrap" id="egg">${eggSVG()}</div>
      <button class="btn primary" id="btn-hatch">Hatch an egg · ${S.eggCost} coins</button>
      <p class="hint" style="margin-top:10px">Eggs hold creatures from the regions you've reached. A creature you already have grows a level instead.</p>
    </div>
    <h3>Collection (${owned.size}/${SPECIES.length})</h3>
    <div class="grid">${SPECIES.map((sp) => {
      const known = owned.has(sp.id);
      const reachable = sp.region <= r;
      return `<div class="mon ${known ? '' : 'unknown'}"><div class="mini">${creatureSVG(sp, 0)}</div>
        <div>${known ? sp.names[0] : '???'}</div><div class="lv">${known ? ELEMENTS[sp.el].name : reachable ? 'In eggs now' : REGIONS[sp.region].name}</div></div>`;
    }).join('')}</div>`;
  $('#btn-hatch').onclick = hatch;
}

function rollEgg() {
  const list = poolFor(regionOf(S.best));
  let roll = Math.random() * 100, rarity = 'common';
  if (roll < RARITY.epic.weight) rarity = 'epic';
  else if (roll < RARITY.epic.weight + RARITY.rare.weight) rarity = 'rare';
  const pool = list.filter((s) => s.rarity === rarity);
  return rand(pool.length ? pool : list);
}

let hatching = false;
function hatch() {
  if (hatching) return;
  if (S.coins < S.eggCost) { toast(`You need ${S.eggCost} coins. Win a few more battles!`); return; }
  hatching = true;
  S.coins -= S.eggCost;
  S.eggCost += 25;
  const sp = rollEgg();
  const res = giveCreature(sp.id);
  save();
  updateHeader();
  const egg = $('#egg');
  egg.classList.add('wobble');
  setTimeout(() => {
    egg.innerHTML = eggSVG(true);
    setTimeout(() => {
      hatching = false;
      const c = res.c;
      const sheet = openModal(`<div class="center">
        <h2>${res.dup ? 'An old friend!' : 'A new friend!'}</h2>
        <div class="big-art pop">${creatureSVG(sp, evoStage(c.lvl))}</div>
        <h2>${esc(nameOf(c))}</h2>
        <div class="synergies" style="justify-content:center">
          <span class="chip"><span class="dot" style="background:${ELEMENTS[sp.el].color}"></span>${ELEMENTS[sp.el].name}</span>
          <span class="chip">${ROLES[sp.role].name}</span>
          <span class="chip" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span>
        </div>
        <p class="hint" style="margin-top:10px">${res.dup ? `${esc(nameOf(c))} was so happy to see a sibling that it grew to Lv ${c.lvl}.` : S.team.includes(c.uid) ? 'They joined your team!' : 'Your team is full, so they are resting at home. Swap them in from the Team tab.'}</p>
        <button class="btn primary block" data-close style="margin-top:14px">Lovely!</button>
      </div>`);
      sheet.querySelector('[data-close]').onclick = () => { closeModal(); renderHatchery(); };
    }, 350);
  }, 1200);
}

// ---------- arena ----------
function teamPower() {
  const t = teamEntries().filter(Boolean);
  return t.length ? Math.max(1, Math.round(t.reduce((s, c) => s + c.lvl, 0) / t.length)) : 1;
}
function genRivals() {
  const p = teamPower();
  const r = regionOf(S.best);
  const names = [...RIVAL_NAMES].sort(() => Math.random() - 0.5);
  return [
    { off: -1, mult: 1, trophies: 5 },
    { off: 0, mult: 1.5, trophies: 10 },
    { off: 2, mult: 2.2, trophies: 20 },
  ].map((d, i) => {
    const lvl = Math.max(1, p + d.off);
    const members = Array.from({ length: 5 }, () => ({ id: pickWild(r).id, lvl }));
    return { name: names[i], lvl, team: formation(members), coins: Math.round((30 + lvl * 6) * d.mult), trophies: d.trophies };
  });
}

function encodeTeam() {
  const data = { n: S.name || 'Tamer', t: teamEntries().map((c) => (c ? [c.id, c.lvl] : 0)) };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return 'CV1-' + btoa(String.fromCharCode(...bytes));
}
function decodeTeam(code) {
  try {
    code = code.trim();
    if (!code.startsWith('CV1-')) return null;
    const bin = atob(code.slice(4));
    const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
    if (!Array.isArray(d.t) || d.t.length !== 5) return null;
    const team = d.t.map((x) => {
      if (!x) return null;
      const id = x[0], lvl = Math.floor(Number(x[1]));
      if (!SPECIES_BY_ID[id] || !(lvl >= 1 && lvl <= 200)) throw new Error('bad');
      return { id, lvl };
    });
    if (!team.some(Boolean)) return null;
    return { name: String(d.n || 'Friend').slice(0, 20), team };
  } catch (e) { return null; }
}

function renderArenaScreen() {
  if (!S.rivals) { S.rivals = genRivals(); save(); }
  const scr = $('#screen-arena');
  scr.innerHTML = `
    <h2>Arena</h2>
    <p class="hint">Battle copies of other tamers' teams. You have <b>${S.trophies}</b> trophies.</p>
    <h3>Rival tamers</h3>
    ${S.rivals.map((rv, i) => `<div class="card rival">
      <div class="who"><b>${esc(rv.name)}</b> <span class="hint">· Lv ${rv.lvl}</span>
        <div class="minis">${rv.team.filter(Boolean).map((m) => `<div class="mini">${creatureSVG(SPECIES_BY_ID[m.id], evoStage(m.lvl))}</div>`).join('')}</div>
        <div class="reward">Win: ${rv.coins} coins · ${rv.trophies} trophies</div>
      </div>
      <button class="btn primary" data-rival="${i}">Battle</button>
    </div>`).join('')}
    <button class="btn block" id="btn-new-rivals">Find new rivals</button>
    <h3>Battle a friend</h3>
    <div class="card">
      <p class="hint">Send your team code to a friend. They paste it into their Crestville to battle a copy of your team, and you can do the same with theirs.</p>
      <textarea id="my-code" rows="2" readonly></textarea>
      <button class="btn block" id="btn-copy" style="margin-top:8px">Copy my team code</button>
      <div class="code-row"><input type="text" id="friend-code" placeholder="Paste a friend's code" autocomplete="off"><button class="btn primary" id="btn-friend">Battle</button></div>
    </div>
    <p class="hint" style="margin-top:12px;text-align:center">Online matchmaking with other players is coming later.</p>`;

  $('#my-code').value = encodeTeam();
  scr.querySelectorAll('[data-rival]').forEach((b) => (b.onclick = () => {
    const rv = S.rivals[Number(b.dataset.rival)];
    startArena(rv.team, { kind: 'rival', rival: rv });
  }));
  $('#btn-new-rivals').onclick = () => { S.rivals = genRivals(); save(); renderArenaScreen(); };
  $('#btn-copy').onclick = async () => {
    const code = $('#my-code').value;
    try { await navigator.clipboard.writeText(code); toast('Team code copied!'); }
    catch (e) { $('#my-code').select(); toast('Select the code and copy it.'); }
  };
  $('#btn-friend').onclick = () => {
    const f = decodeTeam($('#friend-code').value);
    if (!f) { toast("That code doesn't look right."); return; }
    startArena(f.team, { kind: 'friend', name: f.name });
  };
}

function startArena(team, meta) {
  if (!teamSize()) { toast('Add a creature to your team first.'); return; }
  switchTab('adventure');
  drawScenery(2);
  startBattle('arena', team, meta);
  $('#banner').textContent = `Arena · vs ${meta.kind === 'rival' ? meta.rival.name : meta.name}`;
  logLines.length = 0;
  log('The arena crowd cheers!');
  running = true;
  updateControls();
}

function arenaResult(winner) {
  const meta = cur.meta;
  const won = winner === 'ally';
  const foe = meta.kind === 'rival' ? meta.rival.name : meta.name;
  let reward = '';
  if (meta.kind === 'rival') {
    if (won) { S.coins += meta.rival.coins; S.trophies += meta.rival.trophies; reward = `+${meta.rival.coins} coins · +${meta.rival.trophies} trophies`; }
    else { S.trophies = Math.max(0, S.trophies - 3); reward = '-3 trophies'; }
    S.rivals = genRivals();
  } else if (won) {
    S.coins += 20; reward = '+20 coins';
  }
  save();
  updateHeader();
  running = false;
  updateControls();
  log(won ? `You beat ${esc(foe)}!` : `${esc(foe)} won this time.`, won ? 'win' : 'lose');
  setTimeout(() => {
    const sheet = openModal(`<div class="center">
      <h2>${won ? 'Arena win!' : 'Good try!'}</h2>
      <p class="hint">${won ? `Your team beat ${esc(foe)}.` : `${esc(foe)}'s team was a bit stronger. Train up and try again.`}</p>
      ${reward ? `<p style="margin-top:8px">${reward}</p>` : ''}
      <div class="btn-row">
        <button class="btn" data-act="adv">Adventure</button>
        <button class="btn primary" data-act="arena">Back to Arena</button>
      </div>
    </div>`);
    sheet.querySelector('[data-act=adv]').onclick = () => { closeModal(); cur = null; startAdventure(); running = true; updateControls(); };
    sheet.querySelector('[data-act=arena]').onclick = () => { closeModal(); switchTab('arena'); };
  }, 900);
}

// ---------- intro ----------
function showIntro() {
  let pick = null;
  const sheet = openModal(`
    <h2 class="center" style="font-size:26px">Welcome to Crestville!</h2>
    <div class="mayor"><div class="mini">${creatureSVG(SPECIES_BY_ID.fernwhisk, 2)}</div>
      <div>Hello, new neighbor! I'm Mayor Bramble. The wild creatures around our little town love a kind tamer. Pick a partner to start your journey.</div></div>
    <div class="starters">${STARTERS.map((id) => {
      const sp = SPECIES_BY_ID[id];
      return `<div class="mon" data-pick="${id}"><div class="mini">${creatureSVG(sp, 0)}</div><div>${sp.names[0]}</div>
        <div class="lv">${ELEMENTS[sp.el].name} · ${ROLES[sp.role].name}</div></div>`;
    }).join('')}</div>
    <input type="text" id="tamer-name" maxlength="16" placeholder="Your tamer name" autocomplete="off">
    <button class="btn primary block" id="btn-begin" style="margin-top:12px" disabled>Begin</button>`, true);

  sheet.querySelectorAll('[data-pick]').forEach((el) => (el.onclick = () => {
    pick = el.dataset.pick;
    sheet.querySelectorAll('[data-pick]').forEach((x) => x.classList.toggle('picked', x === el));
    $('#btn-begin').disabled = false;
  }));
  $('#btn-begin').onclick = () => {
    if (!pick) return;
    S.name = $('#tamer-name').value.trim().slice(0, 16) || 'Tamer';
    giveCreature(pick);
    save();
    closeModal();
    updateHeader();
    toast(`${SPECIES_BY_ID[pick].names[0]} is excited to explore! Tap <b>Start adventure</b>.`);
  };
}

// ---------- tabs & setup ----------
function switchTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
  selectedSlot = null;
  if (name === 'team') renderTeam();
  if (name === 'hatchery') renderHatchery();
  if (name === 'arena') renderArenaScreen();
  $('main').scrollTop = 0;
}

function init() {
  document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = ICONS[el.dataset.icon]));
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
  $('#modal').onclick = (e) => { if (e.target.id === 'modal' && !modalLocked) closeModal(); };

  $('#btn-play').onclick = () => {
    if (running) { running = false; }
    else {
      running = true;
      if (!cur || cur.battle.over || cur.mode !== 'adventure') startAdventure();
    }
    updateControls();
  };
  $('#btn-speed').onclick = () => { S.speed = S.speed === 1 ? 2 : 1; save(); updateControls(); };
  $('#btn-push').onclick = () => { S.autoPush = !S.autoPush; save(); updateControls(); };

  drawScenery(regionOf(S.stage));
  updateStageHead();
  updateHeader();
  updateControls();
  log(S.roster.length ? `Welcome back, ${esc(S.name)}!` : '');
  if (!S.roster.length) showIntro();
  requestAnimationFrame(frame);
}

init();
