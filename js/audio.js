// Gentle background music, generated in the browser. Every town has its own key, scale,
// tempo and instrument; a seeded melody makes each song the same every visit.

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], phrygianDom: [0, 1, 4, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9, 12, 14], minorPent: [0, 3, 5, 7, 10, 12, 15],
};

// root: MIDI note. prog: scale degrees (0-based) for each bar. style: 'arp' or 'pad'.
const SONGS = {
  meadow:   { root: 60, scale: 'major',       bpm: 96,  prog: [0, 4, 5, 3], lead: 'triangle', style: 'arp', density: 0.55, seed: 3 },
  willow:   { root: 65, scale: 'lydian',      bpm: 78,  prog: [0, 2, 3, 0], lead: 'sine',     style: 'pad', density: 0.45, seed: 9 },
  sunpetal: { root: 67, scale: 'major',       bpm: 116, prog: [0, 3, 4, 0], lead: 'square',   style: 'arp', density: 0.6,  seed: 14 },
  ember:    { root: 62, scale: 'minor',       bpm: 104, prog: [0, 5, 6, 0], lead: 'sawtooth', style: 'arp', density: 0.55, seed: 21 },
  harbor:   { root: 57, scale: 'mixolydian',  bpm: 100, prog: [0, 6, 3, 0], lead: 'triangle', style: 'arp', density: 0.5,  seed: 30 },
  swamp:    { root: 64, scale: 'dorian',      bpm: 74,  prog: [0, 3, 0, 4], lead: 'sine',     style: 'pad', density: 0.35, seed: 37 },
  lantern:  { root: 70, scale: 'minorPent',   bpm: 70,  prog: [0, 5, 3, 4], lead: 'triangle', style: 'box', density: 0.45, seed: 42 },
  desert:   { root: 64, scale: 'phrygianDom', bpm: 90,  prog: [0, 1, 0, 6], lead: 'triangle', style: 'arp', density: 0.5,  seed: 55 },
  cog:      { root: 60, scale: 'mixolydian',  bpm: 120, prog: [0, 4, 6, 3], lead: 'square',   style: 'arp', density: 0.65, seed: 61 },
  frost:    { root: 62, scale: 'major',       bpm: 70,  prog: [0, 4, 5, 3], lead: 'sine',     style: 'box', density: 0.4,  seed: 70 },
  sky:      { root: 63, scale: 'lydian',      bpm: 84,  prog: [0, 1, 4, 0], lead: 'sine',     style: 'box', density: 0.5,  seed: 77 },
  battle:   { root: 57, scale: 'minor',       bpm: 140, prog: [0, 5, 3, 4], lead: 'square',   style: 'arp', density: 0.7,  seed: 88 },
};

const Music = { ctx: null, master: null, enabled: true, key: null, want: null, song: null, step: 0, next: 0, timer: null };

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function buildSong(def) {
  let s = def.seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const sc = SCALES[def.scale];
  const note = (deg, oct = 0) => def.root + sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (Math.floor(deg / sc.length) + oct);
  const bars = [...def.prog, ...def.prog];
  const steps = [];
  let deg = 2;
  const motif = [];
  for (let b = 0; b < bars.length; b++) {
    const c = bars[b];
    const chord = [note(c, -1), note(c + 2, -1), note(c + 4, -1)];
    for (let i = 0; i < 16; i++) {
      const ev = {};
      if (i === 0 || i === 8) ev.bass = note(c, -2);
      if (def.style === 'pad' && i === 0) ev.pad = chord;
      if (def.style === 'arp' && i % 2 === 0) ev.arp = chord[(i / 2) % 3] + (i % 8 === 6 ? 12 : 0);
      if (def.style === 'box' && i % 4 === 0) ev.arp = chord[(i / 4) % 3] + 12;
      if (i % 2 === 0) {
        // Melody: the second half repeats the first half's tune, ending on the root.
        const key = (b % 4) * 8 + i / 2;
        if (b >= 4 && b < 7) ev.mel = motif[key];
        else if (b === 7 && i >= 8) ev.mel = i === 8 ? note(7) : null;
        else {
          const strong = i % 8 === 0;
          if (rnd() < def.density || strong) {
            deg += Math.round((rnd() - 0.5) * 3.2);
            if (strong) deg = c + [0, 2, 4][Math.floor(rnd() * 3)] + 7;
            deg = Math.max(4, Math.min(13, deg));
            ev.mel = note(deg);
          } else ev.mel = null;
          motif[key] = ev.mel;
        }
      }
      steps.push(ev);
    }
  }
  return { def, steps, stepDur: 60 / def.bpm / 4 };
}

function tone(type, freq, start, dur, vol, attack = 0.01, dest = null, glideTo = null) {
  const ctx = Music.ctx;
  const o = ctx.createOscillator(), gn = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  gn.gain.setValueAtTime(0, start);
  gn.gain.linearRampToValueAtTime(vol, start + attack);
  gn.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(gn); gn.connect(dest || Music.filter);
  o.start(start); o.stop(start + dur + 0.05);
}

function scheduleStep(ev, t, song) {
  const d = song.stepDur, lead = song.def.lead;
  const leadVol = lead === 'square' || lead === 'sawtooth' ? 0.035 : 0.07;
  if (ev.bass) tone('sine', midiHz(ev.bass), t, d * 6, 0.09, 0.02);
  if (ev.pad) for (const n of ev.pad) tone('triangle', midiHz(n), t, d * 15, 0.025, 0.4);
  if (ev.arp) tone(song.def.style === 'box' ? 'sine' : 'triangle', midiHz(ev.arp), t, d * (song.def.style === 'box' ? 5 : 2.2), song.def.style === 'box' ? 0.05 : 0.03);
  if (ev.mel) tone(lead, midiHz(ev.mel), t, d * 2.6, leadVol, 0.015);
}

function tick() {
  const song = Music.song, ctx = Music.ctx;
  if (!song || !ctx) return;
  while (Music.next < ctx.currentTime + 0.25) {
    scheduleStep(song.steps[Music.step], Music.next, song);
    Music.next += song.stepDur;
    Music.step = (Music.step + 1) % song.steps.length;
  }
}

function musicPlay(key) {
  Music.want = key;
  if (!Music.ctx || !Music.enabled || !SONGS[key]) return;
  if (Music.key === key && Music.timer) return;
  Music.key = key;
  Music.song = buildSong(SONGS[key]);
  Music.step = 0;
  Music.next = Music.ctx.currentTime + 0.15;
  const g = Music.master.gain;
  g.cancelScheduledValues(Music.ctx.currentTime);
  g.setValueAtTime(0, Music.ctx.currentTime);
  g.linearRampToValueAtTime(0.8, Music.ctx.currentTime + 1.2);
  if (!Music.timer) Music.timer = setInterval(tick, 60);
}

function musicStop() {
  clearInterval(Music.timer);
  Music.timer = null; Music.key = null;
  if (Music.master) Music.master.gain.setTargetAtTime(0, Music.ctx.currentTime, 0.1);
}

// Browsers only allow sound after the player touches the screen.
function ensureAudio() {
  if (Music.ctx) return Music.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  Music.ctx = new AC();
  Music.master = Music.ctx.createGain();
  Music.master.gain.value = 0;
  Music.filter = Music.ctx.createBiquadFilter();
  Music.filter.type = 'lowpass'; Music.filter.frequency.value = 2600;
  Music.filter.connect(Music.master);
  Music.master.connect(Music.ctx.destination);
  Music.sfx = Music.ctx.createGain();
  Music.sfx.gain.value = 0.9;
  Music.sfx.connect(Music.ctx.destination);
  return Music.ctx;
}

function musicUnlock() {
  if (!ensureAudio()) return;
  if (Music.ctx.state === 'suspended' && Music.ctx.resume) Music.ctx.resume();
  if (Music.enabled && Music.want && !Music.timer) musicPlay(Music.want);
}

function musicSetEnabled(on) {
  Music.enabled = on;
  if (!on) { musicStop(); return; }
  musicUnlock();
  if (Music.want) musicPlay(Music.want);
}

// Turn the music down while something important happens, then back up.
function musicDuck(on) {
  if (!Music.ctx || !Music.master || !Music.timer) return;
  const g = Music.master.gain, t = Music.ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(on ? 0.12 : 0.8, t + (on ? 0.4 : 1.5));
}

// ---------- sound effects ----------
const Sfx = { enabled: true };
function sfx(name, arg = 0) {
  if (!Sfx.enabled || !ensureAudio()) return;
  const t = Music.ctx.currentTime + 0.02, out = Music.sfx;
  const n = (m) => midiHz(m);
  switch (name) {
    case 'levelup':
      [72, 76, 79, 84].forEach((m, i) => tone('triangle', n(m), t + i * 0.08, 0.3, 0.13, 0.005, out));
      [96, 100, 103].forEach((m, i) => tone('sine', n(m), t + 0.36 + i * 0.05, 0.25, 0.05, 0.005, out));
      break;
    case 'pop':
      tone('sine', n(84 + arg), t, 0.12, 0.08, 0.005, out);
      break;
    case 'evostart':
      tone('sine', n(57), t, 1.1, 0.08, 0.05, out, n(69));
      tone('triangle', n(64), t + 0.2, 0.9, 0.04, 0.05, out, n(76));
      break;
    case 'count':
      tone('sine', 620 + arg * 28, t, 0.05, 0.035, 0.003, out);
      break;
    case 'coin':
      tone('square', n(88), t, 0.08, 0.03, 0.003, out);
      tone('square', n(93), t + 0.07, 0.22, 0.03, 0.003, out);
      break;
    case 'ding':
      tone('triangle', n(84), t, 0.35, 0.1, 0.003, out);
      tone('sine', n(91), t + 0.05, 0.4, 0.06, 0.003, out);
      tone('sine', n(96), t + 0.1, 0.45, 0.04, 0.003, out);
      break;
    case 'bighit':
      tone('triangle', n(40), t, 0.25, 0.14, 0.003, out, n(28));
      break;
    case 'tick':
      tone('sine', 380 + arg * 38, t, 0.08, 0.07, 0.004, out);
      break;
    case 'charge':
      tone('triangle', 180, t, arg || 3, 0.05, 0.3, out, 1100);
      break;
    case 'flash':
      tone('sine', 1400, t, 0.4, 0.09, 0.002, out, 2800);
      tone('triangle', n(48), t, 0.6, 0.12, 0.002, out);
      break;
    case 'fanfare': {
      const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74]];
      chords.forEach((ch, i) => ch.forEach((m) => tone('triangle', n(m), t + i * 0.32, 0.4, 0.06, 0.01, out)));
      [72, 76, 79, 84].forEach((m) => tone('triangle', n(m), t + 0.96, 1.6, 0.06, 0.02, out));
      [79, 81, 83, 84, 88].forEach((m, i) => tone('square', n(m), t + i * 0.16, i === 4 ? 1.3 : 0.18, 0.025, 0.005, out));
      tone('sine', n(36), t + 0.96, 1.8, 0.12, 0.02, out);
      break;
    }
  }
}
