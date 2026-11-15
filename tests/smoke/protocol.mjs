// Browser smoke test of the Fire Response Protocol (index.html): every habitat × every burning area, in English and
// Spanish, on the command screen and in the report, plus one full flow by clicking (home → alarm → command → report).
// Fails on browser errors, on "undefined" / "NaN" in the page, on an empty screen, or on Spanish text in the English version.
// Usage: node tests/smoke/protocol.mjs <site-dir>
//   CHROME_PATH      optional: use this Chrome/Chromium binary instead of Playwright's own
//   PLAYWRIGHT_DIR   optional: folder whose node_modules contains playwright (if it is not installed locally)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

async function loadPlaywright() {
  try { return await import('playwright'); } catch {
    if (!process.env.PLAYWRIGHT_DIR) throw new Error('playwright is not installed: run "npm i -D playwright && npx playwright install chromium"');
    return createRequire(path.join(process.env.PLAYWRIGHT_DIR, '/'))('playwright');
  }
}
const { chromium } = await loadPlaywright();
const [dir] = process.argv.slice(2);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.csv': 'text/csv', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const HABITATS = ['iss', 'orion', 'orion_eva', 'moon', 'mars'];
const ZONES = ['galley', 'sleeping', 'lab', 'equipment', 'storage', 'unknown'];
// Spanish words that must not appear in the English version (team names are allowed)
const SPANISH = /\b(el|la|los|las|del|que|con|para|una|por|sin|fuego|zona|arde|tripulación)\b|[ñ¿¡]|ción\b/;
const TEAM = /José Luis Endrino|José María Mallén|Álvaro Morillo|Iván Molina/g;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [], problems = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => { try { sessionStorage.setItem('astale-intro', '1'); } catch {} });

const appText = () => page.evaluate(() => document.getElementById('app')?.innerText || '');
function check(where, text, lang) {
  if (!text.trim()) problems.push(`${where}: empty screen`);
  if (/undefined|NaN|\[object/.test(text)) problems.push(`${where}: undefined or NaN in the page`);
  if (lang === 'en') { const lines = text.replace(TEAM, '').split('\n').filter((l) => SPANISH.test(l)); if (lines.length) problems.push(`${where}: Spanish text: ${lines[0].slice(0, 120)}`); }
  if (errors.length) { problems.push(`${where}: ${errors.join(' | ')}`); errors.length = 0; }
}

let screens = 0;
for (const lang of ['en', 'es']) {
  for (const h of HABITATS) for (const z of ZONES) for (const s of ['', '&s=report']) {
    await page.goto(`${base}/?lang=${lang}&d=${h},${z},admin&t=90${s}`);
    await page.waitForSelector('#app main');
    check(`${lang} ${h} ${z}${s ? ' report' : ' command'}`, await appText(), lang);
    screens++;
  }
}

// One full flow by clicking, in English
await page.goto(`${base}/?lang=en`);
await page.click('[data-hab=moon]'); await page.click('[data-zone=lab]'); await page.click('[data-mat=mix]');
await page.click('[data-act=simulate]');
await page.waitForSelector('.f-alarm');
await page.click('[data-role=cmd]');
await page.waitForSelector('.f-act');
for (let i = 0; i < 12; i++) {
  if (await page.$('[data-act=dismiss]')) await page.click('[data-act=dismiss]');
  if (!(await page.$('[data-act=check]'))) break;
  await page.click('[data-act=check]');
}
check('flow command', await appText(), 'en');
await page.click('.f-tools [data-act=report]');
await page.waitForSelector('.f-rep');
check('flow report', await appText(), 'en');
await page.click('[data-rtab=twin]');
await page.waitForSelector('#f-embed-twin');
screens += 2;

console.log(`protocol: ${screens} screens checked, ${problems.length} problems`);
problems.slice(0, 20).forEach((p) => console.log('  ', p));
await browser.close(); server.close();
process.exit(problems.length ? 1 : 0);
