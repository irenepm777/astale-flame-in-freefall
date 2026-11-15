// Página pública: solo el Panel, en inglés, sin intranet ni login.
// Repite lo mínimo de app.js (unir PSI con nuestra capa y la relevancia 0–100) para no arrastrar toda la intranet.
import { PSI } from './data/psi.js';
import { pressFeedback } from './core/morph.js';
pressFeedback();
import * as ES from './data/experiments.js';
import { PILLARS_EN, SCENARIOS_EN, CURATION_EN, STATE_EN } from './data/experiments-en.js';
import { mountPanel } from './panel/index.js';
import { mountFireTwin } from './fire-twin/index.js';
import { mountAccount } from './account/account.js';

const LANG = document.documentElement.lang === 'es' ? 'es' : 'en', EN = LANG === 'en';
// Idioma: el que eligió la persona; si nunca eligió, el de su navegador
try {
  const pref = localStorage.getItem('astale-pub-lang') || ((navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en');
  if (pref !== LANG) location.replace((pref === 'es' ? 'es.html' : './') + location.hash);
} catch {}
document.querySelectorAll('.pub-lang a').forEach((a) => { a.classList.toggle('on', a.dataset.l === LANG); a.addEventListener('click', (e) => { e.preventDefault(); try { localStorage.setItem('astale-pub-lang', a.dataset.l); } catch {} location.href = a.getAttribute('href') + location.hash; }); });
const ATM = 14.7;
const PILLARS = EN ? PILLARS_EN : ES.PILLARS;
const SCENARIOS = ES.SCENARIOS.map((s) => (EN && SCENARIOS_EN[s.id] ? { ...s, ...SCENARIOS_EN[s.id] } : s));
const CURATION = EN ? Object.fromEntries(Object.entries(ES.CURATION).map(([k, v]) => [k, { ...v, ...(CURATION_EN[k] || {}) }])) : ES.CURATION;
const stateName = (st) => (EN ? STATE_EN[st] || st : st);
const INV = PSI.map((p) => {
  const c = CURATION[p.id] || {};
  const o2 = p.points.map((x) => x[0]), pr = p.points.map((x) => x[1]);
  return { ...p, ...c, acr: p.acr || p.title.split(/[:(]/)[0].slice(0, 38) + '…', ground: /Ground/i.test(p.type),
    o2: o2.length ? [Math.min(...o2), Math.max(...o2)] : null, atm: pr.length ? [Math.min(...pr), Math.max(...pr)] : null };
});
function covers(i, sc) {
  if (!i.points.length) return 0;
  const tAtm = sc.psi / ATM;
  if (i.points.some(([o, p]) => Math.abs(o - sc.o2) <= 4 && Math.abs(p - tAtm) <= 0.12)) return 2;
  if (i.points.some(([o]) => Math.abs(o - sc.o2) <= 4) || i.points.some(([, p]) => Math.abs(p - tAtm) <= 0.12)) return 1;
  return 0;
}
function parts(i, sc, pillar) {
  const p = i.pillars || { prev: 0, det: 0, sup: 0, mod: 0 };
  const pil = pillar === 'all' ? (Math.max(p.prev, p.det, p.sup) + p.mod / 2) / 4.5 : p[pillar] / 3;
  return [Math.round((i.base || 3) * 4), Math.round(pil * 40), covers(i, sc) * 10];
}
const score = (i, sc, pillar) => parts(i, sc, pillar).reduce((a, b) => a + b, 0);
const scoreTip = (i, sc, pillar) => { const [r, p, a] = parts(i, sc, pillar);
  return EN ? `Relevance ${r + p + a}/100 = challenge ${r}/40 + pillar ${p}/40 + mission atmosphere ${a}/20` : `Relevancia ${r + p + a}/100 = reto ${r}/40 + pilar ${p}/40 + atmósfera de la misión ${a}/20`; };
const decorate = (root) => root.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });

mountPanel(document.getElementById('panel-app'), { LANG, INV, SCENARIOS, PILLARS, score, scoreTip, covers, stateName, decorate });
const twin = document.getElementById('firetwin-app');
document.getElementById('pn-twin-slot')?.append(twin);
mountFireTwin(twin, LANG, decorate);
mountAccount(document.getElementById('pub-acct'), LANG);
// El puente a Claude solo funciona en el ordenador del equipo: la casilla solo se ve si ese navegador ya la usó (o con ?claude)
let useClaude = /[?&]claude/.test(location.search); try { useClaude = useClaude || localStorage.getItem('astale-claude') === '1'; } catch {}
if (!useClaude) document.querySelector('.pn-engine')?.remove();
if (location.hash.startsWith('#pn-')) window.__panelTab?.(location.hash.slice(1), false);

// Enlaces internos de la intranet que aquí no existen
document.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  if (a.dataset.inv) { e.preventDefault(); window.open('https://psi.nasa.gov/physci/repo/investigations/' + a.dataset.inv, '_blank', 'noopener'); return; }
  const h = a.getAttribute('href') || '';
  if (!h.startsWith('#')) return;
  const id = { firetwin: 'pn-twin', simulador: 'pn-twin', dashboard: 'pn-1', panel: 'pn-home' }[h.slice(1)] || h.slice(1);
  if (id.startsWith('pn-') && window.__panelTab) { e.preventDefault(); window.__panelTab(id); return; }
  const el = document.getElementById(id);
  e.preventDefault();
  if (el) el.scrollIntoView({ behavior: 'smooth' });
});
