// Crestville: state, overworld events, lineup battles, buildings and menus.

const SAVE_KEY = 'crestville-save-v2';

function freshState() {
  return {
    name: '', coins: 60, berries: 2, crests: 0,
    roster: [], team: [null, null, null, null, null], nextUid: 1,
    eggCost: 100, trophies: 0, rivals: null, speed: 1,
    map: 'town', x: MAPS.town.start[0], y: MAPS.town.start[1], dir: 'down', beaten: {},
  };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return Object.assign(freshState(), JSON.parse(raw));
  } catch (e) { /* storage unavailable: start fresh */ }
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
function teamEntries() { return S.team.map((uid) => { const c = uid != null ? byUid(uid) : null; return c ? { id: c.id, lvl: c.lvl } : null; }); }
function teamSize() { return S.team.filter((u) => u != null).length; }
function leadCreature() { const c = S.team.map((u) => u != null && byUid(u)).find(Boolean); return c || null; }

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
function giveCreature(id, lvl = 1) {
  const c = { uid: S.nextUid++, id, lvl, xp: 0 };
  S.roster.push(c);
  const empty = S.team.indexOf(null);
  if (empty >= 0) S.team[empty] = c.uid;
  return c;
}
function rewardTeam(xp, coins) {
  S.coins += coins;
  const grew = [];
  for (const uid of S.team) {
    const c = uid != null && byUid(uid);
    if (c && addXp(c, xp) > 0) grew.push(c);
  }
  save(); updateHud();
  return grew;
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

function makeBattleUI() {
  const lane = $('#lane');
  const els = new Map();
  let slot = 60;
  const el = (u) => els.get(u.key);
  function place(B) {
    const H = lane.clientHeight, mid = H / 2;
    slot = Math.max(34, Math.min(66, (H - 40) / 10));
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
    async setup(B) {
      lane.querySelectorAll('.bu').forEach((e) => e.remove());
      for (const u of [...B.ally, ...B.enemy]) {
        const stage = u.t - 1;
        const e = h(`<div class="bu ${u.side} stage-${stage}"><div class="spr">${creatureSVG(u.sp, stage)}</div>
          <div class="badge-atk">${u.atk}</div><div class="badge-hp">${u.hp}</div>
          <div class="lbl">${esc(u.sp.names[stage])}<small>Lv ${u.lvl}</small></div></div>`);
        lane.appendChild(e);
        els.set(u.key, e);
      }
      place(B);
      await bwait(600);
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

async function playBattle(title, enemy) {
  busy = true; syncPause();
  BUI.skip = false;
  $('#b-title').textContent = title;
  $('#b-speed').textContent = S.speed + '×';
  $('#b-foot').innerHTML = '<p class="hint center">Front fights front. When one faints, the next steps up.</p>';
  $('#battle').classList.remove('hidden');
  await nextFrame();
  const result = await runBattle(teamEntries(), enemy, makeBattleUI());
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
}
function grewText(grew) {
  if (!grew.length) return '';
  return ` · ${grew.length > 1 ? 'Your team' : esc(nameOf(grew[0]))} leveled up!`;
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

async function wildEncounter() {
  busy = true; syncPause();
  const w = World.map.wild;
  const n = randInt(1, Math.max(1, Math.min(w.pack, teamSize())));
  const enemy = [];
  for (let i = 0; i < n; i++) enemy.push({ id: rand(w.pool), lvl: randInt(w.min, w.max) });
  await flashIn();
  const names = [...new Set(enemy.map((e) => SPECIES_BY_ID[e.id].names[evoStage(e.lvl)]))].join(' & ');
  const result = await playBattle(`Wild ${names}!`, enemy);
  stepsSinceBattle = 0;

  if (result === 'win') {
    const lv = avgLvl(enemy);
    const grew = rewardTeam(Math.round(5 + lv * 3), Math.round(4 + lv * 2));
    const pick = rand(enemy);
    await befriend(pick, `<div class="result-banner win">You won!</div><p class="hint center">+${Math.round(5 + lv * 3)} XP · +${Math.round(4 + lv * 2)} coins${grewText(grew)}</p>`);
  } else if (result === 'draw') {
    await battleFooter('<div class="result-banner">A tie!</div><p class="hint center">The wild creatures wandered off.</p>', [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
  } else {
    await battleFooter('<div class="result-banner lose">Your team is worn out</div><p class="hint center">Time to rest at home.</p>', [{ key: 'ok', label: 'Go home', cls: 'primary' }]);
    closeBattle();
    return goHome();
  }
  closeBattle();
}

const JOIN_CHANCE = { common: 0.45, rare: 0.3, epic: 0.15 };

async function befriend(wild, header) {
  const sp = SPECIES_BY_ID[wild.id];
  const name = sp.names[evoStage(wild.lvl)];
  const base = JOIN_CHANCE[sp.rarity];
  const art = `<div style="display:flex;align-items:center;gap:10px;justify-content:center"><div class="mini" style="width:54px;height:54px">${creatureSVG(sp, evoStage(wild.lvl))}</div>
    <p style="text-align:left">The wild <b>${esc(name)}</b> (Lv ${wild.lvl}) is watching you curiously.</p></div>`;
  const buttons = [{ key: 'wave', label: 'Wave hello' }, { key: 'leave', label: 'Leave' }];
  if (S.berries > 0) buttons.unshift({ key: 'berry', label: `Offer berry (${S.berries})`, cls: 'primary' });
  else buttons[0].cls = 'primary';
  const choice = await battleFooter(header + art, buttons);
  if (choice === 'leave') return;
  let chance = base;
  if (choice === 'berry') { S.berries--; chance += 0.35; updateHud(); }
  const joined = Math.random() < chance;
  if (joined) {
    const c = giveCreature(wild.id, wild.lvl);
    save();
    const where = S.team.includes(c.uid) ? 'It joined your team!' : 'Your team is full, so it went to rest at Home.';
    await battleFooter(`<div class="result-banner win">${esc(name)} wants to come along!</div><p class="hint center">${where}</p>`, [{ key: 'ok', label: 'Yay!', cls: 'primary' }]);
  } else {
    await battleFooter(`<div class="result-banner">${esc(name)} scampered off.</div><p class="hint center">${choice === 'berry' ? 'It took the berry though!' : 'Maybe a Sweet Berry would help next time.'}</p>`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
  }
  save();
}

async function trainerBattle(npc) {
  const tr = npc.trainer;
  if (!teamSize()) { await say(npc.name, 'Come back when you have a creature with you!'); return; }
  await say(npc.name, tr.before);
  busy = true; syncPause();
  await flashIn();
  const enemy = tr.team.map(([id, lvl]) => ({ id, lvl }));
  const result = await playBattle(npc.name, enemy);
  stepsSinceBattle = 0;
  if (result === 'win') {
    S.beaten[npc.id] = true;
    const grew = rewardTeam(Math.round((5 + avgLvl(enemy) * 3) * 2.5), tr.coins);
    await battleFooter(`<div class="result-banner win">You beat ${esc(npc.name)}!</div><p class="hint center">+${tr.coins} coins${grewText(grew)}</p>`, [{ key: 'ok', label: 'Continue', cls: 'primary' }]);
    closeBattle();
    await say(npc.name, tr.after);
    if (tr.crest != null && S.crests < tr.crest + 1) { S.crests = tr.crest + 1; save(); updateHud(); showCrest(tr.crest); }
  } else {
    await battleFooter(`<div class="result-banner lose">${esc(npc.name)} won this time</div><p class="hint center">Train up, try a new lineup, and come back.</p>`, [{ key: 'ok', label: 'Go home', cls: 'primary' }]);
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
    <p class="hint">New creatures will start showing up in your eggs at the Hatchery.</p>
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
  const st = creatureStats(c.id, c.lvl);
  return `<div class="slot filled ${selectedSlot === i ? 'selected' : ''}" data-slot="${i}"><span class="num">${i + 1}</span>
    <div class="art">${creatureSVG(SPECIES_BY_ID[c.id], evoStage(c.lvl))}</div>
    <span>${esc(nameOf(c))}</span><span class="stats-line"><b>${st.atk}</b> / <i>${st.hp}</i> · Lv${c.lvl}</span></div>`;
}

function monCard(c) {
  const sp = SPECIES_BY_ID[c.id];
  return `<div class="mon" data-uid="${c.uid}">${S.team.includes(c.uid) ? '<span class="tag">Team</span>' : ''}
    <div class="mini">${creatureSVG(sp, evoStage(c.lvl))}</div><div>${esc(nameOf(c))}</div><div class="lv">${ELEMENTS[sp.el].name} · Lv ${c.lvl}</div></div>`;
}

function renderTeam(body) {
  body.innerHTML = `
    <p class="hint">Battles go in this order: #1 fights first. Tap two creatures to swap them, or tap one twice to see it.</p>
    <div class="card" style="margin-top:8px">
      <div class="lineup-labels"><span>◀ Front</span><span>Back ▶</span></div>
      <div class="lineup">${[0, 1, 2, 3, 4].map(slotHTML).join('')}</div>
      <p class="hint" style="font-size:12px"><b style="color:#c0623f">Orange</b> = attack, <b style="color:#b04a63">pink</b> = HP. Fire beats Leaf, Leaf beats Water, Water beats Fire.</p>
    </div>
    <h3>All creatures (${S.roster.length})</h3>
    <div class="grid">${[...S.roster].sort((a, b) => b.lvl - a.lvl).map(monCard).join('')}</div>`;
  body.querySelectorAll('.slot').forEach((el) => (el.onclick = () => onSlot(Number(el.dataset.slot))));
  body.querySelectorAll('.mon').forEach((el) => (el.onclick = () => showCreature(Number(el.dataset.uid))));
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

function showCreature(uid, confirmRelease = false) {
  const c = byUid(uid);
  if (!c) return;
  const sp = SPECIES_BY_ID[c.id];
  const stage = evoStage(c.lvl);
  const st = creatureStats(c.id, c.lvl);
  const inTeam = S.team.includes(uid);
  const nextEvo = stage === 0 ? `Grows into ${sp.names[1]} at Lv 10.` : stage === 1 ? `Grows into ${sp.names[2]} at Lv 25.` : 'Fully grown!';
  const beats = ELEMENTS[sp.el].beats.map((e) => ELEMENTS[e].name).join(' & ');
  const sheet = openModal(`<div class="center">
      <div class="big-art">${creatureSVG(sp, stage)}</div>
      <h2>${esc(nameOf(c))}</h2>
      <div class="synergies" style="justify-content:center">${elChip(sp)}<span class="chip">${ROLES[sp.role].name}</span>
        <span class="chip" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span></div>
    </div>
    <div style="margin-top:12px">Level ${c.lvl} <span class="hint">· ${c.xp}/${xpNeed(c.lvl)} XP · ${nextEvo}</span></div>
    <div class="xpbar"><i style="width:${(100 * c.xp) / xpNeed(c.lvl)}%"></i></div>
    <div class="stats">
      <div class="stat">Attack<b>${st.atk}</b></div>
      <div class="stat">HP<b>${st.hp}</b></div>
      <div class="stat wide"><b style="display:inline">${ABILITY[c.id].name}</b><br>${abilityText(c.id, c.lvl)}</div>
      <div class="stat wide">Hits ${beats} for 50% extra damage.</div>
    </div>
    <div class="btn-row">
      <button class="btn ${inTeam ? '' : 'green'}" data-act="team">${inTeam ? 'Rest at home' : 'Add to team'}</button>
      <button class="btn primary" data-act="snack">Snack +1 Lv<br><small>${snackCost(c)} coins</small></button>
    </div>
    <div class="btn-row">
      <button class="btn" data-act="release">${confirmRelease ? 'Tap again to say goodbye' : 'Release'}</button>
      <button class="btn" data-act="close">Close</button>
    </div>`);
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
    save(); closeModal(); refreshPanel();
  };
  sheet.querySelector('[data-act=snack]').onclick = () => {
    const cost = snackCost(c);
    if (S.coins < cost) { toast(`You need ${cost} coins for a snack.`); return; }
    S.coins -= cost;
    const old = c.lvl; c.lvl++; announceGrowth(c, old);
    save(); updateHud(); showCreature(uid); refreshPanel();
  };
  sheet.querySelector('[data-act=release]').onclick = () => {
    if (S.roster.length <= 1) { toast("You can't release your only creature."); return; }
    if (inTeam && teamSize() <= 1) { toast('Add another creature to your team first.'); return; }
    if (!confirmRelease) { showCreature(uid, true); return; }
    S.roster = S.roster.filter((x) => x.uid !== uid);
    if (inTeam) S.team[S.team.indexOf(uid)] = null;
    save(); closeModal(); refreshPanel();
    toast(`${esc(nameOf(c))} went back to the wild. Bye bye!`);
  };
}

// ---------- hatchery ----------
function renderHatchery(body) {
  const owned = new Set(S.roster.map((c) => c.id));
  body.innerHTML = `
    <div class="card hatch-card">
      <div class="egg-wrap" id="egg">${eggSVG()}</div>
      <button class="btn primary" id="btn-hatch">Hatch an egg · ${S.eggCost} coins</button>
      <p class="hint" style="margin-top:10px">Eggs hatch at Lv 3. Earning crests adds new kinds of creatures to the eggs.</p>
    </div>
    <h3>Creatures you've met (${owned.size}/${SPECIES.length})</h3>
    <div class="grid">${SPECIES.map((sp) => {
      const known = owned.has(sp.id);
      return `<div class="mon ${known ? '' : 'unknown'}"><div class="mini">${creatureSVG(sp, 0)}</div>
        <div>${known ? sp.names[0] : '???'}</div><div class="lv">${known ? ELEMENTS[sp.el].name : REGIONS[sp.region].name}</div></div>`;
    }).join('')}</div>`;
  $('#btn-hatch').onclick = hatch;
}

function rollEgg() {
  const list = SPECIES.filter((s) => s.region <= Math.min(4, S.crests));
  const roll = Math.random() * 100;
  const rarity = roll < RARITY.epic.weight ? 'epic' : roll < RARITY.epic.weight + RARITY.rare.weight ? 'rare' : 'common';
  const pool = list.filter((s) => s.rarity === rarity);
  return rand(pool.length ? pool : list);
}

let hatching = false;
function hatch() {
  if (hatching) return;
  if (S.coins < S.eggCost) { toast(`You need ${S.eggCost} coins. Win battles to earn more!`); return; }
  hatching = true;
  S.coins -= S.eggCost;
  S.eggCost += 25;
  const sp = rollEgg();
  const c = giveCreature(sp.id, 3);
  save(); updateHud();
  const egg = $('#egg');
  egg.classList.add('wobble');
  setTimeout(() => {
    egg.innerHTML = eggSVG(true);
    setTimeout(() => {
      hatching = false;
      const sheet = openModal(`<div class="center">
        <h2>A new friend!</h2>
        <div class="big-art pop">${creatureSVG(sp, 0)}</div>
        <h2>${esc(nameOf(c))}</h2>
        <div class="synergies" style="justify-content:center">${elChip(sp)}<span class="chip">${ROLES[sp.role].name}</span>
          <span class="chip" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span></div>
        <p class="hint" style="margin-top:10px">${S.team.includes(c.uid) ? 'They joined your team!' : 'Your team is full, so they are resting at Home.'}</p>
        <button class="btn primary block" data-close style="margin-top:14px">Lovely!</button></div>`);
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
  const pool = SPECIES.filter((s) => s.region <= Math.min(4, S.crests + 1));
  const names = [...RIVAL_NAMES].sort(() => Math.random() - 0.5);
  return [{ off: -1, mult: 1, tro: 5 }, { off: 0, mult: 1.5, tro: 10 }, { off: 2, mult: 2.2, tro: 20 }].map((d, i) => {
    const lvl = Math.max(1, p + d.off);
    const size = Math.max(2, Math.min(5, teamSize() + (i === 2 ? 1 : 0)));
    const team = Array.from({ length: size }, () => ({ id: rand(pool).id, lvl }));
    return { name: names[i], lvl, team, coins: Math.round((20 + lvl * 5) * d.mult), trophies: d.tro };
  });
}
function encodeTeam() {
  const data = { n: S.name || 'Tamer', t: teamEntries().map((c) => (c ? [c.id, c.lvl] : 0)) };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return 'CV2-' + btoa(String.fromCharCode(...bytes));
}
function decodeTeam(code) {
  try {
    code = code.trim();
    if (!/^CV[12]-/.test(code)) return null;
    const bin = atob(code.slice(4));
    const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
    if (!Array.isArray(d.t) || d.t.length > 5) return null;
    const team = d.t.map((x) => {
      if (!x) return null;
      const id = x[0], lvl = Math.floor(Number(x[1]));
      if (!SPECIES_BY_ID[id] || !(lvl >= 1 && lvl <= 200)) throw new Error('bad');
      return { id, lvl };
    }).filter(Boolean);
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
        <div class="minis">${rv.team.map((m) => `<div class="mini">${creatureSVG(SPECIES_BY_ID[m.id], evoStage(m.lvl))}</div>`).join('')}</div>
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
  const title = result === 'win' ? `<div class="result-banner win">You beat ${esc(foe)}!</div>` : result === 'lose' ? `<div class="result-banner lose">${esc(foe)} won this time</div>` : '<div class="result-banner">A tie!</div>';
  await battleFooter(`${title}${reward ? `<p class="hint center">${reward}</p>` : ''}`, [{ key: 'ok', label: 'Back to Arena', cls: 'primary' }]);
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
    <button class="btn primary block" id="btn-begin" style="margin-top:12px" disabled>Begin</button>`);
  sheet.querySelectorAll('[data-pick]').forEach((el) => (el.onclick = () => {
    pick = el.dataset.pick;
    sheet.querySelectorAll('[data-pick]').forEach((x) => x.classList.toggle('picked', x === el));
    $('#pick-info').innerHTML = `<b>${ABILITY[pick].name}:</b> ${abilityText(pick, 5)}`;
    $('#btn-begin').disabled = false;
  }));
  $('#btn-begin').onclick = async () => {
    if (!pick) return;
    S.name = $('#tamer-name').value.trim().slice(0, 16) || 'Tamer';
    giveCreature(pick, 5);
    save(); closeModal(); updateHud();
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
