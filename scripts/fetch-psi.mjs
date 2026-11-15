// Descarga de PSI (psi.nasa.gov) las 24 investigaciones de «Combustion Science» y sus tablas de ensayos,
// y genera src/js/data/psi.js (lo que usa el panel). Datos de la NASA, licencia CC0.
// Uso: node scripts/fetch-psi.mjs   (en Windows lanzar con NODE_OPTIONS=--use-system-ca)
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const API = 'https://psi.nasa.gov/geode-py/ws';
const RAW = 'data-raw/psi';
mkdirSync(`${RAW}/tables`, { recursive: true });

const get = async (url, as = 'json') => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return as === 'json' ? r.json() : r.text();
    } catch {}
    await new Promise((s) => setTimeout(s, 1500));
  }
  throw new Error('No se pudo bajar ' + url);
};

function parseCSV(t) {
  t = t.replace(/^﻿/, '');
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; r.push(f); rows.push(r); r = []; f = ''; }
    else f += c;
  }
  if (f || r.length) { r.push(f); rows.push(r); }
  return rows.filter((x) => x.some((v) => v.trim())).map((x) => x.map((v) => v.trim()));
}
const clean = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();

// Puntos (O₂ %, presión atm) de cada ensayo, para el mapa de cobertura. Una función por tabla.
const POINTS = {
  'PSI-69': (r) => [+r['O initial ambient composition; mole fraction'] * 100, +r['Ambient pressure; mmHg'] / 760],
  'PSI-159': (r) => [+(r['XO2 before test'] || r['XO2']) * 100, +r['approx p (bar)'] / 1.01325],
  'PSI-10': (r) => [+(r['XO2 (init)'] || r['XO2']) * 100, +r['pmean (atm)']],
  'PSI-39': (r) => [+r['Oxygen'] * 100, parseFloat(r['Pressure'])],
  'PSI-25': (r) => [+r['Calibrated  initial O2 % by vol'], 1],
  'PSI-98': (r) => [parseFloat(r['Percent O2']) || NaN, 1],
};
// Tablas sin O₂/presión por ensayo: condiciones conocidas (de la propia tabla o del objetivo en PSI).
const FIXED = {
  'PSI-26': [[21, 1]], 'PSI-100': [[21, 1]], 'PSI-99': [[22, 1]], 'PSI-107': [[21, 1]], 'PSI-106': [[21, 1]],
  'PSI-102': [[21, 1]], 'PSI-101': [[21, 1]], 'PSI-47': [[21, 1]], 'PSI-21': [[21, 1]], 'PSI-22': [[21, 1]],
  'PSI-23': [[21, 1], [30, 1]],
  // BRE: «14.7 psia, 21 %; 10.2 psia, 26.5 %; 8.2 psia, 34 %» (objetivo 1) y O₂ 21–40 % en la tabla
  'PSI-20': [[21, 1], [26.5, 10.2 / 14.7], [34, 8.2 / 14.7], [40, 1]],
  // FLEX-2: O₂ 0.17–0.30, 0.5–3 atm (tabla resumen)
  'PSI-68': [0.17, 0.21, 0.25, 0.3].flatMap((o) => [0.5, 1, 1.5, 2, 3].map((p) => [o * 100, p])),
};

const search = await get(`${API}/repo/search?term=&source=psi&type=investigation&size=500`);
const all = search.hits.hits.map((h) => h._source);
const comb = all.filter((x) => /combust/i.test(x['Research Area']));
console.log(`PSI: ${all.length} investigaciones; de combustión: ${comb.length}`);

const out = [];
for (const s of comb) {
  const id = s.Accession;
  const j = await get(`${API}/repo/investigations/${id}`);
  const tables = [];
  const pts = [];
  for (const t of j.experimentalTable || []) {
    const file = `${RAW}/tables/${t.file_name}`;
    let text;
    if (existsSync(file)) text = readFileSync(file, 'utf8');
    else {
      text = await get(`${API}/studies/${id}/download?file=${encodeURIComponent(t.file_name)}&version=${t.version || 1}`, 'text');
      writeFileSync(file, text);
    }
    const rows = parseCSV(text);
    const head = rows[0];
    const body = rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] || ''])));
    tables.push({ name: t.file_name.replace(/^PSI-\d+_Experimental table_/, '').replace(/\.csv$/, ''), head, rows: rows.slice(1) });
    if (POINTS[id]) for (const r of body) {
      const [o, p] = POINTS[id](r);
      if (isFinite(o) && isFinite(p) && o > 0 && p > 0) pts.push([+o.toFixed(1), +p.toFixed(3)]);
    }
  }
  if (FIXED[id]) pts.push(...FIXED[id]);
  out.push({
    id, acr: j.investigationAcronym || '', title: j.title, sub: s['SubResearch Area'] || '', type: j.projectType,
    platform: s['Flight Platform'] || '', start: j.investigationStartDate, end: j.investigationEndDate,
    center: j.managingNasaCenter, doi: j.doi, size: j.totalFileSize, released: j.releaseDate,
    keywords: (s.Keywords || '').split(/\s{3,}/).map((k) => k.trim()).filter(Boolean),
    related: (s['Related Investigations'] || '').split(/\s+/).filter((x) => /^PSI-/.test(x)),
    hardware: j.experimentHardware || '',
    people: (j.contacts || []).map((c) => ({ name: `${c.firstName} ${c.lastName}`.trim(), aff: c.affiliation, role: c.roles?.[0]?.annotationValue || '' })),
    objective: clean(j.objective), approach: clean(j.approach), hypothesis: clean(j.hypothesis), impacts: clean(j.researchImpacts),
    pubs: (j.publications || []).map((p) => ({ title: p.title, authors: p.authorList, doi: p.doi })),
    tables, points: [...new Set(pts.map(String))].map((x) => x.split(',').map(Number)),
    tests: tables.reduce((n, t) => n + t.rows.length, 0),
  });
  console.log(`  ${id} ${j.investigationAcronym || '(tierra)'}: ${tables.length} tablas, ${pts.length} puntos`);
}
writeFileSync(`${RAW}/combustion.json`, JSON.stringify(out, null, 1));
writeFileSync('src/js/data/psi.js', `// GENERADO por scripts/fetch-psi.mjs desde psi.nasa.gov (${new Date().toISOString().slice(0, 10)}). No editar a mano.\nexport const PSI = ${JSON.stringify(out)};\n`);
console.log('src/js/data/psi.js listo');
