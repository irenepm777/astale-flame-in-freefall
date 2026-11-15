// ─────────────────────────────────────────────────────────────────────────────
// engine.js - El motor de cálculo del Fire Twin: simulate(escenario) → resultado
//
// No toca la pantalla: recibe un escenario y devuelve números. Responde tres preguntas:
//   1. ¿Arde aquí?          → verdict(): compara el oxígeno del escenario con lo medido en BASS-II y Saffire
//   2. ¿Cuánto tiempo hay?  → curvas de CO en la cabina y cuándo cruzan el límite de 1 hora (425 ppm)
//   3. ¿Qué pasa con plan?  → si la tripulación corta la ventilación o usa el extintor, el fuego se apaga antes
//
// El escenario (s) es un objeto: { mat, size, o2, p, g, V, u, delay, cpm }
//   mat = material | size = tamaño | o2 = % de oxígeno | p = presión (atm) | g = gravedad
//   V = volumen de la cabina (m³) | u = velocidad del aire (cm/s) | delay = reacción de la tripulación (s)
//   cpm = ¿hay sensor de gases sensible?
// ─────────────────────────────────────────────────────────────────────────────
import { MAT, SIZE, FLEX_FIT, kHept, CO_LOAD, SPREAD, SMAC_CO } from './data.js';

// Supuestos nuestros (se enseñan en el libro de cuentas)
export const ASSUME = { smokeDist: 300, smokeBuild: 30, plume1g: 50, gasThr: 50, gasThrCpm: 5, quench: 30, extTime: 60, tmax: 1800 };

function verdict(m, s) {
  const M = MAT[m], o2 = s.o2;
  const partial = s.g > 0 && s.g < 1;
  if (M.kind === 'limit') {
    let lo = Math.min(...M.band), hi = Math.max(...M.band), ex = partial;
    if (s.g === 1) { lo = M.g1 - 0.5; hi = M.g1 + 0.5; }
    if (partial) lo = Math.min(lo, M.g1);
    const st = o2 > hi ? 'burns' : o2 >= lo ? 'edge' : 'safe';
    return { st, lo, hi, ex: ex || s.p < 0.95, margin: o2 - hi };
  }
  if (M.kind === 'burns') {
    const [lo, hi] = M.tested;
    if (o2 >= lo - 0.5) return { st: 'burns', lo, hi, ex: o2 > hi + 1 || s.g > 0 || s.p < 0.95 };
    return { st: 'untested', lo, hi, ex: true };
  }
  const [lo, hi] = M.tested;
  if (o2 <= hi + 0.5 && s.g === 0) return { st: 'safe', lo, hi, ex: false };
  return { st: 'untested', lo, hi, ex: true };
}

function speedFactor(s) {
  const o2 = Math.min(Math.max(s.o2 / 100, FLEX_FIT.o2[0]), FLEX_FIT.o2[1]);
  const p = Math.min(Math.max(s.p, FLEX_FIT.p[0]), FLEX_FIT.p[1]);
  return kHept(o2, p) / kHept(0.21, 1);
}

// Una curva de CO: generación lineal mientras arde (aire bien mezclado, sin filtros: conservador)
function coCurve(s, load, v, stopAt) {
  const sz = SIZE[s.size], dur = sz.len / v; // s
  const total = load * (sz.area / SIZE.saffire.area) / s.V; // ppm al final del fuego
  return (t) => total * Math.min(Math.min(t, stopAt ?? Infinity), dur) / dur;
}
const firstCross = (f, thr, tmax = ASSUME.tmax) => { for (let t = 0; t <= tmax; t += 2) if (f(t) >= thr) return t; return null; };

export function simulate(s) {
  const vd = verdict(s.mat, s);
  const k = speedFactor(s);
  const vLo = SPREAD[0] * k, vHi = SPREAD[1] * k, vMid = Math.sqrt(vLo * vHi);
  const loadMid = Math.sqrt(CO_LOAD[0] * CO_LOAD[1]);
  const mid = coCurve(s, loadMid, vMid), worst = coCurve(s, CO_LOAD[1], vHi), best = coCurve(s, CO_LOAD[0], vLo);
  // Detección
  const uEff = Math.sqrt(s.u ** 2 + (ASSUME.plume1g * Math.sqrt(s.g)) ** 2); // convección mixta: aire forzado + flotabilidad
  const tSmoke = uEff > 0.5 ? ASSUME.smokeBuild + ASSUME.smokeDist / uEff : null;
  const tGas = firstCross(mid, s.cpm ? ASSUME.gasThrCpm : ASSUME.gasThr);
  const dets = [tSmoke, tGas].filter((x) => x != null);
  const tDet = dets.length ? Math.min(...dets) : null;
  // Plan: cortar ventilación y corriente; si no basta, extintor
  let tAct = null, tOut = null, ventWorks = false;
  if (tDet != null && tDet + s.delay <= ASSUME.tmax) {
    tAct = tDet + s.delay;
    ventWorks = s.g === 0 && s.o2 < 30;
    tOut = tAct + (ventWorks ? ASSUME.quench : ASSUME.extTime);
  }
  const planMid = coCurve(s, loadMid, vMid, tOut), planWorst = coCurve(s, CO_LOAD[1], vHi, tOut), planBest = coCurve(s, CO_LOAD[0], vLo, tOut);
  const dur = [SIZE[s.size].len / vHi, SIZE[s.size].len / vLo];
  return {
    vd, k, v: [vLo, vHi], dur, tSmoke, tGas, tDet, tAct, tOut, ventWorks,
    curves: { mid, worst, best, planMid, planWorst, planBest },
    t425: { none: [firstCross(worst, SMAC_CO), firstCross(best, SMAC_CO)], plan: [firstCross(planWorst, SMAC_CO), firstCross(planBest, SMAC_CO)] },
    peak: { none: [best(1e9), worst(1e9)], plan: [planBest(1e9), planWorst(1e9)] },
  };
}
