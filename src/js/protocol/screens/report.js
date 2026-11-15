// ─────────────────────────────────────────────────────────────────────────────
// report.js - Screen 4: the incident report, in three tabs
//
//   Report           incident dashboard, then the four points of the challenge for THIS scenario:
//                      1 the NASA PSI experiments behind the plan, ranked by relevance to this mission (0–100)
//                      2 what the data and our model say (does it burn, how much time, spread rate, extrapolation)
//                      3 design recommendations for this habitat     4 what helps on Earth
//                    plus the incident log and the team
//   Fire Twin        the v1 Panel's Fire Twin, embedded (panel.html?embed=twin) with this scenario loaded
//   Model and data   the v1 Panel's predictive model with the data block below it (?embed=model)
// The embedded tabs load only the first time they are opened.
// ─────────────────────────────────────────────────────────────────────────────
import { MAT, ML, pBurn } from '../../fire-twin/index.js';
import { PSI } from '../../data/psi.js';
import { CURATION } from '../../data/experiments.js';
import { CURATION_EN } from '../../data/experiments-en.js';
import { t, LANG } from '../i18n.js';
import { esc, nf, duration, clock } from '../format.js';
import { MATERIALS, materialName } from '../scenarios.js';
import { S, PSI_URL } from '../sources.js';
import { app, world as W } from '../state.js';
import { homeLogo, langButtons, teamStrip } from './common.js';
import { dashboard } from './dashboard.js';

const seenTabs = new Set();
const panelPage = () => t('panel-es.html', 'panel.html');

const reportTabs = () => `<nav class="f-rtabs">${[['report', t('📄 Informe', '📄 Report')], ['twin', '🔥 Fire Twin'], ['model', t('🧠 Modelo y datos', '🧠 Model and data')]].map(([k, n]) => `<button class="${app.reportTab === k ? 'on' : ''}" data-rtab="${k}" aria-pressed="${app.reportTab === k}">${n}</button>`).join('')}</nav>`;

function embeddedTab(k, p) {
  if (app.reportTab === k) seenTabs.add(k);
  if (!seenTabs.has(k)) return '';
  const sc = encodeURIComponent(JSON.stringify({ preset: p.cfg.hab, mat: p.mat }));
  return `<div class="f-rpane" ${app.reportTab === k ? '' : 'hidden'}><iframe class="f-embed" id="f-embed-${k}" title="${k === 'twin' ? 'Fire Twin' : t('Modelo y datos', 'Model and data')}" src="${panelPage()}?embed=${k}&sc=${sc}"></iframe></div>`;
}

/** The PSI investigations most relevant to this scenario: challenge weight + safety pillars + whether this atmosphere was tested. */
function rankExperiments(s) {
  return PSI.filter((x) => CURATION[x.id]).map((x) => {
    const c = CURATION[x.id], pil = c.pillars || {};
    const cov = x.points.some(([o, a]) => Math.abs(o - s.o2) <= 4 && Math.abs(a - s.p) <= 0.12) ? 2 : x.points.some(([o]) => Math.abs(o - s.o2) <= 4) ? 1 : 0;
    // c.state is the fuel state as written in experiments.js (Spanish data value): solid fuels count more here
    const score = (c.base || 3) * 4 + Math.round((Math.max(pil.prev || 0, pil.det || 0, pil.sup || 0) + (pil.mod || 0) / 2) / 4.5 * 40) + cov * 10 + (c.state === 'sólido' ? 8 : 0);
    return { x, c, score: Math.min(100, score), cov };
  }).sort((a, b) => b.score - a.score).slice(0, 6);
}

export function report() {
  const p = W.plan, s = p.s, r = p.r, tl = r.t425.none[0];
  const rank = rankExperiments(s);
  const acrylic = p.mat === 'pmma_s' || p.mat === 'pmma_r';
  const prob = acrylic && s.g === 0 ? Math.round(pBurn(s.o2, p.mat === 'pmma_s') * 100) : null; // BASS-II logistic model
  const design = [
    tl != null && tl < 300 ? ['😷', t('Mascarillas al alcance de cada puesto', 'Masks within reach of every station'), t(`En ${p.H.name} el CO llega al límite en ${duration(tl)}: la mascarilla debe ponerse con el primer aviso, sin ir a buscarla.`, `In ${p.H.name} CO reaches the limit in ${duration(tl)}: masks must go on at the first alarm, without having to fetch them.`), S.urban]
      : ['😷', t('Mascarillas en cada módulo', 'Masks in every module'), t('El CO es lo que más rápido se vuelve peligroso, incluso con el fuego apagado.', 'CO is what becomes dangerous fastest, even after the fire is out.'), S.urban],
    s.g === 0 ? ['🌀', t('Detectores donde lleva el aire', 'Detectors where the air flows'), t(`En 0 g el humo no sube: los detectores van corriente abajo de la ventilación. Con sensor sensible de CO el aviso llega a ${duration(r.tDet)}.`, `In 0 g smoke does not rise: detectors go downstream of the ventilation. With a sensitive CO sensor the alarm comes at ${duration(r.tDet)}.`), S.same]
      : ['⬆️', t('Detectores en alto', 'Detectors up high'), t('Con gravedad el humo sube: aquí sí sirven en el techo, pero más lento que en la Tierra.', 'With gravity smoke rises: ceiling detectors work here, but more slowly than on Earth.'), S.zayac],
    s.o2 > 23 ? ['🧪', t(`Ensayar materiales con ${nf(s.o2, 1)} % de O₂`, `Test materials at ${nf(s.o2, 1)} % O₂`), t(`Casi no hay ensayos por encima de 23 % de O₂${s.g > 0 && s.g < 1 ? ' ni en gravedad parcial (es lo que medirán LUCI y FM2)' : ''}: los materiales de este hábitat deben ensayarse en su atmósfera.`, `There are almost no tests above 23 % O₂${s.g > 0 && s.g < 1 ? ' or in partial gravity (this is what LUCI and FM2 will measure)' : ''}: the materials in this habitat must be tested in its atmosphere.`), S.bre]
      : ['🧪', t('Materiales ensayados en microgravedad', 'Materials tested in microgravity'), t('El ensayo estándar (NASA-STD-6001) se hace con gravedad y puede no ser conservador: BASS-II vio varillas ardiendo con 13,6 % de O₂.', 'The standard test (NASA-STD-6001) is done under gravity and may not be conservative: BASS-II saw rods burning at 13.6 % O₂.'), S.bass],
    r.ventWorks ? ['🔌', t('Corte de ventilación en un toque', 'One-touch ventilation shutoff'), t('En 0 g y por debajo de 30 % de O₂, cortar el aire ahoga la llama: el corte debe estar a mano en cada módulo.', 'In 0 g and below 30 % O₂, cutting the airflow smothers the flame: the shutoff must be within reach in every module.'), S.bass]
      : ['🧯', t('Extintor primero', 'Extinguisher first'), t(`Aquí cortar el aire no basta (${s.o2 >= 30 ? 'mucho O₂, como en BRE' : 'hay gravedad'}): extintores de CO₂ en cada módulo.`, `Here cutting the airflow is not enough (${s.o2 >= 30 ? 'high O₂, as in BRE' : 'there is gravity'}): CO₂ extinguishers in every module.`), S.bre],
  ];
  const earth = s.o2 >= 26 ? [['🏥', t('Hospitales y cámaras hiperbáricas', 'Hospitals and hyperbaric chambers'), t('Salas con oxígeno enriquecido: los mismos límites de oxígeno que estudia la NASA.', 'Oxygen-enriched rooms: the same oxygen limits NASA studies.')]] : [];
  earth.push(['💨', t('Detectores de humo más listos', 'Smarter smoke detectors'), t('Lo aprendido del humo en microgravedad (SAME, DAFT) sirve para detectores que distinguen humo de polvo.', 'What was learned about smoke in microgravity (SAME, DAFT) helps build detectors that tell smoke from dust.')],
    ['💧', t('Extintores de niebla de agua', 'Water-mist extinguishers'), t('Estudiados para naves, hoy protegen barcos, trenes y salas de ordenadores.', 'Studied for spacecraft, they now protect ships, trains and server rooms.')],
    ['🚒', t('Bomberos en espacios cerrados', 'Firefighting in enclosed spaces'), t('Cómo crece un fuego en un recinto sellado (Saffire) ayuda en submarinos, minas y túneles.', 'How a fire grows in a sealed space (Saffire) helps in submarines, mines and tunnels.')]);
  const finding = (x, c) => (LANG === 'en' && CURATION_EN[x.id]?.find) || c.find || '';
  const matLower = MATERIALS[p.mat].name.toLowerCase();
  const kind = MAT[p.mat].kind;
  const coverage = LANG === 'en' ? ['no tests like this', 'partial coverage', 'tested like this'] : ['sin ensayos así', 'cobertura parcial', 'ensayado así'];
  return `<main class="f-rep" style="--hab:${p.H.col}">
    <header class="f-bar">${homeLogo()}<span class="f-hab"><i style="background-image:url(${p.H.img})"></i><b>${t('Informe', 'Report')}</b> · ${esc(p.H.name)} · ${esc(p.rn)} · ${esc(materialName(p.cfg))}</span>
      <span class="f-tools"><button data-act="back">${t('← Volver al mando', '← Back to command')}</button><button data-act="new-fire">${t('Nuevo fuego', 'New fire')}</button>${langButtons()}</span></header>
    ${reportTabs()}
    <div class="f-rpane" ${app.reportTab === 'report' ? '' : 'hidden'}>
    ${dashboard(p)}
    <section class="f-rep-hero"><div><h1>${p.vd.st === 'safe' ? t('No debería arder', 'Should not burn') : t('Arde', 'It burns')}${p.vd.ex ? t(' <small>⚠️ estimado</small>', ' <small>⚠️ estimate</small>') : ''}</h1>
      <p>${nf(s.o2, 1)} % O₂ · ${nf(s.p, 2)} atm · ${nf(s.g, 2)} g · ${s.V} m³ · ${t(`${Object.keys(W.status).length}/${p.A.length} acciones hechas en ${clock(W.t)}`, `${Object.keys(W.status).length}/${p.A.length} actions done in ${clock(W.t)}`)}</p></div>
      <div class="f-kpis"><span><b>${duration(r.tDet)}</b>${t('primer aviso', 'first alarm')}</span><span><b>${duration(tl)}</b>${t('CO al límite sin actuar', 'CO at limit if no one acts')}</span><span><b>${duration(p.total)}</b>${t('plan completo', 'full plan')}</span></div></section>
    <div class="f-rep-grid">
      <section class="f-box"><h2><span class="f-goal">1</span> ${t('Los experimentos de la NASA que han decidido este plan', 'The NASA experiments behind this plan')}</h2><p class="dim small">${t('Clasificados por relevancia para esta misión (0–100: calidad del dato, pilar y si se ensayó esta atmósfera).', 'Ranked by relevance to this mission (0–100: data quality, pillar and whether this atmosphere was tested).')}</p>
        <ol class="f-inv">${rank.map(({ x, c, score, cov }) => `<li><a href="${PSI_URL(x.id)}" target="_blank" rel="noopener"><b>${esc(x.acr || x.title.slice(0, 40))}</b> <span class="dim">${x.id}</span></a><span class="f-score"><i style="--w:${score}%"></i>${score}</span><br><span class="small">${esc(finding(x, c))}</span> <span class="small ${cov === 2 ? 'ok' : cov ? 'warn' : 'bad'}">${coverage[cov]}</span></li>`).join('')}</ol></section>
      <section class="f-box"><h2><span class="f-goal">2</span> ${t('Lo que dicen los datos y nuestro modelo', 'What the data and our model say')}</h2><ul>
        ${t(`<li><b>¿Arde?</b> ${p.vd.st === 'safe' ? 'No debería' : 'Sí'}: ${p.cfg.mat === 'mix' ? `arden varias cosas; el cálculo usa la más peligrosa aquí, <b>${matLower}</b>, con un fuego grande (41 × 100 cm). ` : ''}${kind === 'limit' ? `su llama se apaga por debajo de ~${nf(p.vd.hi, 1)} % de O₂ en 0 g (${S.bass}, ${ML.n} observaciones, ±${nf(ML.mae, 1)} puntos)` : kind === 'burns' ? `ardió en ${S.saffire2} con ${nf(p.vd.lo, 1)}–${nf(p.vd.hi, 1)} % de O₂` : `no prendió en ${S.saffire2} hasta ${nf(p.vd.hi, 1)} % de O₂`}.${prob != null ? ` Probabilidad según el modelo: <b>${prob} %</b>.` : ''}</li>
        <li><b>¿Cuánto tiempo?</b> Primer aviso a ${duration(r.tDet)}; CO al límite de 1 hora en ${duration(tl)} (peor) – ${duration(r.t425.none[1])} (mejor) sin actuar; con el plan, ${duration(r.t425.plan[0])}. Calibrado con ${S.urban}.</li>
        <li><b>Velocidad:</b> la llama avanza ${nf(r.v[0], 1)}–${nf(r.v[1], 1)} mm/s (Saffire-II, corregida con ${S.flex} para este O₂ y presión).</li>
        ${p.vd.ex ? `<li>⚠️ <b>Extrapolado.</b> Falta un ensayo de ${matLower} con ${nf(s.o2, 1)} % de O₂ a ${nf(s.p, 2)} atm${s.g > 0 && s.g < 1 ? ` y ${nf(s.g, 2)} g` : ''}. Rellenamos el hueco con las 4 reglas: acotar entre lo medido, ante la duda lo más peligroso, física y literatura NASA, y decirlo.</li>` : '<li>✅ Dentro de lo ensayado por la NASA.</li>'}
        <li><button class="f-linkbtn" data-rtab="model">Ver el modelo predictivo (ensemble XGBoost + CatBoost, R² 0,70) y los datos para modelos →</button></li>`,
        `<li><b>Does it burn?</b> ${p.vd.st === 'safe' ? 'It should not' : 'Yes'}: ${p.cfg.mat === 'mix' ? `several things are burning; the calculation uses the most dangerous one here, <b>${matLower}</b>, with a large fire (41 × 100 cm). ` : ''}${kind === 'limit' ? `its flame goes out below ~${nf(p.vd.hi, 1)} % O₂ in 0 g (${S.bass}, ${ML.n} observations, ±${nf(ML.mae, 1)} points)` : kind === 'burns' ? `it burned in ${S.saffire2} at ${nf(p.vd.lo, 1)}–${nf(p.vd.hi, 1)} % O₂` : `it did not ignite in ${S.saffire2} up to ${nf(p.vd.hi, 1)} % O₂`}.${prob != null ? ` Probability according to the model: <b>${prob} %</b>.` : ''}</li>
        <li><b>How much time?</b> First alarm at ${duration(r.tDet)}; CO reaches the 1-hour limit in ${duration(tl)} (worst) – ${duration(r.t425.none[1])} (best) if no one acts; with the plan, ${duration(r.t425.plan[0])}. Calibrated with ${S.urban}.</li>
        <li><b>Speed:</b> the flame spreads at ${nf(r.v[0], 1)}–${nf(r.v[1], 1)} mm/s (Saffire-II, corrected with ${S.flex} for this O₂ and pressure).</li>
        ${p.vd.ex ? `<li>⚠️ <b>Extrapolated.</b> There is no test of ${matLower} at ${nf(s.o2, 1)} % O₂ and ${nf(s.p, 2)} atm${s.g > 0 && s.g < 1 ? ` and ${nf(s.g, 2)} g` : ''}. We fill the gap with our 4 rules: stay between what was measured, when in doubt assume the most dangerous case, use physics and NASA literature, and say so.</li>` : '<li>✅ Within what NASA has tested.</li>'}
        <li><button class="f-linkbtn" data-rtab="model">See the predictive model (XGBoost + CatBoost ensemble, R² 0.70) and the data for models →</button></li>`)}</ul></section>
      <section class="f-box"><h2><span class="f-goal">3</span> ${t('Recomendaciones de diseño para', 'Design recommendations for')} ${esc(p.H.name)}</h2><div class="f-des">${design.map(([icon, title, text, src]) => `<div><span>${icon}</span><b>${title}</b><p>${text}</p><small>${t('Fuente', 'Source')}: ${src}</small></div>`).join('')}</div></section>
      <section class="f-box"><h2><span class="f-goal">4</span> ${t('Lo que sirve en la Tierra', 'What helps on Earth')}</h2><div class="f-des">${earth.slice(0, 4).map(([icon, title, text]) => `<div><span>${icon}</span><b>${title}</b><p>${text}</p></div>`).join('')}</div></section>
    </div>
    <section class="f-box"><h3>${t('📜 Registro del incidente', '📜 Incident log')}</h3><div class="f-log">${W.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div></section>
    ${teamStrip(t('Informe preparado con Astale · el equipo', 'Report prepared with Astale · the team'))}
    </div>
    ${embeddedTab('twin', p)}${embeddedTab('model', p)}
  </main>`;
}
