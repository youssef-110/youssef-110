// Builds the profile panels in assets/ from real public commits.
// No dependencies. Run: node scripts/build.mjs (GITHUB_TOKEN is optional; it raises the rate limit)
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const USER = 'youssef-110';
const START_YEAR = 2021; // account created 2021-06
// Repos whose commits are generated on a schedule, not written. They are left out of every number.
const FILLER = ['contrib-graph', 'streak'];
const OUT = new URL('../assets/', import.meta.url);
const W = 1200;


// ---------- data: commits authored on the default branch of public repos, merges left out ----------
const QUERY = `author:${USER} merge:false ${FILLER.map(r => `-repo:${USER}/${r}`).join(' ')}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchPage(q, page) {
  const url = `https://api.github.com/search/commits?q=${encodeURIComponent(q)}&sort=author-date&order=desc&per_page=100&page=${page}`;
  const headers = { 'User-Agent': 'profile-builder', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    const limited = res.status === 403 || res.status === 429;
    if (!limited || attempt === 3) throw new Error(`commit search: HTTP ${res.status}`);
    // rate limited: wait for the window to reset (search allows 10 requests a minute without a token)
    const reset = +res.headers.get('x-ratelimit-reset') * 1000 - Date.now();
    await sleep(Number.isFinite(reset) && reset > 0 ? Math.min(reset, 60000) + 1000 : 5000);
  }
}
async function searchAll(q) {
  const items = [];
  for (let page = 1; ; page++) {
    const r = await searchPage(q, page);
    items.push(...r.items);
    if (!r.items.length || items.length >= Math.min(r.total_count, 1000)) return { total: r.total_count, items };
  }
}

const today = new Date().toISOString().slice(0, 10);
const thisYear = +today.slice(0, 4);
let { total: found, items: raw } = await searchAll(QUERY);
if (found > 1000) { // one query returns at most 1000 commits, so go year by year
  raw = [];
  for (let y = START_YEAR; y <= thisYear; y++) {
    const r = await searchAll(`${QUERY} author-date:${y}-01-01..${y}-12-31`);
    // shortcut: a year with more than 1000 commits would be cut short, split it by month when that happens
    if (r.total > 1000) throw new Error(`${y} has ${r.total} commits, more than one query returns`);
    raw.push(...r.items);
  }
}
if (!raw.length) throw new Error('commit search returned no commits');
// newest first; dates are UTC days, the same clock as `today`
const commits = raw.map(c => {
  const at = new Date(c.commit.author.date);
  return { at: +at, date: at.toISOString().slice(0, 10), repo: c.repository.name, msg: c.commit.message.split('\n')[0].trim() };
}).filter(c => c.date <= today && c.date >= `${START_YEAR}-01-01`).sort((a, b) => b.at - a.at);
const perDay = new Map();
for (const c of commits) perDay.set(c.date, (perDay.get(c.date) ?? 0) + 1);
const days = [];
for (let d = new Date(Date.UTC(START_YEAR, 0, 1)); d.toISOString().slice(0, 10) <= today; d.setUTCDate(d.getUTCDate() + 1)) {
  const date = d.toISOString().slice(0, 10);
  days.push({ date, count: perDay.get(date) ?? 0 });
}

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
// ---------- hero panels: comic lettering beside real comic art (the GIF sits next to these in the README) ----------
const fontFace = (family, file) => `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${readFileSync(new URL(`../fonts/${file}`, import.meta.url)).toString('base64')}) format('woff2')}`;
const xmlText = s => esc(s).replace(/'/g, '&#8217;');

// odometer: each digit is a strip of 0-9 that rolls to its value once
function odometer(value, x, y, size, family, fill, delay, extra = '') {
  const adv = size * .58, lh = size * 1.05, out = [];
  let cx = x, i = 0;
  for (const ch of value) {
    if (/\d/.test(ch)) {
      const d = +ch, id = `od${Math.round(x)}${Math.round(y)}${i}`;
      out.push(`<clipPath id="${id}"><rect x="${cx - 2}" y="${y - size * .92}" width="${adv + 4}" height="${lh}"/></clipPath><g clip-path="url(#${id})"><g class="roll" style="--to:${-d * lh}px;animation-delay:${(delay + i * .08).toFixed(2)}s">${Array.from({ length: 10 }, (_, k) => `<text x="${cx}" y="${y + k * lh}" font-family="${family}" font-size="${size}" fill="${fill}" ${extra}>${k}</text>`).join('')}</g></g>`);
    } else out.push(`<text x="${cx}" y="${y}" font-family="${family}" font-size="${size}" fill="${fill}" ${extra}>${xmlText(ch)}</text>`);
    cx += ch === ',' ? adv * .55 : adv; i++;
  }
  return out.join('');
}
const rollCss = `.roll{transform:translateY(0);animation:roll 1.6s cubic-bezier(.2,.7,.1,1) both}@keyframes roll{to{transform:translateY(var(--to))}}`;
const comicSvg = (w, h, label, body, style) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<style>${style}@media (prefers-reduced-motion:reduce){*{animation:none!important}.roll{transform:translateY(var(--to))!important}}</style>${body}</svg>`;

// splash page: modern comic, slate night with Ben-Day dots, newsprint narration boxes, extruded logo
function heroSplash() {
  const w = 720, h = 528, INK = '#0d1118', PAPER = '#efe7d2', MAROON = '#8e2b3b';
  const box = (x, y, bw, bh, rot, fill, delay, inner) => `<g class="pop" style="animation-delay:${delay}s" transform="rotate(${rot} ${x + bw / 2} ${y + bh / 2})"><rect x="${x + 5}" y="${y + 5}" width="${bw}" height="${bh}" fill="${INK}"/><rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${fill}" stroke="${INK}" stroke-width="3"/>${inner}</g>`;
  const L = (x, y, s, size = 26, fill = INK) => `<text x="${x}" y="${y}" font-family="Lettering" font-size="${size}" fill="${fill}" letter-spacing=".5">${xmlText(s)}</text>`;
  // speed lines converging on the art to the left
  const r = rng(3), lines = [];
  for (let i = 0; i < 26; i++) { const y0 = 20 + r() * (h - 40), len = 120 + r() * 260; lines.push(`<path d="M${w},${y0.toFixed(0)} L${(w - len).toFixed(0)},${(y0 + (h / 2 - y0) * .18).toFixed(0)}" stroke="#2a3b57" stroke-width="${(1 + r() * 2.5).toFixed(1)}"/>`); }
  const name = 'YOUSSEF';
  const body = `<defs><pattern id="ben" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.9" fill="#273855"/></pattern></defs>
<rect width="${w}" height="${h}" fill="#1a2740"/><rect width="${w}" height="${h}" fill="url(#ben)"/>
<g opacity=".9">${lines.join('')}</g>
${box(34, 34, 352, 54, -1.2, PAPER, .2, L(52, 70, 'MEANWHILE, ON GITHUB...'.replace('...', '…')))}
<g class="slam" style="animation-delay:.55s"><g font-family="Splash" font-size="100" letter-spacing="2">
<text x="44" y="186" fill="${INK}">${name}</text><text x="40" y="182" fill="${INK}">${name}</text><text x="38" y="180" fill="${MAROON}" stroke="${INK}" stroke-width="6" paint-order="stroke">${name}</text><text x="30" y="172" fill="${PAPER}" stroke="${INK}" stroke-width="5" paint-order="stroke">${name}</text></g></g>
${box(56, 204, 410, 92, .8, PAPER, 1.1, streak >= 3
    ? L(76, 242, `NIGHT ${streak}.`) + L(76, 276, 'NO NIGHTS OFF.')
    : L(76, 242, `${fmt(activeDays)} NIGHTS`) + L(76, 276, 'ON PATROL.'))}
${box(300, 312, 390, 92, -1, MAROON, 1.5, odometer(fmt(yearTotal), 322, 353, 40, 'Splash', PAPER, 1.6) + L(322, 386, `COMMITS IN ${thisYear}.`, 24, PAPER))}
${box(84, 424, 330, 58, .6, PAPER, 1.9, L(104, 462, `${fmt(total)} SINCE ${START_YEAR}.`))}
<rect x="3" y="3" width="${w - 6}" height="${h - 6}" fill="none" stroke="${INK}" stroke-width="6"/>`;
  return comicSvg(w, h, `Comic narration: Youssef. ${yearTotal} commits in ${thisYear}. ${total} since ${START_YEAR}.`, body,
    `${fontFace('Splash', 'Bangers-Regular.woff2')}${fontFace('Lettering', 'ComicNeue-Bold.woff2')}${rollCss}
.pop{animation:pop .35s cubic-bezier(.2,.8,.3,1) both}@keyframes pop{from{opacity:0;transform:translateY(10px)}}
.slam{transform-box:fill-box;transform-origin:center;animation:slam .4s cubic-bezier(.2,.9,.3,1) both}@keyframes slam{from{opacity:0;transform:scale(1.25)}60%{opacity:1}}`);
}

// ---------- comic page system shared by every panel below the splash ----------
const K = { ink: '#0d1118', paper: '#efe7d2', slate: '#1a2740', dot: '#273855', maroon: '#8e2b3b', red: '#c4475a',
  cells: ['#16223a', '#2f4566', '#56739b', '#9fb4d1', '#efe7d2'] };
const FONTS = () => fontFace('Splash', 'Bangers-Regular.woff2') + fontFace('Lettering', 'ComicNeue-Bold.woff2');
// a page panel: slate night, Ben-Day dots, ink frame
const page = (h, label, body, style = '') => comicSvg(W, h, label, `<defs><pattern id="ben" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.9" fill="${K.dot}"/></pattern></defs>
<rect width="${W}" height="${h}" fill="${K.slate}"/><rect width="${W}" height="${h}" fill="url(#ben)"/>${body}
<rect x="3" y="3" width="${W - 6}" height="${h - 6}" fill="none" stroke="${K.ink}" stroke-width="6"/>`, FONTS() + style);
const say = (x, y, t, size = 20, fill = K.ink, extra = '') => `<text x="${x}" y="${y}" font-family="Lettering" font-size="${size}" fill="${fill}" ${extra}>${xmlText(t)}</text>`;
// narration box: paper (or maroon) with an ink drop shadow, sized to its lettering
function caption(x, y, lines, { fill = K.paper, color = K.ink, size = 20, rot = 0, delay = 0 } = {}) {
  const wpx = Math.max(...lines.map(l => l.length)) * size * .56 + 30, hpx = lines.length * size * 1.3 + 18;
  return `<g class="pop" style="animation-delay:${delay}s" transform="rotate(${rot} ${x + wpx / 2} ${y + hpx / 2})"><rect x="${x + 5}" y="${y + 5}" width="${wpx.toFixed(0)}" height="${hpx.toFixed(0)}" fill="${K.ink}"/><rect x="${x}" y="${y}" width="${wpx.toFixed(0)}" height="${hpx.toFixed(0)}" fill="${fill}" stroke="${K.ink}" stroke-width="3"/>${lines.map((l, i) => say(x + 15, y + 9 + size * 1.05 + i * size * 1.3, l, size, color)).join('')}</g>`;
}
const popCss = `.pop{animation:pop .35s cubic-bezier(.2,.8,.3,1) both}@keyframes pop{from{opacity:0;transform:translateY(8px)}}`;
const up = s => s.toUpperCase();

// ---------- 2. the last 120 nights ----------
function signal() {
  const H = 330, d = last(120), max = Math.max(1, ...d.map(x => x.count));
  const x0 = 48, x1 = W - 48, bw = (x1 - x0) / d.length, base = 232, hmax = 140;
  const sorted = d.map(x => x.count).sort((a, b) => a - b), p75 = sorted[Math.floor(sorted.length * .75)];
  const o = [caption(34, 28, ['THE LAST 120 NIGHTS.'], { rot: -1 })];
  o.push(`<rect x="${x0}" y="${base}" width="${x1 - x0}" height="4" fill="${K.ink}"/>`);
  d.forEach((day, i) => {
    const h = day.count ? Math.max(3, Math.sqrt(day.count / max) * hmax) : 2;
    const last1 = i === d.length - 1;
    const fill = last1 ? K.red : day.count > p75 ? K.paper : K.cells[2];
    o.push(`<rect class="bar" style="animation-delay:${(i * .01).toFixed(2)}s" x="${(x0 + i * bw + 1).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="${K.ink}" stroke-width="1"><title>${day.date}: ${day.count}</title></rect>`);
  });
  o.push(say(x0, base + 26, up(shortDate(d[0].date)), 14, K.paper) + say(x1, base + 26, 'TONIGHT', 14, K.paper, 'text-anchor="end"'));
  const peak = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);
  o.push(caption(48, 272, [`LONGEST RUN: ${longest} NIGHTS.`], { size: 17, delay: .9 }));
  o.push(caption(400, 272, [`${fmt(activeDays)} NIGHTS ON PATROL.`], { size: 17, delay: 1.05, rot: .6 }));
  o.push(caption(790, 272, [`WORST NIGHT: ${peak.date}, ${peak.count}.`], { size: 17, delay: 1.2, fill: K.maroon, color: K.paper, rot: -.6 }));
  return page(H, `Commits over the last 120 nights. Longest run ${longest} nights, ${activeDays} active days, busiest ${peak.date} with ${peak.count}.`, o.join('\n'),
    `${popCss}.bar{transform-box:fill-box;transform-origin:50% 100%;animation:grow .6s cubic-bezier(.2,.8,.2,1) both}@keyframes grow{from{transform:scaleY(0)}}`);
}

// ---------- 3. latest commits, one row each ----------
function log() {
  // one row per distinct message, so a change repeated across repos does not fill the panel
  const seen = new Set(), rows = [];
  for (const c of commits) {
    if (seen.has(c.msg)) continue;
    seen.add(c.msg);
    rows.push(c);
    if (rows.length === 6) break;
  }
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  const x = 48, rw = W - 96, rowH = 52, top = 98, H = top + rows.length * rowH + 22;
  const o = [caption(34, 28, ['LATEST COMMITS.'], { rot: -1 })];
  rows.forEach((c, i) => {
    const y = top + i * rowH;
    o.push(`<g class="pop" style="animation-delay:${(.3 + i * .1).toFixed(1)}s"><rect x="${x + 4}" y="${y + 4}" width="${rw}" height="40" fill="${K.ink}"/><rect x="${x}" y="${y}" width="${rw}" height="40" fill="${K.paper}" stroke="${K.ink}" stroke-width="3"/><rect x="${x}" y="${y}" width="118" height="40" fill="${K.maroon}" stroke="${K.ink}" stroke-width="3"/><text x="${x + 59}" y="${y + 29}" text-anchor="middle" font-family="Splash" font-size="24" letter-spacing="1" fill="${K.paper}">${up(shortDate(c.date))}</text>${say(x + 136, y + 27, up(cut(c.repo, 24)), 18, K.maroon)}${say(x + 410, y + 27, up(cut(c.msg, 62)), 18)}</g>`);
  });
  return page(H, `Latest commits: ${rows.map(c => `${c.date} ${c.repo}: ${c.msg}`).join('; ')}.`, o.join('\n'), popCss);
}

// ---------- 4. the city he built: last 12 months as an ink skyline ----------
function skyline() {
  const H = 560, s = 16, a = s * .9, b = s * .34;
  const lastYear = last(364 + new Date(today).getUTCDay() + 1);
  const firstDay = new Date(lastYear[0].date).getUTCDay();
  const cells = lastYear.map((d, i) => ({ ...d, w: Math.floor((i + firstDay) / 7), d: (i + firstDay) % 7 }));
  const max = Math.max(1, ...cells.map(c => c.count));
  const weeks = cells.at(-1).w + 1;
  const ox = W / 2 - ((weeks - 7) / 2) * a + 40, oy = 230;
  const P = (w, d, h = 0) => [ox + (w - d) * a, oy + (w + d) * b - h];
  const pts = arr => arr.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const peak = cells.reduce((x, y) => (y.count > x.count ? y : x), cells[0]);
  const r = rng(11), o = [];
  o.push(caption(34, 28, ['THE CITY HE BUILT.', `12 MONTHS, ${fmt(sum(lastYear))} COMMITS.`], { rot: -.8 }));
  const g = .1;
  cells.sort((x, y) => (x.w + x.d) - (y.w + y.d) || x.w - y.w).forEach(c => {
    const h = c.count ? 4 + Math.sqrt(c.count / max) * 180 : 1.5;
    const w0 = c.w + g, w1 = c.w + 1 - g, d0 = c.d + g, d1 = c.d + 1 - g;
    const top = pts([P(w0, d0, h), P(w1, d0, h), P(w1, d1, h), P(w0, d1, h)]);
    const right = pts([P(w1, d0, 0), P(w1, d1, 0), P(w1, d1, h), P(w1, d0, h)]);
    const left = pts([P(w0, d1, 0), P(w1, d1, 0), P(w1, d1, h), P(w0, d1, h)]);
    let win = '';
    if (h > 24) for (let k = 0; k < h / 10; k++) if (r() < .3) {
      const t = .2 + r() * .55, [wx, wy] = P(w0 + (w1 - w0) * t, d1, 7 + k * 10);
      win += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2.4" height="3.4" fill="${K.paper}" opacity=".85"/>`;
    }
    const zero = !c.count;
    o.push(`<g class="b" style="animation-delay:${(c.w * .02).toFixed(2)}s"><title>${c.date}: ${c.count}</title><polygon points="${left}" fill="${zero ? K.cells[0] : K.ink}" stroke="${K.ink}" stroke-width=".6"/><polygon points="${right}" fill="${zero ? K.cells[0] : '#16213a'}" stroke="${K.ink}" stroke-width=".6"/><polygon points="${top}" fill="${c === peak ? K.red : zero ? K.cells[0] : K.cells[1]}" stroke="${K.ink}" stroke-width=".8"/>${win}</g>`);
  });
  // a caption pointing at the tallest building, the way a comic tags a location
  const [px, py] = P(peak.w + .5, peak.d + .5, 4 + 180);
  const cx = Math.min(W - 330, px + 40), cy = 70;
  o.push(`<path d="M${(cx + 40).toFixed(0)},${cy + 64} L${px.toFixed(0)},${(py - 6).toFixed(0)} L${(cx + 70).toFixed(0)},${cy + 64} Z" fill="${K.paper}" stroke="${K.ink}" stroke-width="3" class="pop" style="animation-delay:1.4s"/>`);
  o.push(caption(cx, cy, [`TALLEST: ${peak.date}.`, `${peak.count} COMMITS IN ONE NIGHT.`], { size: 17, delay: 1.4, rot: .6 }));
  return page(H, `The last 12 months of commits drawn as a city skyline. Tallest building ${peak.date} with ${peak.count}.`, o.join('\n'),
    `${popCss}.b{animation:rise .8s cubic-bezier(.2,.8,.2,1) both}@keyframes rise{from{opacity:0;transform:translateY(14px)}}`);
}

// ---------- 5. utility belt ----------
function tools() {
  const list = ['JAVA', 'PYTHON', 'JAVASCRIPT', 'TYPESCRIPT', 'C++', 'C#', 'REACT', 'NODE', 'SPRING', 'FASTAPI', 'SUPABASE', 'POSTGRES', 'GIT'];
  const H = 210, o = [caption(34, 28, ['UTILITY BELT.'], { rot: -1 })];
  let x = 48, y = 98;
  list.forEach((t, i) => {
    const w = t.length * 15 + 34;
    if (x + w > W - 48) { x = 48; y += 54; }
    o.push(`<g class="pop" style="animation-delay:${(.3 + i * .06).toFixed(2)}s"><rect x="${x + 4}" y="${y + 4}" width="${w}" height="38" fill="${K.ink}"/><rect x="${x}" y="${y}" width="${w}" height="38" fill="${i % 5 === 2 ? K.maroon : K.paper}" stroke="${K.ink}" stroke-width="3"/><text x="${x + w / 2}" y="${y + 29}" text-anchor="middle" font-family="Splash" font-size="26" letter-spacing="1" fill="${i % 5 === 2 ? K.paper : K.ink}">${xmlText(t)}</text></g>`);
    x += w + 14;
  });
  return page(H, `Tools: ${list.join(', ')}.`, o.join('\n'), popCss);
}

// ---------- 6. to be continued ----------
function end() {
  const H = 150;
  const o = [say(48, 84, `REBUILT ${today} FROM LIVE DATA.`, 15, K.paper, 'opacity=".75"')];
  o.push(`<g class="pop" style="animation-delay:.3s" transform="rotate(-1.5 ${W - 270} 75)"><rect x="${W - 486}" y="39" width="440" height="72" fill="${K.ink}"/><rect x="${W - 492}" y="33" width="440" height="72" fill="${K.paper}" stroke="${K.ink}" stroke-width="3"/><text x="${W - 272}" y="86" text-anchor="middle" font-family="Splash" font-size="46" letter-spacing="2" fill="${K.ink}">TO BE CONTINUED&#8230;</text></g>`);
  return page(H, `To be continued. Rebuilt ${today}.`, o.join('\n'), popCss);
}

mkdirSync(OUT, { recursive: true });
const panels = { 'hero.svg': heroSplash(), 'log.svg': log(), 'signal.svg': signal(), 'skyline.svg': skyline(), 'tools.svg': tools(), 'end.svg': end() };
for (const [f, s] of Object.entries(panels)) writeFileSync(new URL(f, OUT), s);
console.log(`built ${Object.keys(panels).length} panels: total ${total}, ${thisYear} ${yearTotal}, streak ${streak}, longest ${longest}`);
