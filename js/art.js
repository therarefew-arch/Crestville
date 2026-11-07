// Creatures are drawn as soft, outlined "sticker" SVGs built from their element, role and ears.

const INK = '#5b4636';

function mix(hex, other, t) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

function creatureSVG(sp, stage = 0) {
  const el = ELEMENTS[sp.el];
  const body = el.color;
  const dark = el.dark;
  const belly = mix(body, '#fffaf0', 0.55);
  const w = sp.role === 'tank' ? 34 : sp.role === 'trickster' ? 26 : 30; // half width
  const top = sp.role === 'striker' ? 30 : 34;
  const L = 50 - w, R = 50 + w;
  const stroke = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
  const back = [], front = [];

  // Ears
  if (sp.ears === 'long') {
    back.push(`<ellipse cx="38" cy="${top - 6}" rx="6" ry="16" transform="rotate(-14 38 ${top})" fill="${body}" ${stroke}/>`);
    back.push(`<ellipse cx="62" cy="${top - 6}" rx="6" ry="16" transform="rotate(14 62 ${top})" fill="${body}" ${stroke}/>`);
    back.push(`<ellipse cx="38" cy="${top - 4}" rx="2.6" ry="10" transform="rotate(-14 38 ${top})" fill="#f6c2b6"/>`);
    back.push(`<ellipse cx="62" cy="${top - 4}" rx="2.6" ry="10" transform="rotate(14 62 ${top})" fill="#f6c2b6"/>`);
  } else if (sp.ears === 'pointy') {
    back.push(`<path d="M${L + 6} ${top + 12} L${L + 9} ${top - 10} L${L + 24} ${top + 4} Z" fill="${body}" ${stroke}/>`);
    back.push(`<path d="M${R - 6} ${top + 12} L${R - 9} ${top - 10} L${R - 24} ${top + 4} Z" fill="${body}" ${stroke}/>`);
  } else if (sp.ears === 'round') {
    back.push(`<circle cx="${L + 10}" cy="${top + 4}" r="9" fill="${body}" ${stroke}/>`);
    back.push(`<circle cx="${R - 10}" cy="${top + 4}" r="9" fill="${body}" ${stroke}/>`);
    back.push(`<circle cx="${L + 10}" cy="${top + 4}" r="4" fill="#f6c2b6"/>`);
    back.push(`<circle cx="${R - 10}" cy="${top + 4}" r="4" fill="#f6c2b6"/>`);
  }

  // Tail for strikers and tricksters
  if (sp.role === 'striker' || sp.role === 'trickster') {
    back.push(`<path d="M${R - 4} 78 C ${R + 14} 76 ${R + 14} 58 ${R + 6} 54" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`);
    back.push(`<path d="M${R - 4} 78 C ${R + 14} 76 ${R + 14} 58 ${R + 6} 54" fill="none" stroke="${body}" stroke-width="3.4" stroke-linecap="round"/>`);
  }

  // Element features
  if (sp.el === 'shade') {
    back.push(`<path d="M${L + 4} 58 C ${L - 18} 36 ${L - 20} 74 ${L + 2} 76 Z" fill="${mix(body, '#ffffff', 0.25)}" ${stroke}/>`);
    back.push(`<path d="M${R - 4} 58 C ${R + 18} 36 ${R + 20} 74 ${R - 2} 76 Z" fill="${mix(body, '#ffffff', 0.25)}" ${stroke}/>`);
    front.push(`<path d="M44 ${top + 1} Q40 ${top - 12} 34 ${top - 14}" fill="none" ${stroke}/><circle cx="34" cy="${top - 14}" r="2.6" fill="${dark}"/>`);
    front.push(`<path d="M56 ${top + 1} Q60 ${top - 12} 66 ${top - 14}" fill="none" ${stroke}/><circle cx="66" cy="${top - 14}" r="2.6" fill="${dark}"/>`);
  }
  if (sp.el === 'leaf') {
    front.push(`<path d="M50 ${top + 1} Q50 ${top - 8} 52 ${top - 12}" fill="none" stroke="${dark}" stroke-width="2.6" stroke-linecap="round"/>`);
    front.push(`<path d="M52 ${top - 12} C 58 ${top - 22} 70 ${top - 18} 70 ${top - 12} C 64 ${top - 6} 56 ${top - 8} 52 ${top - 12} Z" fill="#8fc477" ${stroke}/>`);
    front.push(`<path d="M51 ${top - 9} C 46 ${top - 18} 36 ${top - 16} 35 ${top - 11} C 40 ${top - 5} 47 ${top - 6} 51 ${top - 9} Z" fill="#a9d68f" ${stroke}/>`);
  }
  if (sp.el === 'fire') {
    front.push(`<path d="M50 ${top - 18} C 58 ${top - 8} 60 ${top - 2} 56 ${top + 3} C 54 ${top - 2} 52 ${top - 4} 50 ${top - 3} C 48 ${top - 4} 46 ${top - 2} 44 ${top + 3} C 40 ${top - 3} 42 ${top - 10} 50 ${top - 18} Z" fill="#f7c66b" ${stroke}/>`);
  }
  if (sp.el === 'water') {
    front.push(`<path d="M50 ${top - 16} C 56 ${top - 6} 58 ${top - 2} 50 ${top + 3} C 42 ${top - 2} 44 ${top - 6} 50 ${top - 16} Z" fill="#c4e6ee" ${stroke}/>`);
  }
  if (sp.el === 'spark') {
    front.push(`<path d="M49 ${top + 2} L45 ${top - 8} L51 ${top - 8} L47 ${top - 18} L57 ${top - 5} L51 ${top - 5} L54 ${top + 2} Z" fill="#fbe7a1" ${stroke}/>`);
  }

  // Feet
  const feet = `<ellipse cx="${50 - w * 0.5}" cy="89" rx="8" ry="5" fill="${dark}" ${stroke}/><ellipse cx="${50 + w * 0.5}" cy="89" rx="8" ry="5" fill="${dark}" ${stroke}/>`;

  // Body blob
  const bodyPath = `M50 ${top} C ${50 + w * 0.8} ${top} ${R} ${top + 16} ${R} ${top + 32} C ${R} ${top + 50} ${50 + w * 0.6} 88 50 88 C ${50 - w * 0.6} 88 ${L} ${top + 50} ${L} ${top + 32} C ${L} ${top + 16} ${50 - w * 0.8} ${top} 50 ${top} Z`;
  let spots = '';
  if (sp.el === 'stone') {
    spots = `<circle cx="${L + 9}" cy="${top + 22}" r="3.5" fill="${dark}" opacity=".45"/><circle cx="${R - 8}" cy="${top + 30}" r="4.5" fill="${dark}" opacity=".45"/><circle cx="${R - 14}" cy="${top + 18}" r="2.5" fill="${dark}" opacity=".45"/>`;
  }

  // Face
  const ey = top + 26;
  const face = `
    <ellipse cx="42" cy="${ey}" rx="4.6" ry="5.6" fill="#3b2c24"/><circle cx="43.6" cy="${ey - 2}" r="1.7" fill="#fff"/>
    <ellipse cx="58" cy="${ey}" rx="4.6" ry="5.6" fill="#3b2c24"/><circle cx="59.6" cy="${ey - 2}" r="1.7" fill="#fff"/>
    <ellipse cx="35" cy="${ey + 8}" rx="5" ry="3" fill="#f39c94" opacity=".55"/>
    <ellipse cx="65" cy="${ey + 8}" rx="5" ry="3" fill="#f39c94" opacity=".55"/>
    <path d="M46 ${ey + 8} Q50 ${ey + 12} 54 ${ey + 8}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;

  // Evolved stages get a scarf, then a golden crest
  let extra = '';
  if (stage >= 1) {
    extra += `<path d="M${L + 6} ${top + 40} Q50 ${top + 48} ${R - 6} ${top + 40} L${R - 7} ${top + 46} Q50 ${top + 54} ${L + 7} ${top + 46} Z" fill="#e88c7d" ${stroke}/>`;
  }
  if (stage >= 2) {
    extra += `<path d="M50 ${top + 6} l2.4 4.8 5.2 .8 -3.8 3.6 .9 5.2 -4.7 -2.5 -4.7 2.5 .9 -5.2 -3.8 -3.6 5.2 -.8 Z" fill="#f6d36b" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
  }

  return `<svg viewBox="-6 -6 112 108" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="50" cy="94" rx="${w + 4}" ry="5" fill="#5b4636" opacity=".12"/>
    ${back.join('')}
    ${feet}
    <path d="${bodyPath}" fill="${body}" ${stroke}/>
    <ellipse cx="50" cy="${top + 40}" rx="${w * 0.55}" ry="13" fill="${belly}"/>
    ${spots}${extra}${face}${front.join('')}
  </svg>`;
}

function eggSVG(cracked = false) {
  const crack = cracked ? `<path d="M22 52 L32 46 L38 54 L48 44 L56 54 L64 46 L72 52 L78 48" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="50" cy="102" rx="30" ry="5" fill="#5b4636" opacity=".12"/>
    <path d="M50 8 C 74 8 86 48 86 66 C 86 88 70 100 50 100 C 30 100 14 88 14 66 C 14 48 26 8 50 8 Z" fill="#fff4dc" stroke="${INK}" stroke-width="2.8"/>
    <circle cx="36" cy="40" r="7" fill="#a8cf8e"/><circle cx="62" cy="30" r="5" fill="#f4ab84"/>
    <circle cx="66" cy="70" r="8" fill="#9ccfdc"/><circle cx="34" cy="78" r="5" fill="#f5d886"/>
    <circle cx="52" cy="58" r="4" fill="#bfaed8"/>
    ${crack}
  </svg>`;
}

// Small rounded icons for the bottom bar
const ICONS = {
  adventure: '<svg viewBox="0 0 24 24"><path d="M3 19 L9 9 L13 15 L16 11 L21 19 Z" fill="currentColor" opacity=".35"/><path d="M3 19 L9 9 L13 15 L16 11 L21 19 Z M15 6 a2 2 0 1 0 .01 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  team: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="4.5" fill="currentColor" opacity=".35"/><g fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="15" r="4.5"/><circle cx="6" cy="9" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><circle cx="18" cy="9" r="2"/></g></svg>',
  hatchery: '<svg viewBox="0 0 24 24"><path d="M12 3 C17 3 19 11 19 14 C19 18 16 21 12 21 C8 21 5 18 5 14 C5 11 7 3 12 3 Z" fill="currentColor" opacity=".35"/><path d="M12 3 C17 3 19 11 19 14 C19 18 16 21 12 21 C8 21 5 18 5 14 C5 11 7 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  arena: '<svg viewBox="0 0 24 24"><path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z" fill="currentColor" opacity=".35"/><path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z M7 6 H4 A3 3 0 0 0 7 11 M17 6 H20 A3 3 0 0 1 17 11 M12 14 V18 M8 20 H16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
