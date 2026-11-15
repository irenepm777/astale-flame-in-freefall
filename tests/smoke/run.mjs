// Browser smoke test: opens the English Panel in a real Chromium, walks through the Fire Twin scenarios,
// the Panel tabs, the in-browser model training and the Ask answer, and saves the rendered text as JSON.
// Usage: node tests/smoke/run.mjs <site-dir> <output.json> [entry-path]
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
const [dir, out, entry = '/panel.html'] = process.argv.slice(2);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.csv': 'text/csv', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: 'en-US' }); // pinned: the Panel follows the browser language
const errores = [];
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errores.push('console: ' + m.text()); });
await page.addInitScript(() => { try { localStorage.setItem('astale-tour-firetwin', '1'); } catch {} Math.random = () => 0.5; });
await page.goto(`http://localhost:${port}${entry}`);
await page.waitForFunction(() => window.__panelTab, { timeout: 20000 });
await page.evaluate(() => window.__panelTab('pn-twin', false));
await page.waitForSelector('.ft-controls', { state: 'visible', timeout: 20000 });
const res = { escenarios: {}, errores };
const presets = ['iss', 'orion', 'orion_eva', 'reentry', 'splash', 'moon', 'mars'];
const mats = ['sibal', 'pmma_s', 'pmma_r', 'nomex', 'silicone'];
for (const pr of presets) for (const m of mats) {
  await page.evaluate(([pr, m]) => {
    const f = document.querySelector('.ft-controls');
    f.elements.preset.value = pr; f.elements.preset.dispatchEvent(new Event('input', { bubbles: true }));
    f.elements.mat.value = m; f.elements.mat.dispatchEvent(new Event('input', { bubbles: true }));
  }, [pr, m]);
  res.escenarios[`${pr}/${m}`] = await page.evaluate(() => {
    const g = (s) => document.querySelector(s)?.innerHTML ?? null;
    return { q1: g('#ft-q1'), q2: g('#ft-q2'), q3: g('#ft-q3'), q4: g('#ft-q4'), q5: g('#ft-q5'), q6: g('#ft-q6'), rank: g('#ft-rank'), gc: g('.ft-gc-screen'), crew: document.querySelector('.ft-gc-say')?.textContent };
  });
}
// ajustes manuales (o2, g, cpm) + historia + tabla de naves
await page.evaluate(() => {
  const f = document.querySelector('.ft-controls');
  for (const [k, v] of [['o2', '30'], ['p', '0.6'], ['u', '0'], ['V', '20'], ['delay', '120']]) { f.elements[k].value = v; f.elements[k].dispatchEvent(new Event('input', { bubbles: true })); }
  f.elements.g.value = '0.38'; f.elements.g.dispatchEvent(new Event('input', { bubbles: true }));
  f.elements.cpm.checked = true; f.elements.cpm.dispatchEvent(new Event('input', { bubbles: true }));
});
res.manual = await page.evaluate(() => ({ q1: document.querySelector('#ft-q1').innerHTML, q2: document.querySelector('#ft-q2').innerHTML, q3: document.querySelector('#ft-q3').innerHTML }));
await page.click('.ft-story'); await page.waitForTimeout(500);
res.historia = await page.evaluate(() => ({ q3: document.querySelector('#ft-q3').innerHTML, get: JSON.stringify(window.__astaleTwin.get()) }));
// pestañas del Panel: texto visible de cada bloque (incluye el modelo entrenado en el navegador)
res.panel = [];
for (const id of ['pn-home', 'pn-ask', 'pn-model', 'pn-1', 'pn-2', 'pn-3', 'pn-4', 'pn-about']) {
  await page.evaluate((id) => window.__panelTab(id, false), id);
  if (id === 'pn-model') {
    await page.waitForFunction(() => document.querySelector('.ml-res table, .ml-res .tbl') && document.querySelector('.ml-out .ml-big'), { timeout: 120000 }).catch(() => errores.push('el bloque de modelo no terminó de entrenar'));
    // the final ensemble trains after the comparison table: wait for the prediction form too
    await page.waitForFunction(() => !/Training…/.test(document.querySelector('#pn-model .ml-out')?.innerText || ''), { timeout: 120000 }).catch(() => errores.push('el modelo final no terminó de entrenar'));
  }
  await page.waitForTimeout(300);
  res.panel.push([id, await page.evaluate((id) => (document.getElementById(id)?.innerText || '').replace(/\s+/g, ' ').slice(0, 6000), id)]);
}
// pregunta a Astale (respuesta calculada)
await page.evaluate(() => window.__panelTab('pn-ask', false));
await page.fill('#pn-q', 'How long do we have if fabric burns on Orion?').catch(() => {});
await page.keyboard.press('Enter').catch(() => {});
await page.waitForTimeout(800);
res.pregunta = await page.evaluate(() => (document.getElementById('pn-answer')?.innerText || '').replace(/\s+/g, ' ').slice(0, 3000));
res.titulo = await page.title();
fs.writeFileSync(out, JSON.stringify(res));
console.log('escenarios', Object.keys(res.escenarios).length, '| bloques del panel', res.panel.length, '| errores', errores.length);
errores.slice(0, 5).forEach((e) => console.log('  ', e));
await browser.close(); server.close();
