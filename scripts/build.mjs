// Builds the profile panels in assets/ from public GitHub contribution data.
// No dependencies. Run: node scripts/build.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const USER = 'youssef-110';
const START_YEAR = 2021; // account created 2021-06
const OUT = new URL('../assets/', import.meta.url);
const W = 1200;

const C = {
  // palette pulled from the profile picture: slate-blue night, pale moon, maroon cowl
  bg: '#0a0f17', panel: '#0c121b', line: '#1c2636', dim: '#6c7a90', text: '#c3cddb',
  bright: '#e6ecf3', gold: '#b4495a', black: '#060a10',
  ramp: ['#111924', '#1f2c3d', '#344863', '#5e7898', '#b8c7dc'],
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

// ---------- 1. title: the comic-cover scene ----------
function title() {
  const H = 460, r = rng(7), o = [];
  const MX = 830, MY = 205, MR = 200; // moon
  o.push(`<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1622"/><stop offset=".6" stop-color="#1a2a3f"/><stop offset="1" stop-color="#2a3e58"/></linearGradient>
<radialGradient id="mg"><stop offset=".6" stop-color="#d5dde7" stop-opacity=".22"/><stop offset="1" stop-color="#d5dde7" stop-opacity="0"/></radialGradient>
<radialGradient id="moon" cx=".45" cy=".42"><stop offset="0" stop-color="#e3e9f0"/><stop offset=".8" stop-color="#bfcad7"/><stop offset="1" stop-color="#a9b7c8"/></radialGradient>
<pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#2a3a52" opacity=".55"/><circle cx="5.5" cy="5" r=".6" fill="#2a3a52" opacity=".35"/></pattern>
<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="6" stroke="#05080d" stroke-width="1.4" opacity=".55"/></pattern>
<clipPath id="moonclip"><circle cx="${MX}" cy="${MY}" r="${MR}"/></clipPath>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<path id="bat" d="${BAT}"/></defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" fill="url(#dots)" opacity=".5"/>`);
  for (let i = 0; i < 60; i++) o.push(`<circle cx="${(r() * W) | 0}" cy="${(r() * H) | 0}" r="${[.6, .9, 1.2][(r() * 3) | 0]}" fill="#c9d4e2" opacity="${(.1 + r() * .35).toFixed(2)}"/>`);

  // moon: pale disc, speckle texture, comic ink rings
  o.push(`<circle cx="${MX}" cy="${MY}" r="${MR + 70}" fill="url(#mg)"/><circle cx="${MX}" cy="${MY}" r="${MR}" fill="url(#moon)"/>
<g clip-path="url(#moonclip)"><rect x="${MX - MR}" y="${MY - MR}" width="${MR * 2}" height="${MR * 2}" fill="url(#dots)" opacity=".7"/>
<g fill="none" stroke="#8fa1b8" stroke-width="1.6" opacity=".55"><circle cx="${MX + 60}" cy="${MY - 70}" r="46"/><path d="M${MX - 120},${MY + 30} q40,-40 90,-10"/><circle cx="${MX + 110}" cy="${MY + 60}" r="30"/><path d="M${MX - 40},${MY + 120} q30,-25 70,0"/><path d="M${MX + 20},${MY - 140} q25,10 40,40"/><circle cx="${MX - 70}" cy="${MY - 60}" r="18"/></g></g>`);
  // clouds across the moon's base
  for (const [y, d, dl, s, op] of [[330, 110, -20, 1.6, .75], [370, 140, -80, 2, .8], [300, 170, -120, 1.2, .5]])
    o.push(`<g class="cloud" style="--d:${d}s;animation-delay:${dl}s" opacity="${op}"><g transform="translate(0 ${y}) scale(${s})" fill="#1b2a3e" filter="url(#blur)"><ellipse rx="140" ry="20"/><ellipse cx="60" cy="-12" rx="80" ry="18"/><ellipse cx="-70" cy="4" rx="90" ry="14"/></g></g>`);
  // bare branches, top left
  o.push(`<g fill="none" stroke="#0a111b" stroke-linecap="round" class="branch">
<path d="M-10,40 C80,30 160,60 260,20" stroke-width="10"/><path d="M120,44 C150,10 170,0 200,-10" stroke-width="5"/><path d="M200,36 C230,60 270,70 320,64" stroke-width="5"/>
<path d="M-10,120 C40,100 90,110 130,80" stroke-width="7"/><path d="M60,104 C70,140 60,170 40,200" stroke-width="3"/><path d="M260,20 C300,10 330,30 360,24" stroke-width="3"/>
<path d="M90,40 l10,-22 M150,50 l18,10 M240,26 l6,-16 M300,66 l14,-14 M100,92 l-6,-18 M30,112 l-4,20" stroke-width="2.5"/></g>`);

  // the bust: profile facing right, cowl + cape over the shoulder
  const bust = `<g transform="translate(-60 -70) scale(1.15)"><g class="bust">
<path d="M150,460 C150,380 190,300 260,262 C300,240 340,232 360,214 L366,170 L372,128 L386,80 L404,126 L420,122 L440,76 L450,130 L463,150 L471,172 L475,190 L488,207 L477,213 L479,223 L475,229 L481,244 L459,257 L452,272 C478,286 505,300 520,340 C534,380 540,420 545,460 Z" fill="#141b28"/>
<path d="M366,170 L372,128 L386,80 L404,126 L420,122 L440,76 L450,130 L463,150 L471,172 L456,188 L446,232 L459,257 L452,272 C420,262 392,246 370,222 Z" fill="#2a1720"/>
<path d="M386,80 L404,126 M440,76 L450,130 M372,128 C366,160 364,190 370,222" fill="none" stroke="#7a3d4c" stroke-width="2.2" opacity=".7"/>
<path d="M456,188 L466,186 L475,190 L488,207 L477,213 L479,223 L475,229 L481,244 L459,257 L446,232 Z" fill="#6f7a8f"/>
<path d="M459,177 L470,175" stroke="#e8eef5" stroke-width="2.4" stroke-linecap="round"/>
<path d="M150,460 C150,380 190,300 260,262 C300,240 330,236 352,226 C330,262 300,300 290,360 C284,400 290,440 300,460 Z" fill="#321a24"/>
<path d="M190,330 C230,290 270,268 330,246" fill="none" stroke="#7a3d4c" stroke-width="2" opacity=".5"/>
<path d="M150,460 C150,380 190,300 260,262 C300,240 330,236 352,226 C330,262 300,300 290,360 C284,400 290,440 300,460 Z" fill="url(#hatch)" opacity=".7"/>
<path d="M300,460 C290,420 296,370 320,330 C360,300 430,296 470,300 C500,320 520,360 530,400 L545,460 Z" fill="url(#hatch)" opacity=".45"/>
<use href="#bat" xlink:href="#bat" transform="translate(440 352) scale(1.15 .95) rotate(-4)" fill="#05080d"/>
<path d="M360,400 q30,10 60,0 M380,430 q30,8 60,-2 M470,380 q20,14 40,10" fill="none" stroke="#05080d" stroke-width="2" opacity=".5"/>
</g></g>`;
  o.push(bust);

  // swarm of bats pouring off the shoulder across the moon
  for (let i = 0; i < 34; i++) {
    const dur = 7 + r() * 5, dl = -(r() * 12).toFixed(2), sc = (.07 + r() * .1).toFixed(3), jy = (r() * 80 - 40) | 0, jx = (r() * 40) | 0;
    o.push(`<g><animateMotion dur="${dur.toFixed(1)}s" begin="${dl}s" repeatCount="indefinite" path="M${470 + jx},${300 + jy / 2} C${600 + jx},${220 + jy} ${780},${300 + jy} ${960 + jx},${170 + jy} S${1150},${120 + jy} ${1260},${60 + jy}"/><g transform="scale(${sc})"><use href="#bat" xlink:href="#bat" class="flap" style="animation-duration:${(.22 + r() * .15).toFixed(2)}s" fill="#0b1422"/></g></g>`);
  }

  // the throw: batarang leaves the chest, spins, grows toward the viewer, cracks the glass
  o.push(`<g transform="translate(515 318)"><g class="fly"><g class="spin"><use href="#bat" xlink:href="#bat" fill="#070b12" stroke="#a9b8cb" stroke-width="1.2"/></g></g></g>
<g class="crack" transform="translate(760 190)" fill="none" stroke="#e6ecf3" stroke-width="2" stroke-linecap="round">
<path d="M0,0 L-70,-40 L-120,-36 M0,0 L-30,-90 L-20,-150 M0,0 L60,-70 L120,-80 M0,0 L90,20 L160,10 M0,0 L50,90 L60,160 M0,0 L-40,70 L-110,100 M0,0 L-90,10"/>
<path d="M-40,-22 L-18,-50 M30,-36 L50,6 M44,48 L-20,38" stroke-width="1.2" opacity=".7"/></g>
<rect width="${W}" height="${H}" fill="#e6ecf3" class="hit"/>`);

  const drops = [];
  for (let i = 0; i < 90; i++) { const x = r() * (W + 40), y = -60 + r() * (H + 60); drops.push(`<line x1="${x | 0}" y1="${y | 0}" x2="${(x - 4) | 0}" y2="${(y + 16) | 0}"/>`); }
  o.push(`<g stroke="#a9b8cb" stroke-width=".7" opacity=".14"><g class="rain">${drops.join('')}</g></g>`);

  // name + live numbers
  o.push(label(560, 330, `${USER}`));
  o.push(`<g>${bitmap('YOUSSEF', 560, 344, 8, C.bright, true)}</g>`);
  const stat = (y, k, v, unit) => `${label(1010, y, k)}${T(1010, y + 30, v, 28, C.bright, 'font-weight="700"')}${unit ? T(1014 + v.length * 17.3, y + 30, unit, 11, C.dim) : ''}`;
  o.push(`<rect x="992" y="300" width="190" height="122" fill="#060a10" opacity=".6"/>`);
  o.push(stat(322, 'streak', String(streak), 'days') + stat(374, `${thisYear}`, fmt(yearTotal), 'commits'));
  o.push(`<rect x="0" y="${H - 1}" width="${W}" height="1" fill="${C.line}"/>`);

  const style = `.cloud{animation:drift var(--d) linear infinite}@keyframes drift{from{transform:translateX(-400px)}to{transform:translateX(1500px)}}
.rain{animation:rain .7s linear infinite}@keyframes rain{from{transform:translate(0,-60px)}to{transform:translate(-15px,0)}}
.flap{transform-box:fill-box;transform-origin:center;animation:flap .3s ease-in-out infinite alternate}@keyframes flap{to{transform:scaleY(.25)}}
.px{animation:px .5s steps(2) both}@keyframes px{from{opacity:0}to{opacity:1}}
.branch{transform-origin:0 40px;animation:creak 7s ease-in-out infinite}@keyframes creak{50%{transform:rotate(.8deg)}}
.bust{transform-origin:350px 460px;animation:bust 9s cubic-bezier(.3,0,.2,1) infinite}
@keyframes bust{0%,48%,70%,100%{transform:none}52%{transform:translateX(-10px) rotate(-1.5deg)}56%{transform:translateX(14px) rotate(1deg)}62%{transform:translateX(4px)}}
.fly{opacity:0;animation:fly 9s infinite}
@keyframes fly{0%,54%{opacity:0;transform:translate(0,0) scale(.35)}55%{opacity:1;transform:translate(0,0) scale(.35);animation-timing-function:cubic-bezier(.5,0,1,.6)}68%{opacity:1;transform:translate(245px,-128px) scale(4.2)}69%,100%{opacity:0;transform:translate(245px,-128px) scale(4.6)}}
.spin{animation:spin .45s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.crack{opacity:0;animation:crack 9s infinite}@keyframes crack{0%,67.9%{opacity:0;transform:translate(760px,190px) scale(.4)}68%{opacity:1;transform:translate(760px,190px) scale(1)}86%{opacity:.8}94%,100%{opacity:0;transform:translate(760px,190px) scale(1)}}
.hit{opacity:0;animation:hit 9s infinite}@keyframes hit{0%,67.9%,72%,100%{opacity:0}68%{opacity:.55}}`;
  return svg(H, `${USER}: comic-style Batman in profile against a pale moon, a swarm of bats, and a batarang thrown at the screen. ${streak}-day streak, ${yearTotal} contributions in ${thisYear}.`, o.join('\n'), style);
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
    o.push(`<g class="b" style="animation-delay:${(c.w * .025).toFixed(3)}s"><title>${c.date}: ${c.count}</title><polygon points="${left}" fill="${c.count ? '#0d1520' : '#0b111a'}"/><polygon points="${right}" fill="${c.count ? '#1a273b' : '#0b111a'}"/><polygon points="${top}" fill="${isPeak ? C.gold : c.count ? '#33486a' : '#101826'}"/>${win}</g>`);
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
    o.push(`<g class="chip" style="animation-delay:${(i * .09).toFixed(2)}s"><rect x="${x}" y="${y}" width="${w.toFixed(0)}" height="32" fill="none" stroke="#253246"/>${T(x + 15, y + 21, t, 14, C.text)}</g>`);
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
