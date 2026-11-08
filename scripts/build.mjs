// Builds the profile panels in assets/ from public GitHub contribution data.
// No dependencies. Run: node scripts/build.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const USER = 'youssef-110';
const START_YEAR = 2021; // account created 2021-06
const OUT = new URL('../assets/', import.meta.url);
const W = 1200;

const C = {
  // from the profile picture: near-black slate night, moon-pale steel, maroon accent
  bg: '#05080d', panel: '#070b11', line: '#151d29', dim: '#64748a', text: '#bfcad8',
  bright: '#e3e9f0', gold: '#c4475a', black: '#04070b',
  ramp: ['#0c121a', '#18222f', '#2a3a4f', '#4f6886', '#a9bad0'],
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

// ---------- 1. title: binary batman ----------
function title() {
  const H = 460, r = rng(42), o = [];
  // front-facing cowl bust, right half (x>=0), top of ears at y=0; mirrored to make the outline
  const half = [[0, 74], [28, 80], [44, 34], [60, 80], [68, 104], [72, 142], [70, 172], [58, 204], [74, 214], [98, 232], [150, 262], [190, 290], [205, 340], [212, 470]];
  const FS = 1.0, FX = 600, FY = 6;
  const P = ([x, y]) => [FX + x * FS, FY + y * FS];
  const outline = [...half, ...half.slice().reverse().map(([x, y]) => [-x, y])].map(P);
  const path = pts => 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' L') + ' Z';
  const mirror = pts => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
  const eyeR = [[9, 142], [42, 128], [45, 135], [12, 150]].map(P), eyeL = [[-9, 142], [-42, 128], [-45, 135], [-12, 150]].map(P);
  // where the cowl ends and the lower face shows
  const cowlEdge = [[62, 158], [52, 192], [32, 220], [0, 228], [-32, 220], [-52, 192], [-62, 158]];
  const mouth = [[-14, 210], [-4, 212], [4, 212], [14, 210]];
  // chest emblem: sharp, wings down
  const emb = [[0, 318], [7, 312], [11, 300], [16, 312], [48, 308], [82, 326], [60, 328], [46, 342], [30, 337], [13, 352], [0, 376]];
  const emblem = mirror(emb).map(P);
  const shadow = [
    [[0, 108], [0, 176]], [[6, 118], [40, 108]], [[-6, 118], [-40, 108]],            // nose ridge, brow
    [[74, 214], [40, 242], [0, 254], [-40, 242], [-74, 214]],                        // armored collar
    [[150, 262], [112, 300], [104, 360], [118, 430]], [[-150, 262], [-112, 300], [-104, 360], [-118, 430]],  // chest plates
    [[0, 384], [0, 460]], [[60, 390], [24, 420]], [[-60, 390], [-24, 420]], [[180, 300], [168, 360]], [[-180, 300], [-168, 360]],
  ];
  const line = pts => 'M' + pts.map(P).map(p => p.map(n => n.toFixed(1)).join(',')).join(' L');

  // binary rows: one <text> per row with explicit x per column so columns line up in any font
  const rows = (x0, x1, cw, y0, y1, rh, fillProb, period, streaky) => {
    const cols = []; for (let x = x0; x < x1; x += cw) cols.push(x);
    const n = Math.ceil((y1 - y0) / rh) + period;
    const colSeq = cols.map(() => {
      const seq = []; let on = r() < .5;
      while (seq.length < period) {
        const len = on ? 4 + (r() * 12 | 0) : 2 + (r() * 10 | 0);
        for (let k = 0; k < len && seq.length < period; k++) seq.push(!streaky || on ? (r() < fillProb ? (r() < .5 ? '0' : '1') : ' ') : ' ');
        on = !on;
      }
      return seq;
    });
    const xs = cols.join(' ');
    let s = '';
    for (let i = 0; i < n; i++) s += `<text x="${xs}" y="${(y0 - period * rh + i * rh).toFixed(0)}">${colSeq.map(q => q[i % period]).join('').replace(/ /g, '&#160;')}</text>`;
    return s;
  };
  const bb = [FX - 272, FX + 272];
  o.push(`<defs>
<clipPath id="fig"><path d="${path(outline)}"/></clipPath>
<clipPath id="emb"><path d="${path(emblem)}"/></clipPath>
<linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="0" y1="${FY}" x2="0" y2="${H}"><stop offset="0" stop-color="#e3e9f0"/><stop offset=".45" stop-color="#8fa1b8"/><stop offset="1" stop-color="#1f2c3d"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#3a5274" stop-opacity=".4"/><stop offset=".6" stop-color="#1c2a3f" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></radialGradient>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
<g id="rainA" font-size="11">${rows(0, W, 14, 0, H, 14, .9, 40, true)}</g>
<g id="dense" font-size="10">${rows(bb[0], bb[1], 8, FY, H, 10, .97, 30, false)}</g>
<g id="embd" font-size="9">${rows(FX - 100, FX + 100, 7, FY + 280, FY + 380, 8, 1, 20, false)}</g>
</defs>
<rect width="${W}" height="${H}" fill="#05080d"/>
<ellipse cx="${FX}" cy="230" rx="430" ry="300" fill="url(#halo)" class="halo"/>`);
  // background rain, dim
  o.push(`<g fill="#4a5a70" opacity=".25" style="font-family:${MONO}"><g class="rainA"><use href="#rainA" xlink:href="#rainA"/></g></g>`);
  // the figure: dense scrolling code clipped to the bust, revealed by a scan line
  o.push(`<g class="reveal-wrap"><g clip-path="url(#fig)"><g class="glitch">
<rect x="${bb[0]}" y="0" width="544" height="${H}" fill="#070b11"/>
<g fill="url(#shade)" style="font-family:${MONO}"><g class="dense"><use href="#dense" xlink:href="#dense"/></g></g>
<g fill="none" stroke="#020304" stroke-linecap="round" stroke-linejoin="round">
<path d="${line(cowlEdge)}" stroke-width="7"/>
<path d="${line(mouth)}" stroke-width="3"/>
${shadow.map(s => `<path d="${line(s)}" stroke-width="5"/>`).join('')}
</g>
<path d="${path(emblem)}" fill="#020304"/>
<g clip-path="url(#emb)" fill="#d9506a" font-weight="700" style="font-family:${MONO}"><g class="embd"><use href="#embd" xlink:href="#embd"/></g></g>
<path d="${path(eyeR)}" fill="#020304"/><path d="${path(eyeL)}" fill="#020304"/>
</g></g>
<path d="${path(outline)}" fill="none" stroke="#c9d3df" stroke-width="1.2" opacity=".35"/>
<rect class="scan" x="${bb[0] - 20}" y="0" width="560" height="2" fill="#e6ecf3" opacity=".8"/></g>`);
  o.push(`<g class="eyes" filter="url(#glow)"><path d="${path([[12, 142], [40, 130], [42, 134], [14, 147]].map(P))}" fill="#f4f7fb"/><path d="${path([[-12, 142], [-40, 130], [-42, 134], [-14, 147]].map(P))}" fill="#f4f7fb"/></g>`);
  // glitch slices: copies of the figure band shifted sideways for a split second
  for (const [y, h, dx, c] of [[110, 18, 14, '#c4475a'], [205, 10, -18, '#9fb0c4'], [330, 22, 22, '#c4475a']])
    o.push(`<g class="slice" style="--dx:${dx}px"><clipPath id="sl${y}"><rect x="0" y="${FY + y}" width="${W}" height="${h}"/></clipPath><g clip-path="url(#sl${y})"><path d="${path(outline)}" fill="${c}" opacity=".35"/></g></g>`);
  o.push(`<rect width="${W}" height="${H}" fill="url(#vig)"/>`);
  // scanlines over everything
  o.push(`<pattern id="scanl" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000"/></pattern><rect width="${W}" height="${H}" fill="url(#scanl)" opacity=".22"/>`);

  // name + live numbers
  o.push(label(48, 52, `${USER}`));
  o.push(`<g>${bitmap('YOUSSEF', 48, 66, 7, C.bright, true)}</g>`);
  o.push(T(48, 150, '01111001 01101111 01110101', 11, C.dim, `letter-spacing="1"`));
  const stat = (y, k, v, unit) => `${label(1000, y, k)}${T(1000, y + 30, v, 28, C.bright, 'font-weight="700"')}${unit ? T(1004 + v.length * 17.3, y + 30, unit, 11, C.dim) : ''}`;
  o.push(stat(330, 'streak', String(streak), 'days') + stat(382, `${thisYear}`, fmt(yearTotal), 'commits'));

  const style = `.rainA{animation:fall 11s steps(40) infinite}@keyframes fall{from{transform:translateY(0)}to{transform:translateY(${40 * 14}px)}}
.dense{animation:fallD 18s steps(30) infinite}@keyframes fallD{to{transform:translateY(${30 * 10}px)}}
.embd{animation:fallE 5s steps(20) infinite}@keyframes fallE{to{transform:translateY(${20 * 8}px)}}
.px{animation:px .5s steps(2) both}@keyframes px{from{opacity:0}to{opacity:1}}
.halo{animation:halo 5s steps(10) infinite}@keyframes halo{50%{opacity:.6}}
.reveal-wrap{animation:reveal 2.4s cubic-bezier(.6,0,.2,1) both}@keyframes reveal{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
.scan{animation:scan 2.4s cubic-bezier(.6,0,.2,1) both, scanloop 9s steps(90) 2.4s infinite}
@keyframes scan{from{transform:translateY(0);opacity:1}to{transform:translateY(${H}px);opacity:0}}
@keyframes scanloop{0%{transform:translateY(0);opacity:0}5%{opacity:.6}40%{transform:translateY(${H}px);opacity:0}100%{transform:translateY(${H}px);opacity:0}}
.eyes{animation:eyes 9s infinite}@keyframes eyes{0%,8%{opacity:0}12%,58%,66%,100%{opacity:.85}60%,64%{opacity:1;fill:#e0607a}61%,63%{opacity:.2}}
.glitch{animation:glitch 9s steps(1) infinite}@keyframes glitch{0%,59%,66%,100%{transform:none}60%{transform:translateX(-7px) skewX(-3deg)}61%{transform:translateX(9px)}62%{transform:translateX(-3px) skewX(2deg)}63%{transform:translateX(5px)}64%{transform:none}65%{transform:translateX(-4px)}}
.slice{opacity:0;animation:slice 9s steps(1) infinite}@keyframes slice{0%,59%,65%,100%{opacity:0;transform:none}60%{opacity:1;transform:translateX(var(--dx))}62%{opacity:1;transform:translateX(calc(var(--dx) * -1))}63%{opacity:0}64%{opacity:1;transform:translateX(var(--dx))}}`;
  return svg(H, `${USER}: Batman's cowl and shoulders built from streaming binary code, glowing eyes and a red binary bat on his chest. ${streak}-day streak, ${yearTotal} contributions in ${thisYear}.`, o.join('\n'), style);
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
    const fill = i === d.length - 1 ? C.gold : day.count > p75 ? C.ramp[3] : C.ramp[2];
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
  const shade = c => !c ? C.ramp[0] : c <= levels[0] ? C.ramp[1] : c <= levels[1] ? C.ramp[2] : c <= levels[2] ? C.ramp[3] : C.ramp[4];
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
  o.push(`<defs><radialGradient id="glow"><stop offset="0" stop-color="#c9d3df" stop-opacity=".16"/><stop offset="1" stop-color="#c9d3df" stop-opacity="0"/></radialGradient></defs>`);
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
      win += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2" height="3" fill="#d9e2ee" opacity="${(.35 + r() * .5).toFixed(2)}"${r() < .3 ? ` class="win" style="animation-delay:-${(r() * 9).toFixed(1)}s"` : ''}/>`;
    }
    o.push(`<g class="b" style="animation-delay:${(c.w * .025).toFixed(3)}s"><title>${c.date}: ${c.count}</title><polygon points="${left}" fill="${c.count ? '#0a0f17' : '#070b10'}"/><polygon points="${right}" fill="${c.count ? '#131c29' : '#070b10'}"/><polygon points="${top}" fill="${isPeak ? C.gold : c.count ? '#24324a' : '#0c1119'}"/>${win}</g>`);
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
    o.push(`<g class="chip" style="animation-delay:${(i * .09).toFixed(2)}s"><rect x="${x}" y="${y}" width="${w.toFixed(0)}" height="32" fill="none" stroke="#1c2738"/>${T(x + 15, y + 21, t, 14, C.text)}</g>`);
    x += w + 10;
  });
  return svg(H, `Tools: ${list.join(', ')}.`, o.join('\n'),
    `.chip{animation:on 1.4s steps(1) both}@keyframes on{0%{opacity:0}30%{opacity:.6}38%{opacity:.1}52%,100%{opacity:1}}`);
}

// ---------- 6. end ----------
function end() {
  const H = 130, o = [];
  o.push(`<g transform="translate(${W - 110} 66)"><ellipse rx="52" ry="22" fill="#c9d3df" class="sig"/><path d="${BAT}" transform="scale(.7 .58)" fill="${C.panel}"/></g>`);
  o.push(label(48, 52, 'signal off') + T(48, 82, `rebuilt ${today} from live data`, 12, C.dim));
  return svg(H, `Signal off. Rebuilt ${today}.`, o.join('\n'),
    `.sig{animation:sig 6s ease-in-out infinite}@keyframes sig{0%,100%{opacity:.5}45%{opacity:.5}50%{opacity:.08}55%{opacity:.4}70%{opacity:.05}}`);
}

mkdirSync(OUT, { recursive: true });
const panels = { 'title.svg': title(), 'signal.svg': signal(), 'archive.svg': archive(), 'skyline.svg': skyline(), 'tools.svg': tools(), 'end.svg': end() };
for (const [f, s] of Object.entries(panels)) writeFileSync(new URL(f, OUT), s);
console.log(`built ${Object.keys(panels).length} panels: total ${total}, ${thisYear} ${yearTotal}, streak ${streak}, longest ${longest}`);
