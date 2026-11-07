// Creatures are drawn as soft, outlined "sticker" SVGs built from each species' body,
// ears, element and extra details. Shiny creatures get a different color and sparkles.

const INK = '#5b4636';

function mix(hex, other, t) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

function hueShift(hex, deg) {
  let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  s = Math.max(s, 0.45);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r1) + to(g1) + to(b1);
}

const HEAD_EXTRAS = ['cap', 'tuft', 'horn', 'horns', 'antlers', 'crown', 'clover', 'antenna', 'star', 'petals', 'crystals', 'cloud'];

function creatureSVG(sp, stage = 0, opts = {}) {
  const el = ELEMENTS[sp.el];
  const shiny = !!opts.shiny;
  const body = shiny ? hueShift(el.color, 140) : el.color;
  const dark = shiny ? hueShift(el.dark, 140) : el.dark;
  const belly = mix(body, '#fffaf0', 0.55);
  const light = mix(body, '#ffffff', 0.3);
  const ex = new Set(sp.extras || []);
  let w = sp.role === 'tank' ? 33 : sp.role === 'trickster' ? 27 : 30;
  let top = sp.role === 'striker' ? 31 : 34;
  if (sp.body === 'tall') { w -= 3; top -= 5; }
  if (sp.body === 'wide') { w += 4; top += 3; }
  if (sp.body === 'tiny') { w -= 6; top += 10; }
  const pear = sp.body === 'pear';
  const L = 50 - w, R = 50 + w;
  const S = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
  const back = [], front = [], head = [];

  // ---- behind the body ----
  if (ex.has('wings')) {
    back.push(`<path d="M${L + 4} ${top + 26} C ${L - 20} ${top + 2} ${L - 22} ${top + 42} ${L + 2} ${top + 44} Z" fill="${light}" ${S}/>`);
    back.push(`<path d="M${R - 4} ${top + 26} C ${R + 20} ${top + 2} ${R + 22} ${top + 42} ${R - 2} ${top + 44} Z" fill="${light}" ${S}/>`);
  }
  if (ex.has('mane')) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.95 + i * 0.14), r = w + 4;
      back.push(`<circle cx="${50 + Math.cos(a) * r}" cy="${top + 22 + Math.sin(a) * (r * 0.8)}" r="8" fill="${dark}" ${S}/>`);
    }
  }
  if (ex.has('shell')) {
    back.push(`<circle cx="${R - 4}" cy="${top + 30}" r="16" fill="${mix(dark, '#f6d36b', 0.35)}" ${S}/>`);
    back.push(`<path d="M${R - 4} ${top + 30} m-9 0 a9 9 0 1 0 9 -9 a6 6 0 1 0 6 6" fill="none" ${S}/>`);
  }
  if (ex.has('spikes')) {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.1 + i * 0.2), cx = 50 + Math.cos(a) * (w - 2), cy = top + 28 + Math.sin(a) * 26;
      const ox = Math.cos(a) * 12, oy = Math.sin(a) * 12;
      back.push(`<path d="M${cx - oy * 0.35} ${cy + ox * 0.35} L${cx + ox} ${cy + oy} L${cx + oy * 0.35} ${cy - ox * 0.35} Z" fill="${dark}" ${S}/>`);
    }
  }
  if (ex.has('fin')) back.push(`<path d="M44 ${top + 2} Q52 ${top - 16} 62 ${top + 4} Z" fill="${dark}" ${S}/>`);
  if (ex.has('tendrils')) {
    for (let i = 0; i < 4; i++) { const x = 50 - w * 0.6 + i * (w * 0.4); back.push(`<path d="M${x} 82 q-4 8 0 14 q4 4 0 8" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M${x} 82 q-4 8 0 14 q4 4 0 8" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`); }
  }
  if (ex.has('cloud')) {
    for (const [cx, cy, r] of [[L + 4, 84, 9], [R - 4, 84, 9], [50, 88, 10]]) front.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fffaf0" ${S}/>`);
  }

  // Ears
  if (sp.ears === 'long') {
    back.push(`<ellipse cx="39" cy="${top - 6}" rx="6" ry="16" transform="rotate(-14 39 ${top})" fill="${body}" ${S}/>`);
    back.push(`<ellipse cx="61" cy="${top - 6}" rx="6" ry="16" transform="rotate(14 61 ${top})" fill="${body}" ${S}/>`);
    back.push(`<ellipse cx="39" cy="${top - 4}" rx="2.6" ry="10" transform="rotate(-14 39 ${top})" fill="#f6c2b6"/>`);
    back.push(`<ellipse cx="61" cy="${top - 4}" rx="2.6" ry="10" transform="rotate(14 61 ${top})" fill="#f6c2b6"/>`);
  } else if (sp.ears === 'pointy') {
    back.push(`<path d="M${L + 6} ${top + 12} L${L + 9} ${top - 10} L${L + 24} ${top + 4} Z" fill="${body}" ${S}/>`);
    back.push(`<path d="M${R - 6} ${top + 12} L${R - 9} ${top - 10} L${R - 24} ${top + 4} Z" fill="${body}" ${S}/>`);
  } else if (sp.ears === 'round') {
    back.push(`<circle cx="${L + 10}" cy="${top + 4}" r="9" fill="${body}" ${S}/><circle cx="${R - 10}" cy="${top + 4}" r="9" fill="${body}" ${S}/>`);
    back.push(`<circle cx="${L + 10}" cy="${top + 4}" r="4" fill="#f6c2b6"/><circle cx="${R - 10}" cy="${top + 4}" r="4" fill="#f6c2b6"/>`);
  }

  // Tail for strikers and tricksters
  if ((sp.role === 'striker' || sp.role === 'trickster') && !ex.has('tendrils') && !ex.has('wings')) {
    back.push(`<path d="M${R - 4} 78 C ${R + 14} 76 ${R + 14} 58 ${R + 6} 54" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`);
    back.push(`<path d="M${R - 4} 78 C ${R + 14} 76 ${R + 14} 58 ${R + 6} 54" fill="none" stroke="${body}" stroke-width="3.4" stroke-linecap="round"/>`);
  }

  // ---- head features ----
  const hasHead = HEAD_EXTRAS.some((x) => ex.has(x));
  if (ex.has('cap')) head.push(`<path d="M${L + 2} ${top + 14} C ${L + 2} ${top - 14} ${R - 2} ${top - 14} ${R - 2} ${top + 14} Q50 ${top + 6} ${L + 2} ${top + 14} Z" fill="${sp.el === 'leaf' ? '#d97b68' : '#c79a6b'}" ${S}/><circle cx="${50 - w * 0.4}" cy="${top + 2}" r="3.5" fill="#fffaf0"/><circle cx="${50 + w * 0.3}" cy="${top - 3}" r="3" fill="#fffaf0"/><circle cx="50" cy="${top + 6}" r="2.4" fill="#fffaf0"/>`);
  if (ex.has('tuft')) for (const [dx, dy, r] of [[-6, -2, 5], [0, -7, 6], [6, -2, 5]]) head.push(`<circle cx="${50 + dx}" cy="${top + dy}" r="${r}" fill="${light}" ${S}/>`);
  if (ex.has('horn')) head.push(`<path d="M45 ${top + 3} L50 ${top - 15} L55 ${top + 3} Z" fill="#fff4dc" ${S}/>`);
  if (ex.has('horns')) head.push(`<path d="M${42 - w * 0.2} ${top + 6} Q${36 - w * 0.3} ${top - 10} ${44 - w * 0.4} ${top - 14}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${42 - w * 0.2} ${top + 6} Q${36 - w * 0.3} ${top - 10} ${44 - w * 0.4} ${top - 14}" fill="none" stroke="#fff4dc" stroke-width="3.5" stroke-linecap="round"/><path d="M${58 + w * 0.2} ${top + 6} Q${64 + w * 0.3} ${top - 10} ${56 + w * 0.4} ${top - 14}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${58 + w * 0.2} ${top + 6} Q${64 + w * 0.3} ${top - 10} ${56 + w * 0.4} ${top - 14}" fill="none" stroke="#fff4dc" stroke-width="3.5" stroke-linecap="round"/>`);
  if (ex.has('antlers')) head.push(`<path d="M42 ${top + 2} L36 ${top - 16} M38 ${top - 8} L30 ${top - 12} M37 ${top - 13} L40 ${top - 20} M58 ${top + 2} L64 ${top - 16} M62 ${top - 8} L70 ${top - 12} M63 ${top - 13} L60 ${top - 20}" fill="none" stroke="#a07a55" stroke-width="3.4" stroke-linecap="round"/>`);
  if (ex.has('crown')) head.push(`<path d="M40 ${top + 2} L38 ${top - 10} L44 ${top - 4} L50 ${top - 14} L56 ${top - 4} L62 ${top - 10} L60 ${top + 2} Z" fill="${sp.el === 'water' ? '#f3a9b6' : '#a9d68f'}" ${S}/>`);
  if (ex.has('clover')) for (const [dx, dy] of [[-6, -8], [6, -8], [0, -15]]) head.push(`<circle cx="${50 + dx}" cy="${top + dy}" r="6" fill="#8fc477" ${S}/>`);
  if (ex.has('antenna')) head.push(`<path d="M44 ${top + 1} Q40 ${top - 12} 34 ${top - 14}" fill="none" ${S}/><circle cx="34" cy="${top - 14}" r="3.4" fill="${ex.has('bolts') ? '#f6d36b' : dark}" ${S}/><path d="M56 ${top + 1} Q60 ${top - 12} 66 ${top - 14}" fill="none" ${S}/><circle cx="66" cy="${top - 14}" r="3.4" fill="${ex.has('bolts') ? '#f6d36b' : dark}" ${S}/>`);
  if (ex.has('star')) head.push(`<path d="M50 ${top - 16} l4 8 9 1.3 -6.5 6.3 1.5 9 -8 -4.2 -8 4.2 1.5 -9 -6.5 -6.3 9 -1.3 Z" fill="#f6d36b" ${S}/>`);
  if (ex.has('petals')) for (let i = 0; i < 5; i++) { const a = Math.PI * (1.1 + i * 0.2); head.push(`<ellipse cx="${50 + Math.cos(a) * 12}" cy="${top + 2 + Math.sin(a) * 10}" rx="5" ry="9" transform="rotate(${(a * 180) / Math.PI + 90} ${50 + Math.cos(a) * 12} ${top + 2 + Math.sin(a) * 10})" fill="#f3b6c8" ${S}/>`); }
  if (ex.has('crystals')) head.push(`<path d="M42 ${top + 4} L40 ${top - 8} L46 ${top - 2} Z M48 ${top + 2} L50 ${top - 14} L54 ${top + 2} Z M56 ${top + 4} L62 ${top - 8} L60 ${top + 4} Z" fill="#c8e7ee" ${S}/>`);
  if (!hasHead) {
    if (sp.el === 'leaf') {
      head.push(`<path d="M50 ${top + 1} Q50 ${top - 8} 52 ${top - 12}" fill="none" stroke="${dark}" stroke-width="2.6" stroke-linecap="round"/>`);
      head.push(`<path d="M52 ${top - 12} C 58 ${top - 22} 70 ${top - 18} 70 ${top - 12} C 64 ${top - 6} 56 ${top - 8} 52 ${top - 12} Z" fill="#8fc477" ${S}/>`);
      head.push(`<path d="M51 ${top - 9} C 46 ${top - 18} 36 ${top - 16} 35 ${top - 11} C 40 ${top - 5} 47 ${top - 6} 51 ${top - 9} Z" fill="#a9d68f" ${S}/>`);
    }
    if (sp.el === 'fire') head.push(`<path d="M50 ${top - 18} C 58 ${top - 8} 60 ${top - 2} 56 ${top + 3} C 54 ${top - 2} 52 ${top - 4} 50 ${top - 3} C 48 ${top - 4} 46 ${top - 2} 44 ${top + 3} C 40 ${top - 3} 42 ${top - 10} 50 ${top - 18} Z" fill="#f7c66b" ${S}/>`);
    if (sp.el === 'water') head.push(`<path d="M50 ${top - 16} C 56 ${top - 6} 58 ${top - 2} 50 ${top + 3} C 42 ${top - 2} 44 ${top - 6} 50 ${top - 16} Z" fill="#c4e6ee" ${S}/>`);
    if (sp.el === 'spark') head.push(`<path d="M49 ${top + 2} L45 ${top - 8} L51 ${top - 8} L47 ${top - 18} L57 ${top - 5} L51 ${top - 5} L54 ${top + 2} Z" fill="#fbe7a1" ${S}/>`);
    if (sp.el === 'shade') head.push(`<path d="M44 ${top + 1} Q40 ${top - 12} 34 ${top - 14}" fill="none" ${S}/><circle cx="34" cy="${top - 14}" r="2.6" fill="${dark}"/><path d="M56 ${top + 1} Q60 ${top - 12} 66 ${top - 14}" fill="none" ${S}/><circle cx="66" cy="${top - 14}" r="2.6" fill="${dark}"/>`);
    if (sp.el === 'gear') head.push(`<circle cx="50" cy="${top - 4}" r="7" fill="${light}" ${S}/><circle cx="50" cy="${top - 4}" r="2.4" fill="${INK}"/>`);
  }

  // Feet
  const feet = ex.has('tendrils') || ex.has('cloud') ? '' :
    `<ellipse cx="${50 - w * 0.5}" cy="89" rx="8" ry="5" fill="${dark}" ${S}/><ellipse cx="${50 + w * 0.5}" cy="89" rx="8" ry="5" fill="${dark}" ${S}/>`;

  // Body
  const tw = pear ? w * 0.55 : w * 0.8;
  const bodyPath = `M50 ${top} C ${50 + tw} ${top} ${R} ${top + 16} ${R} ${top + 32} C ${R} ${top + 50} ${50 + w * 0.6} 88 50 88 C ${50 - w * 0.6} 88 ${L} ${top + 50} ${L} ${top + 32} C ${L} ${top + 16} ${50 - tw} ${top} 50 ${top} Z`;
  let marks = '';
  if (ex.has('spots')) marks += `<circle cx="${L + 9}" cy="${top + 22}" r="3.5" fill="${dark}" opacity=".45"/><circle cx="${R - 8}" cy="${top + 30}" r="4.5" fill="${dark}" opacity=".45"/><circle cx="${R - 14}" cy="${top + 16}" r="2.5" fill="${dark}" opacity=".45"/>`;
  if (ex.has('stripes')) for (let i = 0; i < 3; i++) marks += `<path d="M${L + 4} ${top + 30 + i * 9} Q50 ${top + 36 + i * 9} ${R - 4} ${top + 30 + i * 9}" fill="none" stroke="${dark}" stroke-width="4" opacity=".55" stroke-linecap="round"/>`;
  if (ex.has('bolts')) marks += `<rect x="${50 - w * 0.45}" y="${top + 34}" width="${w * 0.9}" height="16" rx="5" fill="${mix(body, '#7a8699', 0.3)}" ${S}/><circle cx="${50 - w * 0.3}" cy="${top + 42}" r="2" fill="${INK}"/><circle cx="${50 + w * 0.3}" cy="${top + 42}" r="2" fill="${INK}"/>`;
  if (ex.has('claws')) marks += `<path d="M${L - 2} ${top + 30} q-10 -6 -6 -14 q6 2 4 8 q4 -6 8 -2 Z" fill="${dark}" ${S}/><path d="M${R + 2} ${top + 30} q10 -6 6 -14 q-6 2 -4 8 q-4 -6 -8 -2 Z" fill="${dark}" ${S}/>`;

  // Face
  const ey = top + 24 + (sp.body === 'tiny' ? -2 : 0);
  let face = '';
  if (ex.has('mask')) face += `<path d="M${L + 6} ${ey - 6} Q50 ${ey - 12} ${R - 6} ${ey - 6} L${R - 8} ${ey + 5} Q50 ${ey} ${L + 8} ${ey + 5} Z" fill="${dark}" opacity=".7"/>`;
  face += `<ellipse cx="42" cy="${ey}" rx="4.6" ry="5.6" fill="#3b2c24"/><circle cx="43.6" cy="${ey - 2}" r="1.7" fill="#fff"/>
    <ellipse cx="58" cy="${ey}" rx="4.6" ry="5.6" fill="#3b2c24"/><circle cx="59.6" cy="${ey - 2}" r="1.7" fill="#fff"/>
    <ellipse cx="35" cy="${ey + 8}" rx="5" ry="3" fill="#f39c94" opacity=".55"/><ellipse cx="65" cy="${ey + 8}" rx="5" ry="3" fill="#f39c94" opacity=".55"/>`;
  if (ex.has('beak')) face += `<path d="M45 ${ey + 6} L55 ${ey + 6} L50 ${ey + 13} Z" fill="#f2b45c" ${S}/>`;
  else if (ex.has('bigmouth')) face += `<path d="M40 ${ey + 8} Q50 ${ey + 17} 60 ${ey + 8}" fill="#e88c7d" ${S}/>`;
  else face += `<path d="M46 ${ey + 8} Q50 ${ey + 12} 54 ${ey + 8}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (ex.has('whiskers')) face += `<path d="M${L + 6} ${ey + 6} l-10 -2 M${L + 6} ${ey + 10} l-10 2 M${R - 6} ${ey + 6} l10 -2 M${R - 6} ${ey + 10} l10 2" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;

  // Evolved stages get a scarf, then a golden crest
  let extra = '';
  if (stage >= 1) extra += `<path d="M${L + 6} ${top + 40} Q50 ${top + 48} ${R - 6} ${top + 40} L${R - 7} ${top + 46} Q50 ${top + 54} ${L + 7} ${top + 46} Z" fill="#e88c7d" ${S}/>`;
  if (stage >= 2) extra += `<path d="M50 ${top + 6} l2.4 4.8 5.2 .8 -3.8 3.6 .9 5.2 -4.7 -2.5 -4.7 2.5 .9 -5.2 -3.8 -3.6 5.2 -.8 Z" fill="#f6d36b" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;

  const sparkle = shiny ? `<g fill="#fff6c9" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round">
    <path d="M14 22 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z"/><path d="M86 40 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z"/></g>` : '';

  return `<svg viewBox="-8 -8 116 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="50" cy="94" rx="${w + 4}" ry="5" fill="#5b4636" opacity=".12"/>
    ${back.join('')}${feet}
    <path d="${bodyPath}" fill="${body}" ${S}/>
    <ellipse cx="50" cy="${top + 40}" rx="${w * 0.55}" ry="${Math.min(13, (88 - top) * 0.25)}" fill="${belly}"/>
    ${marks}${extra}${face}${head.join('')}${front.join('')}${sparkle}
  </svg>`;
}

function eggSVG(cracked = false, mystery = false) {
  const crack = cracked ? `<path d="M22 52 L32 46 L38 54 L48 44 L56 54 L64 46 L72 52 L78 48" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  const shell = mystery ? '#e7def0' : '#fff4dc';
  const dots = mystery
    ? '<path d="M38 36 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="#f6d36b"/><path d="M64 64 l2 5 5 .8 -3.6 3.4 .9 5 -4.3 -2.3 -4.3 2.3 .9 -5 -3.6 -3.4 5 -.8 Z" fill="#bfaed8"/><circle cx="34" cy="76" r="4" fill="#f3b6c8"/>'
    : '<circle cx="36" cy="40" r="7" fill="#a8cf8e"/><circle cx="62" cy="30" r="5" fill="#f4ab84"/><circle cx="66" cy="70" r="8" fill="#9ccfdc"/><circle cx="34" cy="78" r="5" fill="#f5d886"/><circle cx="52" cy="58" r="4" fill="#bfaed8"/>';
  return `<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="50" cy="102" rx="30" ry="5" fill="#5b4636" opacity=".12"/>
    <path d="M50 8 C 74 8 86 48 86 66 C 86 88 70 100 50 100 C 30 100 14 88 14 66 C 14 48 26 8 50 8 Z" fill="${shell}" stroke="${INK}" stroke-width="2.8"/>
    ${dots}${crack}
  </svg>`;
}

const ICONS = {
  save: '<svg viewBox="0 0 24 24"><path d="M5 4 H16 L20 8 V19 A1 1 0 0 1 19 20 H5 A1 1 0 0 1 4 19 V5 A1 1 0 0 1 5 4 Z M8 4 V9 H15 V4 M8 20 V14 H16 V20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18 V6 L19 4 V16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="7" cy="18" r="2.6" fill="currentColor"/><circle cx="17" cy="16" r="2.6" fill="currentColor"/></svg>',
  team: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="4.5" fill="currentColor" opacity=".35"/><g fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="15" r="4.5"/><circle cx="6" cy="9" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><circle cx="18" cy="9" r="2"/></g></svg>',
};
