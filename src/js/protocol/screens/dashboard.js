// ─────────────────────────────────────────────────────────────────────────────
// dashboard.js - Incident dashboard at the top of the report, and the CO chart shared with the command screen
//
// Twelve indicators in green / amber / red, a count per colour, the CO curve of the burning room and CO per room.
// It is a snapshot of the moment the report is opened. Thresholds: CO 425 ppm (NASA 1-hour limit, SMAC),
// oxygen 19.5–23.5 % (normal air) and ≥ 30 % (much more flammable, like the Moon base).
// ─────────────────────────────────────────────────────────────────────────────
import { SMAC_CO } from '../../fire-twin/index.js';
import { t } from '../i18n.js';
import { esc, nf, duration, clock } from '../format.js';
import { roomName } from '../scenarios.js';
import { world as W } from '../state.js';

/** CO in the burning room over time, with the dangerous level as a red dashed line. */
export function coChart() {
  const pts = W.co, tmax = Math.max(120, W.t), ymax = Math.max(SMAC_CO * 1.4, ...pts.map((q) => q[1]));
  const X = (s) => 8 + s / tmax * 284, Y = (v) => 92 - v / ymax * 84;
  return `<svg viewBox="0 0 300 100" class="f-chart" aria-label="${t('CO en', 'CO in')} ${esc(W.plan.rn)}"><line x1="8" x2="292" y1="${Y(SMAC_CO)}" y2="${Y(SMAC_CO)}" class="lim"/><text x="290" y="${Y(SMAC_CO) - 3}" text-anchor="end" class="lt">${t('peligroso', 'dangerous')} · ${SMAC_CO} ppm</text>
    <polyline points="${pts.map(([s, v]) => `${X(s).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" class="ln"/></svg>`;
}

export function dashboard(p) {
  const s = p.s, r = p.r, fr = W.sensors[p.cfg.room] || { co: 0, smoke: 0, temp: 22 }, tl = r.t425.none[0];
  const out = W.out != null && W.t > W.out, safe = p.vd.st === 'safe';
  const crew = W.crew, masks = crew.filter((c) => c.mask).length, worst = Math.max(0, ...crew.map((c) => c.co));
  const hr = crew.length ? crew.reduce((a, c) => a + c.hr, 0) / crew.length : 0;
  const nDone = Object.keys(W.status).length, late = p.A.filter((a) => !W.status[a.n] && W.t > a.end).length;
  const sev = p.cls.sev;
  // [state ok|warn|bad, label, value, short explanation]
  const K = [
    [safe || out ? 'ok' : 'bad', t('Fuego', 'Fire'), safe ? t('Sin llama', 'No flame') : out ? t('Apagado', 'Out') : t('Activo', 'Active'), safe ? t('el material no debería arder con este oxígeno', 'the material should not burn at this oxygen level') : out ? t(`apagado en ${clock(W.out)}`, `out at ${clock(W.out)}`) : t(`en ${p.rn}`, `in ${p.rn}`)],
    [fr.co < 50 ? 'ok' : fr.co < SMAC_CO ? 'warn' : 'bad', t(`Gas tóxico (CO) · ${p.rn.split(' (')[0]}`, `Toxic gas (CO) · ${p.rn.split(' (')[0]}`), `${nf(fr.co)} ppm`, t(`peligroso a partir de ${SMAC_CO} ppm`, `dangerous from ${SMAC_CO} ppm`)],
    [s.o2 >= 30 ? 'bad' : s.o2 > 23.5 || s.o2 < 19.5 ? 'warn' : 'ok', t('Oxígeno en el aire', 'Oxygen in the air'), `${nf(s.o2, 1)} %`, s.o2 >= 30 ? t('mucho más inflamable que en la Tierra', 'much more flammable than on Earth') : s.o2 > 23.5 ? t('más inflamable que en la Tierra', 'more flammable than on Earth') : t('como en la Tierra (21 %)', 'same as on Earth (21 %)')],
    [Math.abs(s.p - 1) <= 0.05 ? 'ok' : 'warn', t('Presión de la cabina', 'Cabin pressure'), `${nf(s.p, 2)} atm`, Math.abs(s.p - 1) <= 0.05 ? t('como al nivel del mar', 'same as sea level') : t('presión baja (atmósfera de exploración)', 'low pressure (exploration atmosphere)')],
    [fr.temp < 30 ? 'ok' : fr.temp < 40 ? 'warn' : 'bad', t('Temperatura de la sala', 'Room temperature'), `${nf(fr.temp, 1)} °C`, t('sensor de la sala que arde', 'sensor in the burning room')],
    [fr.smoke < 10 ? 'ok' : fr.smoke < 50 ? 'warn' : 'bad', t('Humo en la sala', 'Smoke in the room'), `${nf(fr.smoke)} %`, t('opacidad del detector de humo', 'smoke detector obscuration')],
    [safe || masks === crew.length ? 'ok' : masks ? 'warn' : 'bad', t('Tripulación con mascarilla', 'Crew wearing masks'), t(`${masks} de ${crew.length}`, `${masks} of ${crew.length}`), masks === crew.length ? t('todos protegidos', 'everyone protected') : safe ? t('no hacen falta: no hay llama', 'not needed: no flame') : t('faltan mascarillas', 'masks missing')],
    [worst < 50 ? 'ok' : worst < SMAC_CO ? 'warn' : 'bad', t('Peor exposición a CO', 'Worst CO exposure'), `${nf(worst)} ppm`, t(`del tripulante más expuesto · pulso medio ${nf(hr)}`, `most exposed crew member · average pulse ${nf(hr)}`)],
    [nDone === p.A.length ? 'ok' : late ? 'bad' : 'warn', t('Acciones del plan', 'Plan actions'), t(`${nDone} de ${p.A.length}`, `${nDone} of ${p.A.length}`), late ? t(`${late} con retraso`, `${late} late`) : nDone === p.A.length ? t('plan completado', 'plan complete') : t('en marcha, sin retrasos', 'in progress, on time')],
    [safe ? 'ok' : tl == null ? 'ok' : tl < 120 ? 'bad' : tl < 600 ? 'warn' : 'ok', t('Aire peligroso si nadie actúa', 'Air dangerous if no one acts'), safe || tl == null ? t('No llega', 'Never') : duration(tl), t('cálculo con el ensayo Saffire VI de la NASA', "calculated with NASA's Saffire VI test")],
    [sev[0] === '3' ? 'bad' : sev[0] === '2' || sev[0] === '1' ? 'warn' : 'ok', t('Gravedad del incidente', 'Incident severity'), t(`Clase ${sev[0]}`, `Class ${sev[0]}`), sev[1].toLowerCase()],
    [p.H.delay > 60 ? 'bad' : p.H.delay > 2 ? 'warn' : 'ok', t('Retraso de radio con la Tierra', 'Radio delay to Earth'), p.H.delay > 60 ? '3–22 min' : p.H.delay ? `${nf(p.H.delay, 1)} s` : t('Directo', 'Live'), p.H.delay > 60 ? t('la tripulación decide sola', 'the crew decides alone') : p.H.ground],
  ];
  const nBad = K.filter((k) => k[0] === 'bad').length, nWarn = K.filter((k) => k[0] === 'warn').length;
  const rooms = p.G.rooms.map((rm, i) => [roomName(rm.n).split(' (')[0], W.sensors[i]?.co || 0, i === p.cfg.room]);
  const cmax = Math.max(SMAC_CO * 1.2, ...rooms.map((x) => x[1]));
  return `<section class="f-dash-wrap">
    <div class="f-dash-h"><h2>${t('📊 Dashboard del incidente', '📊 Incident dashboard')}</h2><span>${t('Situación en', 'Status at')} <b>${clock(W.t)}</b> · ${esc(p.H.name)} · ${esc(p.rn)}</span>
      <span class="f-dash-sum"><i class="bad">${nBad} ${t('en rojo', 'red')}</i><i class="warn">${nWarn} ${t('en ámbar', 'amber')}</i><i class="ok">${K.length - nBad - nWarn} ${t('en verde', 'green')}</i></span></div>
    <div class="f-dash">${K.map(([st, label, v, sub]) => `<div class="f-kpi ${st}"><small>${label}</small><b>${v}</b><span>${sub}</span></div>`).join('')}</div>
    <div class="f-dash2"><div class="f-box"><h3>${t('☁️ Gas tóxico (CO) en la sala que arde', '☁️ Toxic gas (CO) in the burning room')}</h3>${coChart()}</div>
      <div class="f-box"><h3>${t('🗺️ Gas tóxico (CO) en cada sala', '🗺️ Toxic gas (CO) in each room')}</h3><div class="f-bars">${rooms.map(([n, co, fire]) => `<div class="${co >= SMAC_CO ? 'bad' : co >= 50 ? 'warn' : 'ok'}"><span>${fire ? '🔥 ' : ''}${esc(n)}</span><i style="width:${Math.min(100, co / cmax * 100).toFixed(1)}%"></i><b>${nf(co)} ppm</b></div>`).join('')}</div></div></div>
  </section>`;
}
