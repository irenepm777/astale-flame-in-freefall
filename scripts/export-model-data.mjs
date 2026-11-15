// Prepara los datos «listos para modelos» que se descargan desde el Panel (src/datasets/).
// Sale todo de lo ya extraído de PSI: src/js/data/psi.js (puntos O₂–presión de cada investigación)
// y data/calibration.json (FLEX, BASS-II, Saffire-II). Lanzar: node scripts/export-model-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PSI } from '../src/js/data/psi.js';

const cal = JSON.parse(readFileSync('data/calibration.json', 'utf8'));
mkdirSync('src/datasets', { recursive: true });
const csv = (rows) => rows.map((r) => r.map((v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}).join(',')).join('\n') + '\n';

// 1) Todas las condiciones ensayadas (un punto = una combinación O₂–presión de un ensayo)
const pts = [['psi_id', 'experiment', 'research_area', 'o2_pct', 'pressure_atm', 'pressure_psi', 'source']];
for (const p of PSI) for (const [o2, atm] of p.points) pts.push([p.id, p.acr || '', p.sub, o2, atm, +(atm * 14.7).toFixed(2), `https://psi.nasa.gov/physci/repo/investigations/${p.id}`]);
writeFileSync('src/datasets/psi_condiciones.csv', csv(pts));

// 2) FLEX: gotas de combustible (ley d²)
const fx = [['fuel', 'o2_frac', 'pressure_atm', 'co2_frac', 'he_frac', 'd0_mm', 'dext_mm', 'K_mm2_s', 'burn_s', 'end']];
for (const d of cal.flex_droplets) fx.push([d.fuel, d.o2, d.atm, d.co2, d.he, d.d0_mm, d.dext_mm, d.K_mm2s, d.burn_s, d.end]);
writeFileSync('src/datasets/flex_gotas.csv', csv(fx));

// 3) BASS-II: O₂ al que se apagó cada llama al diluir con N₂
const bx = [['pi', 'sample', 'geometry', 'air_cm_s', 'o2_burning_pct', 'o2_extinction_pct']];
for (const b of cal.bass2_extinction) bx.push([b.pi, b.sample.replace(/\s+/g, ' ').trim(), /rod|cyl/i.test(b.sample) ? 'rod' : 'slab', String(b.air).replace(/\s+/g, ' ').trim(), b.o2_start, b.o2_end]);
writeFileSync('src/datasets/bass2_extincion.csv', csv(bx));

// 4) Saffire-II: materiales de cabina a escala
const sx = [['sample', 'material', 'thickness', 'flow', 'o2_pct', 'burn', 'direction']];
for (const s of cal.saffire2_samples) sx.push([s.sample, s.material, s.thickness, s.flow, s.o2, s.burn, s.dir]);
writeFileSync('src/datasets/saffire2_materiales.csv', csv(sx));

const counts = { psi_condiciones: pts.length - 1, flex_gotas: fx.length - 1, bass2_extincion: bx.length - 1, saffire2_materiales: sx.length - 1 };
writeFileSync('src/datasets/README.txt', `Astale · datos listos para modelos (NASA PSI, CC0). Generado ${new Date().toISOString().slice(0, 10)}.\n` +
  Object.entries(counts).map(([k, n]) => `${k}.csv: ${n} filas`).join('\n') + '\nFuente: https://psi.nasa.gov · cada fila lleva su investigación.\n');
console.log(counts);
