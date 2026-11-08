// Builds the profile panels in assets/ from public GitHub contribution data.
// No dependencies. Run: node scripts/build.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const USER = 'youssef-110';
const START_YEAR = 2021; // account created 2021-06
const OUT = new URL('../assets/', import.meta.url);
const W = 1200;

const C = {
  bg: '#050608', panel: '#07080b', line: '#15181f', dim: '#5b616d', text: '#c9ccd3',
  bright: '#eef0f4', gold: '#e8c547', black: '#020306',
};
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

// ---------- data ----------
async function fetchYear(y) {
  const res = await fetch(`https://github.com/users/${USER}/contributions?from=${y}-01-01&to=${y}-12-31`, {
    headers: { 'User-Agent': 'profile-builder' },
  });
  if (!res.ok) throw new Error(`contributions ${y}: HTTP ${res.status}`);
  const html = await res.text();
  const idToDate = new Map();
  for (const m of html.matchAll(/data-date="(\d{4}-\d\d-\d\d)"[^>]*?id="(contribution-day-component-[\d-]+)"/g)) idToDate.set(m[2], m[1]);
  const days = [];
  for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)/g)) {
    const date = idToDate.get(m[1]);
    if (!date) continue;
    const n = /^(\d+)/.exec(m[2].trim().replace(/,/g, ''));
    days.push({ date, count: n ? +n[1] : 0 });
  }
  if (!days.length) throw new Error(`contributions ${y}: no days parsed (GitHub markup changed?)`);
  return days;
}

const today = new Date().toISOString().slice(0, 10);
const thisYear = +today.slice(0, 4);
const all = [];
for (let y = START_YEAR; y <= thisYear; y++) all.push(...await fetchYear(y));
const days = all.filter(d => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
const byDate = new Map(days.map(d => [d.date, d.count]));

const sum = a => a.reduce((s, d) => s + d.count, 0);
const total = sum(days);
const yearTotal = sum(days.filter(d => d.date.startsWith(String(thisYear))));
let longest = 0, run = 0;
for (const d of days) { run = d.count ? run + 1 : 0; longest = Math.max(longest, run); }
let streak = 0;
{ // current streak; today with 0 does not break it yet
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  while (i >= 0 && days[i].count > 0) { streak++; i--; }
}
const activeDays = days.filter(d => d.count).length;
const last = (n) => days.slice(-n);
const fmt = n => n.toLocaleString('en-US');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const shortDate = s => `${MONTHS[+s.slice(5, 7) - 1]} ${s.slice(8)}`;

// ---------- helpers ----------
function rng(seed) { // mulberry32
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = (h, label, body, style = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(label)}">
<style>text{font-family:${MONO}}${style}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
<rect width="${W}" height="${h}" fill="${C.panel}"/>${body}
<rect x=".5" y=".5" width="${W - 1}" height="${h - 1}" fill="none" stroke="${C.line}"/></svg>`;
const label = (x, y, t) => `<text x="${x}" y="${y}" font-size="11" fill="${C.dim}" letter-spacing="2">${esc(t.toUpperCase())}</text>`;
const T = (x, y, t, size = 13, fill = C.text, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(t)}</text>`;
const BAT = 'M-50,0 C-45,-12 -30,-18 -18,-14 C-14,-8 -8,-8 -6,-12 L-4,-20 L-2,-14 L2,-14 L4,-20 L6,-12 C8,-8 14,-8 18,-14 C30,-18 45,-12 50,0 C40,-4 32,0 28,8 C22,2 14,4 10,12 C6,6 2,8 0,16 C-2,8 -6,6 -10,12 C-14,4 -22,2 -28,8 C-32,0 -40,-4 -50,0Z';
// caped figure, feet at 0,0, ~123 tall
const FIGURE = (cls = '') => `<rect x="-12" y="-14" width="9" height="15"/><rect x="3" y="-14" width="9" height="15"/>
<path class="${cls}" d="M-31,-86 L-14,-92 L14,-92 L31,-86 C38,-60 44,-34 47,-8 Q37,-16 28,-6 Q18,-14 9,-4 Q0,-12 -9,-4 Q-18,-14 -28,-6 Q-37,-16 -47,-8 C-44,-34 -38,-60 -31,-86Z"/>
<path d="M-12,-90 L-13,-104 L-10,-123 L-5,-110 L5,-110 L10,-123 L13,-104 L12,-90Z"/>`;

// 5x7 bitmap font
const FONT = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01111100001000010000100001000001111',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01111100001000010011100011000101111', H: '10001100011000111111100011000110001', I: '11111001000010000100001000010011111',
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
  3: '11110000010000101110000010000111110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
  6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
  9: '01110100011000101111000010001001100', ' ': '00000000000000000000000000000000000',
};
function bitmap(text, x, y, px, fill, animate, seed = 1) {
  const r = rng(seed); let out = '', cx = x;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let i = 0; i < 35; i++) if (g[i] === '1') {
      const st = animate ? ` class="px" style="animation-delay:${(r() * 1.4).toFixed(2)}s"` : '';
      out += `<rect x="${cx + (i % 5) * px}" y="${y + Math.floor(i / 5) * px}" width="${px - 1}" height="${px - 1}" fill="${fill}"${st}/>`;
    }
    cx += px * 6;
  }
  return out;
}

// ---------- 1. title: the night scene ----------
function title() {
  const H = 460, r = rng(7), o = [];
  o.push(`<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030406"/><stop offset=".75" stop-color="#090d17"/><stop offset="1" stop-color="#0e1420"/></linearGradient>
<radialGradient id="mg"><stop offset=".45" stop-color="#e8e4d4" stop-opacity=".13"/><stop offset="1" stop-color="#e8e4d4" stop-opacity="0"/></radialGradient>
<radialGradient id="moon" cx=".42" cy=".4"><stop offset="0" stop-color="#ecE8da"/><stop offset="1" stop-color="#b9b4a0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f3e7a8" stop-opacity="0"/><stop offset=".3" stop-color="#f3e7a8" stop-opacity=".06"/><stop offset="1" stop-color="#f3e7a8" stop-opacity=".17"/></linearGradient>
<radialGradient id="spot"><stop offset="0" stop-color="#f6eab0" stop-opacity=".45"/><stop offset=".75" stop-color="#f6eab0" stop-opacity=".2"/><stop offset="1" stop-color="#f6eab0" stop-opacity="0"/></radialGradient>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="1.5"/></filter>
<path id="bat" d="${BAT}"/></defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  for (let i = 0; i < 80; i++) o.push(`<circle cx="${(r() * W) | 0}" cy="${(r() * 250) | 0}" r="${[.6, .8, 1.1][(r() * 3) | 0]}" fill="#cfd6e6" opacity="${(.12 + r() * .45).toFixed(2)}"/>`);
  o.push(`<circle cx="800" cy="215" r="170" fill="url(#mg)"/><circle cx="800" cy="215" r="74" fill="url(#moon)"/>
<g fill="#a29c88" opacity=".3"><circle cx="775" cy="195" r="12"/><circle cx="822" cy="240" r="8"/><circle cx="814" cy="183" r="5"/><circle cx="768" cy="240" r="6"/></g>`);
  for (const [y, d, dl, s, op] of [[90, 90, -20, 1.2, .55], [160, 120, -70, 1.6, .45], [60, 150, -110, 1, .4], [210, 100, -45, 1.3, .5]])
    o.push(`<g class="cloud" style="--d:${d}s;animation-delay:${dl}s" opacity="${op}"><g transform="translate(0 ${y}) scale(${s})" fill="#161d2e" filter="url(#blur)"><ellipse rx="120" ry="18"/><ellipse cx="50" cy="-10" rx="70" ry="16"/><ellipse cx="-60" cy="4" rx="80" ry="12"/></g></g>`);
  o.push(`<g class="sway"><polygon points="430,470 450,470 640,96 470,74" fill="url(#beam)" filter="url(#soft)"/><g transform="translate(560 84) rotate(-6)"><ellipse rx="96" ry="38" fill="url(#spot)"/><use href="#bat" xlink:href="#bat" transform="scale(1.3 1.05)" fill="#07090f" opacity=".85"/></g></g>`);
  let x = 0; const far = [];
  while (x < W) { const w = 40 + (r() * 50 | 0), h = 120 + (r() * 95 | 0); far.push(`<rect x="${x}" y="${H - h}" width="${w}" height="${h}"/>`); x += w + (r() * 6 | 0); }
  o.push(`<g fill="#0b1120">${far.join('')}<rect x="1061" y="130" width="4" height="40"/><rect x="1045" y="165" width="36" height="300"/></g>`);
  const near = [[0, 120, 150], [118, 90, 110], [205, 140, 120], [350, 70, 165], [418, 120, 95], [535, 100, 140], [632, 110, 115], [740, 130, 130], [868, 95, 100], [960, 110, 170], [1068, 132, 140]];
  o.push(`<g fill="#040509">${near.map(([x, w, h]) => `<rect x="${x}" y="${H - h}" width="${w}" height="${h}"/>`).join('')}</g><g>`);
  for (const [x, w, h] of near) for (let wx = x + 10; wx < x + w - 10; wx += 14) for (let wy = H - h + 14; wy < H - 36; wy += 18) if (r() < .2) {
    const anim = r() < .35 ? ` class="win" style="--d:${7 + (r() * 12 | 0)}s;--o:-${r() * 15 | 0}s"` : '';
    o.push(`<rect x="${wx}" y="${wy}" width="5" height="8" fill="${['#e9c46a', '#f0d38a', '#d9b45a', '#8a9cbd'][r() * 4 | 0]}" opacity=".75"${anim}/>`);
  }
  o.push(`</g><circle cx="1063" cy="128" r="2.4" fill="#ff4b3a" class="flick"/>`);
  o.push(`<g transform="translate(805 330)" fill="${C.black}">${FIGURE('cape')}</g>`);
  for (const [dur, dl, y0, sc] of [[16, 0, 140, .16], [21, -7, 100, .12], [26, -15, 180, .1]])
    o.push(`<g><animateMotion dur="${dur}s" begin="${dl}s" repeatCount="indefinite" path="M-60,${y0} C300,${y0 - 60} 700,${y0 + 50} 1260,${y0 - 30}"/><g transform="scale(${sc})"><use href="#bat" xlink:href="#bat" class="flap" fill="${C.black}"/></g></g>`);
  const drops = [];
  for (let i = 0; i < 120; i++) { const x = r() * (W + 40), y = -60 + r() * (H + 60); drops.push(`<line x1="${x | 0}" y1="${y | 0}" x2="${(x - 4) | 0}" y2="${(y + 16) | 0}"/>`); }
  o.push(`<g stroke="#8fa3c8" stroke-width=".7" opacity=".18"><g class="rain">${drops.join('')}</g></g>`);

  // name + live numbers
  o.push(label(48, 52, `${USER}`));
  o.push(`<g>${bitmap('YOUSSEF', 48, 70, 10, C.bright, true)}</g>`);
  const stat = (y, k, v, unit) => `${label(1000, y, k)}${T(1000, y + 32, v, 30, C.bright, 'font-weight="700"')}${unit ? T(1004 + v.length * 18.5, y + 32, unit, 11, C.dim) : ''}`;
  o.push(`<rect x="980" y="30" width="190" height="200" fill="${C.black}" opacity=".55"/>`);
  o.push(stat(56, 'streak', String(streak), 'days') + stat(120, `${thisYear}`, fmt(yearTotal), 'commits') + stat(184, 'all time', fmt(total), ''));

  // ticker of recent days
  const items = last(30).reverse().map(d => `${shortDate(d.date)}  ${d.count}`).join('   ·   ');
  const tw = items.length * 7.8 + 60;
  o.push(`<rect x="0" y="${H - 34}" width="${W}" height="34" fill="${C.black}" opacity=".85"/><line x1="0" x2="${W}" y1="${H - 34}" y2="${H - 34}" stroke="${C.line}"/>
<g class="tick" style="--w:${tw.toFixed(0)}px">${T(0, H - 13, items, 13, C.dim)}${T(tw, H - 13, items, 13, C.dim)}</g>`);
  o.push(`<rect width="${W}" height="${H}" fill="#dfe7ff" class="flash"/>`);
  const style = `.sway{transform-origin:440px 470px;animation:sway 14s ease-in-out infinite}@keyframes sway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(4deg)}}
.flick{animation:flick 6s steps(1) infinite}@keyframes flick{0%,47%,50%,100%{opacity:1}48%{opacity:.2}83%{opacity:.35}84%{opacity:1}}
.win{animation:win var(--d) ease-in-out infinite;animation-delay:var(--o)}@keyframes win{0%,40%,100%{opacity:.75}50%,90%{opacity:.04}}
.cloud{animation:drift var(--d) linear infinite}@keyframes drift{from{transform:translateX(-400px)}to{transform:translateX(1500px)}}
.rain{animation:rain .7s linear infinite}@keyframes rain{from{transform:translate(0,-60px)}to{transform:translate(-15px,0)}}
.flash{opacity:0;animation:flash 11s infinite}@keyframes flash{0%,61%,66%,100%{opacity:0}62%{opacity:.26}63%{opacity:.04}64%{opacity:.15}}
.cape{transform-box:fill-box;transform-origin:50% 0;animation:cape 3.6s ease-in-out infinite}@keyframes cape{0%,100%{transform:skewX(0) scaleX(1)}35%{transform:skewX(-6deg) scaleX(1.06)}70%{transform:skewX(-2deg) scaleX(1.02)}}
.flap{transform-box:fill-box;transform-origin:center;animation:flap .3s ease-in-out infinite alternate}@keyframes flap{to{transform:scaleY(.3)}}
.px{animation:px .5s steps(2) both}@keyframes px{from{opacity:0}to{opacity:1}}
.tick{animation:tick 80s linear infinite}@keyframes tick{to{transform:translateX(calc(var(--w) * -1))}}`;
  return svg(H, `${USER}: night city, bat signal, caped figure on a rooftop. ${streak}-day streak, ${yearTotal} contributions in ${thisYear}, ${total} all time.`, o.join('\n'), style);
}

// ---------- 2. signal: last 120 days ----------
function signal() {
  const H = 270, d = last(120), max = Math.max(1, ...d.map(x => x.count));
  const x0 = 48, x1 = W - 48, bw = (x1 - x0) / d.length, base = 190, hmax = 120;
  const sorted = d.map(x => x.count).sort((a, b) => a - b), p75 = sorted[Math.floor(sorted.length * .75)];
  const o = [label(48, 40, 'signal'), T(48, 62, 'last 120 days', 13, C.text)];
  o.push(`<line x1="${x0}" x2="${x1}" y1="${base + .5}" y2="${base + .5}" stroke="${C.line}"/>`);
  d.forEach((day, i) => {
    const h = day.count ? Math.max(2, Math.sqrt(day.count / max) * hmax) : 1;
    const fill = i === d.length - 1 ? C.gold : day.count > p75 ? '#9aa0ab' : '#3a3f4a';
    o.push(`<rect class="bar" style="animation-delay:${(i * .012).toFixed(3)}s" x="${(x0 + i * bw + 1).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"><title>${day.date}: ${day.count}</title></rect>`);
  });
  o.push(`<rect class="sweep" x="${x0}" y="${base - hmax - 6}" width="2" height="${hmax + 6}" fill="${C.gold}" opacity=".35"/>`);
  o.push(T(x0, base + 18, shortDate(d[0].date), 11, C.dim) + T(x1, base + 18, 'today', 11, C.dim, 'text-anchor="end"'));
  const peak = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);
  const cols = [['longest streak', `${longest} days`], ['active days', fmt(activeDays)], ['busiest day', `${peak.date}  ${peak.count}`], ['peak, last 120', String(max)]];
  cols.forEach(([k, v], i) => { o.push(label(48 + i * 280, 236, k) + T(48 + i * 280, 256, v, 14, C.bright)); });
  return svg(H, `Signal: daily contributions for the last 120 days. Longest streak ${longest} days.`, o.join('\n'),
    `.bar{transform-box:fill-box;transform-origin:50% 100%;animation:grow .7s cubic-bezier(.2,.8,.2,1) both}@keyframes grow{from{transform:scaleY(0)}}
.sweep{animation:sweep 7s linear infinite}@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(${x1 - x0}px)}}`);
}

// ---------- 3. archive: every year ----------
function archive() {
  const years = [];
  for (let y = thisYear; y >= START_YEAR; y--) { const t = sum(days.filter(d => d.date.startsWith(String(y)))); if (t) years.push([y, t]); }
  const nz = days.filter(d => d.count).map(d => d.count).sort((a, b) => a - b);
  const q = p => nz[Math.floor((nz.length - 1) * p)] || 1;
  const levels = [q(.25), q(.5), q(.8)];
  const shade = c => !c ? '#0e1015' : c <= levels[0] ? '#262931' : c <= levels[1] ? '#454953' : c <= levels[2] ? '#7d828c' : '#c9ccd3';
  const cell = 12, gap = 2, gx = 250, rowH = 7 * (cell + gap) + 34, top = 80;
  const H = top + years.length * rowH + 20;
  const o = [label(48, 40, 'archive'), T(48, 62, `every day since ${years.at(-1)?.[0] ?? thisYear}`, 13)];
  MONTHS.forEach((m, i) => o.push(T(gx + i * 4.42 * (cell + gap), top - 8, m, 10, C.dim)));
  years.forEach(([y, t], yi) => {
    const oy = top + yi * rowH;
    o.push(bitmap(String(y), 48, oy + 4, 5, C.bright, false));
    o.push(T(48, oy + 58, `${fmt(t)} commits`, 11, C.dim));
    const jan1 = new Date(Date.UTC(y, 0, 1)), offset = jan1.getUTCDay();
    let peak = null;
    for (let dt = new Date(jan1); dt.getUTCFullYear() === y; dt.setUTCDate(dt.getUTCDate() + 1)) {
      const k = dt.toISOString().slice(0, 10); const c = byDate.get(k) ?? 0;
      if (!peak || c > peak[1]) peak = [k, c];
    }
    let g = `<g class="row" style="animation-delay:${(yi * .25).toFixed(2)}s">`;
    for (let dt = new Date(jan1); dt.getUTCFullYear() === y && dt.toISOString().slice(0, 10) <= today; dt.setUTCDate(dt.getUTCDate() + 1)) {
      const k = dt.toISOString().slice(0, 10), idx = Math.round((dt - jan1) / 864e5) + offset;
      const c = byDate.get(k) ?? 0, col = Math.floor(idx / 7), row = idx % 7;
      g += `<rect x="${gx + col * (cell + gap)}" y="${oy + row * (cell + gap)}" width="${cell}" height="${cell}" fill="${k === peak[0] && c ? C.gold : shade(c)}"/>`;
    }
    o.push(g + '</g>');
  });
  return svg(H, `Archive: every day of contributions since ${years.at(-1)?.[0]}.`, o.join('\n'),
    `.row{animation:fade 1.2s ease-out both}@keyframes fade{from{opacity:0}}`);
}

// ---------- 4. skyline: last 52 weeks as a city ----------
function skyline() {
  const H = 540, s = 16, a = s * .9, b = s * .34;
  const lastYear = last(364 + new Date(today).getUTCDay() + 1);
  const firstDay = new Date(lastYear[0].date).getUTCDay();
  const cells = lastYear.map((d, i) => ({ ...d, w: Math.floor((i + firstDay) / 7), d: (i + firstDay) % 7 }));
  const max = Math.max(1, ...cells.map(c => c.count));
  const weeks = cells.at(-1).w + 1;
  const ox = W / 2 - ((weeks - 7) / 2) * a + 60, oy = 200;
  const P = (w, d, h = 0) => [ox + (w - d) * a, oy + (w + d) * b - h];
  const pts = arr => arr.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const peak = cells.reduce((x, y) => (y.count > x.count ? y : x), cells[0]);
  const r = rng(11), o = [];
  o.push(`<defs><radialGradient id="glow"><stop offset="0" stop-color="#f6eab0" stop-opacity=".18"/><stop offset="1" stop-color="#f6eab0" stop-opacity="0"/></radialGradient></defs>`);
  o.push(label(48, 40, 'skyline') + T(48, 62, `last 12 months · ${fmt(sum(lastYear))} contributions`, 13));
  const byMonth = {}; lastYear.forEach(d => byMonth[d.date.slice(0, 7)] = (byMonth[d.date.slice(0, 7)] || 0) + d.count);
  const [bm, bmc] = Object.entries(byMonth).sort((x, y) => y[1] - x[1])[0];
  o.push(label(960, 40, 'peak day') + T(960, 60, `${peak.date}  ${peak.count}`, 13, C.bright));
  o.push(label(960, 90, 'busiest month') + T(960, 110, `${bm}  ${fmt(bmc)}`, 13, C.bright));
  const [px, py] = P(peak.w + .5, peak.d + .5, Math.sqrt(peak.count / max) * 170);
  o.push(`<circle cx="${px}" cy="${py - 40}" r="130" fill="url(#glow)"/>`);
  const g = .1;
  cells.sort((x, y) => (x.w + x.d) - (y.w + y.d) || x.w - y.w).forEach(c => {
    const h = c.count ? 4 + Math.sqrt(c.count / max) * 170 : 1.5;
    const w0 = c.w + g, w1 = c.w + 1 - g, d0 = c.d + g, d1 = c.d + 1 - g;
    const isPeak = c === peak;
    const top = pts([P(w0, d0, h), P(w1, d0, h), P(w1, d1, h), P(w0, d1, h)]);
    const right = pts([P(w1, d0, 0), P(w1, d1, 0), P(w1, d1, h), P(w1, d0, h)]);
    const left = pts([P(w0, d1, 0), P(w1, d1, 0), P(w1, d1, h), P(w0, d1, h)]);
    let win = '';
    if (h > 22) for (let k = 0; k < h / 9; k++) if (r() < .28) {
      const t = .2 + r() * .55, [wx, wy] = P(w0 + (w1 - w0) * t, d1, 6 + k * 9);
      win += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2" height="3" fill="#e9c46a" opacity="${(.35 + r() * .5).toFixed(2)}"${r() < .3 ? ` class="win" style="animation-delay:-${(r() * 9).toFixed(1)}s"` : ''}/>`;
    }
    o.push(`<g class="b" style="animation-delay:${(c.w * .025).toFixed(3)}s"><title>${c.date}: ${c.count}</title><polygon points="${left}" fill="${c.count ? '#0d0f15' : '#0b0c10'}"/><polygon points="${right}" fill="${c.count ? '#171a22' : '#0b0c10'}"/><polygon points="${top}" fill="${isPeak ? C.gold : c.count ? '#2b2f39' : '#101217'}"/>${win}</g>`);
  });
  o.push(`<g transform="translate(${px.toFixed(1)} ${(py + 2).toFixed(1)}) scale(.3)" fill="${C.black}" class="fig">${FIGURE('cape')}</g>`);
  return svg(H, `Skyline: the last 12 months of contributions as a night city. Peak ${peak.date} with ${peak.count}.`, o.join('\n'),
    `.b{animation:rise .9s cubic-bezier(.2,.8,.2,1) both}@keyframes rise{from{opacity:0;transform:translateY(14px)}}
.win{animation:win 9s steps(1) infinite}@keyframes win{0%,60%{opacity:.8}61%,100%{opacity:.05}}
.fig{animation:fade 1s ease-out 1.6s both}@keyframes fade{from{opacity:0}}
.cape{transform-box:fill-box;transform-origin:50% 0;animation:cape 3.6s ease-in-out infinite}@keyframes cape{0%,100%{transform:skewX(0)}40%{transform:skewX(-6deg) scaleX(1.06)}}`);
}

// ---------- 5. tools ----------
function tools() {
  const list = ['java', 'python', 'javascript', 'typescript', 'c++', 'c#', 'react', 'node', 'spring', 'fastapi', 'supabase', 'postgres', 'git'];
  const H = 170, o = [label(48, 40, 'tools')];
  let x = 48, y = 64;
  list.forEach((t, i) => {
    const w = t.length * 8.4 + 30;
    if (x + w > W - 48) { x = 48; y += 46; }
    o.push(`<g class="chip" style="animation-delay:${(i * .09).toFixed(2)}s"><rect x="${x}" y="${y}" width="${w.toFixed(0)}" height="32" fill="none" stroke="#2a2e37"/>${T(x + 15, y + 21, t, 14, C.text)}</g>`);
    x += w + 10;
  });
  return svg(H, `Tools: ${list.join(', ')}.`, o.join('\n'),
    `.chip{animation:on 1.4s steps(1) both}@keyframes on{0%{opacity:0}30%{opacity:.6}38%{opacity:.1}52%,100%{opacity:1}}`);
}

// ---------- 6. end ----------
function end() {
  const H = 130, o = [];
  o.push(`<g transform="translate(${W - 110} 66)"><ellipse rx="52" ry="22" fill="#f6eab0" class="sig"/><path d="${BAT}" transform="scale(.7 .58)" fill="${C.panel}"/></g>`);
  o.push(label(48, 52, 'signal off') + T(48, 82, `rebuilt ${today} from live data`, 12, C.dim));
  return svg(H, `Signal off. Rebuilt ${today}.`, o.join('\n'),
    `.sig{animation:sig 6s ease-in-out infinite}@keyframes sig{0%,100%{opacity:.5}45%{opacity:.5}50%{opacity:.08}55%{opacity:.4}70%{opacity:.05}}`);
}

mkdirSync(OUT, { recursive: true });
const panels = { 'title.svg': title(), 'signal.svg': signal(), 'archive.svg': archive(), 'skyline.svg': skyline(), 'tools.svg': tools(), 'end.svg': end() };
for (const [f, s] of Object.entries(panels)) writeFileSync(new URL(f, OUT), s);
console.log(`built ${Object.keys(panels).length} panels: total ${total}, ${thisYear} ${yearTotal}, streak ${streak}, longest ${longest}`);
