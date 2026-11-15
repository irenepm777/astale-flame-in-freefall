// ─────────────────────────────────────────────────────────────────────────────
// ui.js - La pantalla del Fire Twin: mountFireTwin(root, LANG, linkify)
//
// Dibuja el formulario, la escena animada y las tarjetas de resultados dentro de `root`,
// y se vuelve a calcular y repintar cada vez que cambias algo del escenario.
//   root    = el elemento HTML donde se monta
//   LANG    = 'es' o 'en'
//   linkify = función opcional que convierte nombres de experimentos en enlaces
// El cálculo NO está aquí: viene de engine.js (simulate). Aquí solo se muestra.
// ─────────────────────────────────────────────────────────────────────────────
import { createScene } from './scene.js';
import { startTour } from '../core/tour.js';
import { PSI } from '../data/psi.js';
import { SRC } from './sources.js';
import { BASS2, ML, pBurn, SPREAD, SMAC_CO, MAT, SIZE, PRESETS } from './data.js';
import { T } from './texts.js';
import { ASSUME, simulate } from './engine.js';
import { tarjetaSuperIntelligence } from './super-intelligence.js';
import { pasosTutorial } from './tutorial.js';
import { controlTierraHTML, pantallaControlTierra } from './ground-control.js';

const lc = (x) => x.charAt(0).toLowerCase() + x.slice(1); // minúscula solo la primera letra (respeta SIBAL, PMMA)
export function mountFireTwin(root, LANG, linkify) {
  if (!root) return;
  const L = T[LANG], EN = LANG === 'en';

  // ═══ GUÍA PARA LEER ESTE ARCHIVO ═══════════════════════════════════════════════════════════════════
  // NOMBRES CORTOS que se repiten por todo el archivo:
  //   s    = el escenario actual (nave, material, oxígeno, presión…). Lo cambia el formulario.
  //   L    = los textos fijos en el idioma elegido (viene de texts.js)
  //   EN   = true si el idioma es inglés (para elegir entre el texto en español y el inglés)
  //   r    = el resultado de simulate(s): veredicto, curvas de CO, tiempos de detección y de apagado
  //   vd   = el veredicto de r (arde / en el límite / sin ensayos / no debería arder)
  //   M    = el material elegido (MAT[s.mat])      P = la nave y fase elegidas (PRESETS[s.preset])
  //   nf() = formatear un número · mm() = formatear segundos como "45 s" o "2,5 min" · src() = enlace a una fuente
  //
  // QUÉ HAY, EN ORDEN:
  //   · Montaje de la pantalla (HTML del formulario y los huecos para las tarjetas)  ← aquí abajo
  //   · Tutorial guiado y control en tierra (los dibujos están en tutorial.js y ground-control.js)
  //   · showMoment()   lo que dicen el control en tierra y la tripulación en cada momento de la escena
  //   · Botones: «Ver la historia», imprimir la tarjeta, guardar, formulario (setForm)
  //   · missingTest()  qué ensayo de la NASA haría falta cuando el resultado es extrapolado
  //   · rankingCard()  ranking de materiales en esta atmósfera
  //   · render()       EL CORAZÓN: calcula simulate(s) y rellena las 7 tarjetas (¿arde?, ¿cuánto tiempo?,
  //                    ¿qué hacer?, otras naves, libro de cuentas, validación y Super-Intelligence)
  //   · actionCard()   la tarjeta «¿Qué hacer?»: quién hace qué (comandante, tripulante 2, control en tierra)
  //   · ledger()       el «libro de cuentas»: de dónde sale cada número (medido, literatura NASA o supuesto nuestro)
  //   · mlBox(), bassChart(), chart()   la caja del modelo, el gráfico de BASS-II y la gráfica de CO
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  const siCard = () => tarjetaSuperIntelligence(EN, ML);
  const s = { preset: 'iss', mat: 'sibal', size: 'saffire', delay: 60, cpm: false, ...PRESETS.iss };
  const esc = (x) => String(x).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
  const nf = (x, d = 0) => Number(x).toLocaleString(LANG, { maximumFractionDigits: d, minimumFractionDigits: d });
  const mm = (sec) => sec == null ? L.never : sec < 90 ? `${nf(sec)} ${L.s}` : `${nf(sec / 60, 1)} ${L.min}`;
  const rng = (a, b, f = mm) => (a == null && b == null) ? L.never : (a == null || b == null) ? `${f(a ?? b)} ${L.worstOnly}` : a === b ? f(a) : `${f(Math.min(a, b))} – ${f(Math.max(a, b))}`;
  const src = (...ks) => ks.map((k) => `<a class="ft-src" href="${SRC[k].u}">${esc(SRC[k].t)}</a>`).join(' · ');

  root.innerHTML = `
  <div class="ft">
    <form class="ft-controls" autocomplete="off">
      <h3>${L.scenario}</h3>
      <label>${L.preset}<select name="preset">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v[LANG]}</option>`).join('')}</select></label>
      <label>${L.material}<select name="mat">${Object.entries(MAT).map(([k, v]) => `<option value="${k}">${v[LANG]}</option>`).join('')}</select></label>
      <label>${L.size}<select name="size">${Object.entries(SIZE).map(([k, v]) => `<option value="${k}"${k === 'saffire' ? ' selected' : ''}>${v[LANG]}</option>`).join('')}</select></label>
      <label>${L.g}<select name="g">${Object.entries(L.gNames).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>${L.o2} <output name="o2o"></output><input type="range" name="o2" min="14" max="40" step="0.5"></label>
      <label>${L.p} <output name="po"></output><input type="range" name="p" min="0.3" max="1.05" step="0.01"></label>
      <label>${L.u} <output name="uo"></output><input type="range" name="u" min="0" max="30" step="1"></label>
      <label>${L.V} <output name="Vo"></output><input type="range" name="V" min="5" max="400" step="1"></label>
      <label>${L.delay} <output name="delayo"></output><input type="range" name="delay" min="10" max="300" step="10"></label>
      <label class="ft-check"><input type="checkbox" name="cpm"> ${L.sens}</label>
    </form>
    <div class="ft-out">
      <section class="ft-card ft-scene-card"><div class="ft-story-bar"><button type="button" class="ft-story">🎬 ${EN ? 'Watch the story' : 'Ver la historia'}</button><button type="button" class="ft-tour-btn">❓ ${EN ? 'Tutorial' : 'Tutorial'}</button><button type="button" class="ft-tour-btn ft-save">💾 ${EN ? 'Save' : 'Guardar'}</button><span class="small dim">${EN ? 'Orion before a spacewalk: a fabric catches fire. Captions included, ready to record the video.' : 'Orion antes de un paseo espacial: prende una tela. Con subtítulos, lista para grabar el vídeo.'}</span></div><div class="ft-scene-grid"><div class="ft-scene"></div><aside class="ft-crew"></aside></div></section>
      <section class="ft-card ft-rank" id="ft-rank"></section>
      <section class="ft-card ft-plan-card" id="ft-q3"></section>
      <div class="ft-res">
        <section class="ft-card" id="ft-q2"></section>
        <section class="ft-card" id="ft-q1"></section>
      </div>
    </div>
  </div>
  <div class="ft-wide">
    <section class="ft-card" id="ft-q4"></section>
    <section class="ft-card" id="ft-q5"></section>
    <section class="ft-card" id="ft-q6"></section>
    <section class="ft-card ft-si" id="ft-q7">${siCard()}</section>
  </div>`;
  const scene = createScene(root.querySelector('.ft-scene'), LANG);

  const TOUR = pasosTutorial(root, EN);
  const TOUR_KEY = 'astale-tour-firetwin';
  const runTour = () => startTour(TOUR, { lang: LANG, onEnd: () => { try { localStorage.setItem(TOUR_KEY, '1'); } catch {} } });
  root.querySelector('.ft-tour-btn').addEventListener('click', runTour);
  document.addEventListener('pn-tab', (e) => { if (e.detail !== 'pn-twin') document.querySelector('.tour .tour-skip')?.click(); }); // si se cambia de pestaña, se cierra
  let seen = false; try { seen = localStorage.getItem(TOUR_KEY) === '1'; } catch {}
  // El tutorial sale la primera vez que el Fire Twin está de verdad a la vista (al abrir su pestaña o al llegar con el scroll)
  const ctl = root.querySelector('.ft-controls');
  const tryTour = () => setTimeout(() => {
    const r = ctl.getBoundingClientRect();
    if (!seen && ctl.offsetParent && r.top < innerHeight && r.bottom > 0) { seen = true; runTour(); }
  }, 600);
  if (!seen) {
    document.addEventListener('pn-tab', (e) => { if (e.detail === 'pn-twin') tryTour(); });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) tryTour(); }, { threshold: 0.1 }).observe(ctl);
    tryTour();
  }
  /* ---------- Las tres personas: cada una ve su orden del momento; registro de comunicaciones */
  let lastPlan = null, crewIdx = -9;
  // A la derecha de la escena: el control en tierra dibujado, con un bocadillo de lo que dice en cada momento
  // (lo de la tripulación ya va en los bocadillos de la propia nave)
  const crewEl = root.querySelector('.ft-crew');
  const rolesT = EN ? ['Commander', 'Crew member 2', 'Ground control'] : ['Comandante', 'Tripulante 2', 'Control en tierra'];
  crewEl.innerHTML = controlTierraHTML(EN, rolesT);

  // Lo que ve el control en tierra en su pantalla grande: ver ground-control.js
  const gcScreen = (key) => pantallaControlTierra(key, EN);
  const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const short = (h, n = 95) => { const t = strip(h); const cut = t.split(/(?<=[.:])\s/)[0]; return (cut.length <= n ? cut : t.slice(0, n - 1) + '…').replace(/:$/, '.'); };
  let sceneT = 0, talkTimer = 0;
  scene.onMode = () => { crewIdx = -9; if (lastPlan) { let idx = 0; lastPlan.rows.forEach((row, i) => { if (row.t <= sceneT) idx = i; }); crewIdx = idx; showMoment(idx); } };
  function resetCrew() { crewIdx = -9; }
  function showMoment(idx) {
    if (!lastPlan) return;
    const row = lastPlan.rows[idx];
    const [cdr, ms, gr] = row.cells;
    crewEl.querySelector('.ft-when').textContent = `${row.label} · ${row.sub}`;
    const gc0 = crewEl.querySelector('.ft-gc');
    if (scene.mode === 'none') { // «Sin hacer nada»: nadie da órdenes
      gc0.classList.add('noplan'); gc0.classList.remove('talk'); scene.orders = null;
      crewEl.querySelector('.ft-gc-say').innerHTML = EN ? 'No plan: nobody gives orders. The fire keeps going and CO keeps rising.' : 'Sin plan: nadie da órdenes. El fuego sigue y el CO sube.';
      return;
    }
    gc0.classList.remove('noplan');
    if (row.k === 'prev') { // antes del aviso: nadie sabe aún que hay fuego, no hay conversación
      gc0.classList.add('quiet'); gc0.classList.remove('talk'); scene.orders = null;
      crewEl.querySelector('.ft-gc-say').innerHTML = EN ? 'All quiet: no alarm yet. Nobody knows there is a fire.' : 'Todo tranquilo: aún no ha saltado ninguna alarma. Nadie sabe que hay fuego.';
      return;
    }
    gc0.classList.remove('quiet');
    if (row.call) { // primero, el aviso; a los 4 s, la orden de ese momento
      crewEl.querySelector('.ft-gc-say').innerHTML = `<b>«${row.call[2]}»</b>`;
      scene.orders = { cdr: row.call[0], ms: row.call[1], ground: row.call[2], at: performance.now() };
      const gc = crewEl.querySelector('.ft-gc'); gc.classList.remove('talk'); void gc.offsetWidth; gc.classList.add('talk');
      clearTimeout(talkTimer); talkTimer = setTimeout(() => { if (crewIdx !== idx) return; crewEl.querySelector('.ft-gc-say').innerHTML = gr.t;
        scene.orders = { cdr: short(cdr.t, 70), ms: short(ms.t, 70), ground: short(gr.t, 70), at: performance.now() }; gc.classList.remove('talk'); void gc.offsetWidth; gc.classList.add('talk'); }, 4000);
      return;
    }
    crewEl.querySelector('.ft-gc-say').innerHTML = gr.t;
    const gc = crewEl.querySelector('.ft-gc');
    gc.classList.remove('talk'); void gc.offsetWidth; gc.classList.add('talk');
    clearTimeout(talkTimer); talkTimer = setTimeout(() => gc.classList.remove('talk'), 3500);
    scene.orders = { cdr: short(cdr.t, 70), ms: short(ms.t, 70), ground: short(gr.t, 70), at: performance.now() };
  }

  // La escena avisa del tiempo: se ilumina la fila de la tarjeta de acción que toca
  let planNow = -2;
  scene.onTime = (t) => {
    sceneT = t;
    if (lastPlan) { let idx = 0; lastPlan.rows.forEach((row, i) => { if (row.t <= t) idx = i; }); if (idx !== crewIdx) { crewIdx = idx; showMoment(idx); } }
    const rows = [...root.querySelectorAll('.ft-pr')];
    let cur = null; for (const r of rows) if (+r.dataset.t <= t) cur = r;
    const key = cur ? cur.dataset.t : -2;
    if (key === planNow) return; planNow = key;
    rows.forEach((r) => r.classList.toggle('now', r === cur));
  };
  // Modo historia: carga el caso de Orion antes de un paseo y lo reproduce con subtítulos
  root.addEventListener('click', (e) => {
    if (e.target.closest('.ft-save')) { window.__astaleAccount?.save(); return; }
    if (!e.target.closest('.ft-story')) return;
    document.dispatchEvent(new CustomEvent('astale:event', { detail: { type: 'story' } }));
    Object.assign(s, PRESETS.orion_eva, { preset: 'orion_eva', mat: 'sibal', size: 'saffire', delay: 60, cpm: false });
    setForm(); render();
    const r = simulate(s), mmS = (x) => (x < 90 ? `${Math.round(x)} s` : `${nf(x / 60, 1)} min`);
    const st = EN ? [
      [0, 'Orion prepares for a spacewalk: the cabin goes to 26.5 % oxygen.'],
      [3, 'A cotton–fiberglass fabric catches fire. In microgravity the flame is blue and hard to see.'],
      [r.tDet, `The alarm goes off at ${mmS(r.tDet)}. Commander: "Fire!". Crew member: masks on.`],
      [r.tDet + 8, `In a 9 m³ capsule, CO could reach the 1-hour limit in ${mmS(r.t425.none[0])} if nothing is done.`],
      [r.tAct, 'Ventilation and power off. Without airflow the flame starves. CO₂ extinguisher ready.'],
      [r.tOut, (r.peak.plan[1] > 425 ? 'Fire out, but in 9 m³ the CO still went over the limit: that is why masks come with the very first alarm.' : 'Fire out before the CO reached the limit.') + ' Each person knew what to do, with NASA data behind every step.'],
      [r.tOut + 30, 'Astale · Fire Twin — BASS-II, FLEX, Saffire and BRE data from NASA PSI.'],
    ] : [
      [0, 'Orion se prepara para un paseo espacial: la cabina sube al 26,5 % de oxígeno.'],
      [3, 'Prende una tela de algodón y fibra de vidrio. En microgravedad la llama es azul y casi no se ve.'],
      [r.tDet, `Salta la alarma a los ${mmS(r.tDet)}. Comandante: «¡Fuego!». Tripulante: mascarillas.`],
      [r.tDet + 8, `En una cápsula de 9 m³, el CO podría llegar al límite de 1 hora en ${mmS(r.t425.none[0])} si nadie hace nada.`],
      [r.tAct, 'Ventilación y corriente cortadas. Sin aire, la llama se ahoga. Extintor de CO₂ preparado.'],
      [r.tOut, (r.peak.plan[1] > 425 ? 'Fuego apagado, pero en 9 m³ el CO ya pasó del límite: por eso la mascarilla va con el primer aviso.' : 'Fuego apagado antes de que el CO llegara al límite.') + ' Cada persona supo qué hacer, con datos de la NASA detrás de cada paso.'],
      [r.tOut + 30, 'Astale · Fire Twin — datos de BASS-II, FLEX, Saffire y BRE (NASA PSI).'],
    ];
    scene.story = st.filter(([t]) => t != null).map(([t, text]) => ({ t, text }));
    sceneT = 0; resetCrew();
    root.querySelector('.ft-scene-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    scene.play();
  });
  // Imprimir la tarjeta en una hoja
  root.addEventListener('click', (e) => {
    if (!e.target.closest('.ft-print')) return;
    const card = root.querySelector('#ft-q3').cloneNode(true);
    card.querySelector('.ft-print')?.remove();
    const w = open('', '_blank');
    w.document.write(`<!doctype html><html lang="${LANG}"><meta charset="utf-8"><title>Astale · Fire Twin</title><style>
      body{font:13px/1.45 system-ui,sans-serif;margin:18px;color:#111} h3{margin:0 0 4px} .ft-plan-title{font-weight:700;font-size:15px;margin:2px 0 10px}
      .ft-plan{display:grid;grid-template-columns:110px repeat(3,1fr);border:1px solid #999} .ft-ph,.ft-pr{display:contents}
      .ft-ph span{font-weight:700;background:#eee;padding:6px;border-bottom:1px solid #999} .ft-pr span{padding:6px;border-bottom:1px solid #ccc;vertical-align:top}
      .ft-pt i{display:block;font-style:normal;color:#555} em{display:block;font-style:normal;font-size:11px;color:#555;margin-top:3px} a{color:#555;text-decoration:none}
      .gl{text-decoration:none} .dim{color:#555;font-style:normal}</style>${card.innerHTML}`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  });

  const form = root.querySelector('form');
  const setForm = () => {
    for (const k of ['preset', 'mat', 'size', 'o2', 'p', 'u', 'V', 'delay']) form.elements[k].value = s[k];
    form.elements.g.value = String(s.g);
    form.elements.cpm.checked = s.cpm;
  };
  form.addEventListener('input', (e) => {
    const n = e.target.name;
    scene.story = null; // al tocar el escenario se sale del modo historia
    if (n === 'preset') Object.assign(s, PRESETS[e.target.value], { preset: e.target.value });
    else if (n === 'cpm') s.cpm = e.target.checked;
    else if (n === 'mat' || n === 'size') s[n] = e.target.value;
    else s[n] = Number(e.target.value);
    if (n === 'preset') setForm();
    render();
  });

  // Cuando la respuesta es extrapolada, decir qué ensayo haría falta y cuántos hay cerca en PSI (enlaza al mapa de huecos)
  function missingTest(s, M) {
    const near = PSI.filter((p) => p.points.some(([o, a]) => Math.abs(o - s.o2) <= 2.5 && Math.abs(a - s.p) <= 0.1));
    const n = PSI.reduce((k, p) => k + p.points.filter(([o, a]) => Math.abs(o - s.o2) <= 2.5 && Math.abs(a - s.p) <= 0.1).length, 0);
    const gEs = s.g === 0 ? 'en microgravedad' : s.g < 1 ? `con ${nf(s.g, 2)} g (gravedad parcial)` : 'con gravedad', gEn = s.g === 0 ? 'in microgravity' : s.g < 1 ? `at ${nf(s.g, 2)} g (partial gravity)` : 'with gravity';
    const names = near.slice(0, 4).map((p) => p.acr || p.id).join(', ');
    return `<div class="ft-missing">🧪 <b>${EN ? 'To stop extrapolating, NASA would need this test' : 'Para dejar de extrapolar, haría falta este ensayo'}:</b>
      ${EN ? `${lc(M.en)} at ${nf(s.o2, 1)} % O₂ and ${nf(s.p, 2)} atm, ${gEn}.` : `${lc(M.es)} con ${nf(s.o2, 1)} % de O₂ y ${nf(s.p, 2)} atm, ${gEs}.`}
      ${EN ? `PSI has ${n} tested conditions nearby (±2.5 O₂ points, ±0.1 atm)${n ? ' in ' + names : ''}` : `En PSI hay ${n} condiciones ensayadas cerca (±2,5 puntos de O₂ y ±0,1 atm)${n ? ', en ' + names : ''}`}${s.g > 0 && s.g < 1 ? (EN ? '; PSI investigations are in microgravity or on the ground, none at partial gravity' : '; las investigaciones de PSI son en microgravedad o en tierra, ninguna con gravedad parcial') : ''}.
      <a href="#pn-2">${EN ? 'See the gap map →' : 'Ver el mapa de huecos →'}</a> · <a href="#pn-gaps">${EN ? 'How we fill the gaps →' : 'Cómo rellenamos los huecos →'}</a></div>`;
  }
  // Para las cuentas: leer y poner el escenario (guardar y recuperar)
  window.__astaleTwin = {
    get: () => ({ preset: s.preset, label: PRESETS[s.preset][LANG], mat: s.mat, size: s.size, o2: s.o2, p: s.p, u: s.u, g: s.g, V: s.V, delay: s.delay, cpm: s.cpm }),
    set: (o) => { if (!o || !PRESETS[o.preset]) return; const keep = ['preset', 'mat', 'size', 'o2', 'p', 'u', 'g', 'V', 'delay', 'cpm']; Object.assign(s, PRESETS[o.preset], Object.fromEntries(keep.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]))); scene.story = null; setForm(); render(); },
  };
  /* Ranking de materiales en esta atmósfera (propuesta del equipo, 14-11-2026; criterio «ranks» del reto).
     Se ordena SOLO con lo medido: si arde aquí según los ensayos (BASS-II, Saffire-II) y cuánto margen de O₂ hay sobre su límite.
     Al pulsar una fila, ese material pasa a «Qué empieza a arder». */
  function rankingCard() {
    const rows = Object.keys(MAT).map((k) => {
      const M = MAT[k], sc = { ...s, mat: k }, r = simulate(sc), vd = r.vd;
      // margen de O₂ sobre el límite medido de ese material (puntos); para los que no prendieron, hasta dónde se ensayaron
      const lim = M.kind === 'limit' ? vd.hi : M.kind === 'burns' ? vd.lo : vd.hi;
      const margin = s.o2 - lim;
      const order = { burns: 3, edge: 2, untested: 1, safe: 0 }[vd.st] * 100 + margin;
      const prob = M.kind === 'limit' && s.g === 0 ? Math.round(pBurn(s.o2, k === 'pmma_s') * 100) : null;
      return { k, M, vd, r, margin, lim, order, prob };
    }).sort((a, b) => b.order - a.order);
    const cls = { burns: 'red', edge: 'amber', untested: 'grey', safe: 'green' };
    const what = (x) => x.M.kind === 'noign'
      ? (EN ? `did not ignite up to ${nf(x.lim, 1)} %` : `no prendió hasta ${nf(x.lim, 1)} %`)
      : x.M.kind === 'burns' ? (EN ? `burned at ${nf(x.lim, 1)} % in Saffire-II` : `ardió con ${nf(x.lim, 1)} % en Saffire-II`)
      : (EN ? `goes out at ~${nf(x.lim, 1)} %` : `se apaga con ~${nf(x.lim, 1)} %`);
    const t425 = (x) => (x.vd.st === 'safe' ? '—' : x.r.t425.none[0] == null ? (EN ? 'not reached' : 'no llega') : mm(x.r.t425.none[0]));
    return `<div class="ft-rank-head"><h3>🏷️ ${EN ? 'Which material is most dangerous in this atmosphere?' : '¿Qué material es más peligroso en esta atmósfera?'}</h3>
      <span class="small dim">${nf(s.o2, 1)} % O₂ · ${nf(s.p, 2)} atm · ${nf(s.g, 2)} g · ${s.V} m³ · ${EN ? 'click a row to simulate it' : 'pulsa una fila para simularlo'}</span></div>
      <table class="ft-rank-t"><tr><th>#</th><th>${EN ? 'Material' : 'Material'}</th><th>${EN ? 'Burns here?' : '¿Arde aquí?'}</th><th>${EN ? 'O₂ vs its measured limit' : 'O₂ frente a su límite medido'}</th><th>${EN ? 'Chance (model)' : 'Probabilidad (modelo)'}</th><th>${EN ? 'CO at limit (worst)' : 'CO al límite (peor caso)'}</th><th>${EN ? 'NASA source' : 'Fuente NASA'}</th></tr>
      ${rows.map((x, i) => `<tr data-mat="${x.k}" class="${x.k === s.mat ? 'on' : ''}"><td><b>${i + 1}</b></td><td>${esc(x.M[LANG])}${x.k === s.mat ? ` <span class="ft-rank-sel">${EN ? 'selected' : 'activo'}</span>` : ''}</td>
        <td><span class="ft-dot ${cls[x.vd.st]}"></span>${L[x.vd.st]}${x.vd.ex ? ' ⚠️' : ''}</td>
        <td>${x.margin >= 0 ? '+' : ''}${nf(x.margin, 1)} ${EN ? 'pts' : 'ptos'} <span class="dim small">(${what(x)})</span></td>
        <td>${x.prob == null ? '<span class="dim">—</span>' : x.prob + ' %'}</td><td>${t425(x)}</td><td class="small">${src(...x.M.src)}</td></tr>`).join('')}</table>
      <p class="small dim">${EN ? 'Ordered by what NASA measured: first what burns here, then by oxygen margin over each material’s limit. ⚠️ = outside the tested conditions. Time to the CO limit depends on the cabin, not the material, in our model (calibrated with Saffire VI), so it is the same for everything that burns.'
        : 'Ordenado con lo que midió la NASA: primero lo que arde aquí y después por el margen de oxígeno sobre el límite de cada material. ⚠️ = fuera de lo ensayado. El tiempo hasta el CO límite depende de la cabina, no del material, en nuestro modelo (calibrado con Saffire VI): por eso es el mismo para todo lo que arde.'}</p>`;
  }
  root.addEventListener('click', (e) => {
    const tr = e.target.closest('.ft-rank-t tr[data-mat]'); if (!tr || e.target.closest('a')) return;
    s.mat = tr.dataset.mat; scene.story = null; setForm(); render();
  });
  function render() {
    const f = form.elements;
    f.o2o.value = `${nf(s.o2, 1)} %`; f.po.value = `${nf(s.p, 2)} atm (${nf(s.p * 14.7, 1)} psi)`;
    f.uo.value = s.u ? `${s.u} cm/s` : (EN ? 'off' : 'apagada'); f.Vo.value = `${s.V} m³`; f.delayo.value = mm(s.delay);
    const r = simulate(s), vd = r.vd, M = MAT[s.mat], P = PRESETS[s.preset];
    document.dispatchEvent(new CustomEvent('astale:event', { detail: { type: 'scenario', s: { preset: s.preset, name: P[LANG], mat: s.mat, size: s.size, o2: s.o2, p: s.p, u: s.u, g: s.g, V: s.V, delay: s.delay, cpm: s.cpm } } }));
    const light = { burns: 'red', edge: 'amber', untested: 'amber', safe: 'green' }[vd.st];

    /* 1 · ¿Arde? */
    let why;
    if (M.kind === 'limit') {
      why = EN
        ? `In microgravity, BASS-II flames on ${lc(M.en)} went out between <b>${nf(vd.lo, 1)} % and ${nf(vd.hi, 1)} % O₂</b> (${M.band.length} tests). Your cabin has <b>${nf(s.o2, 1)} %</b>.`
        : `En microgravedad, las llamas de BASS-II sobre ${lc(M.es)} se apagaron entre <b>${nf(vd.lo, 1)} % y ${nf(vd.hi, 1)} % de O₂</b> (${M.band.length} ensayos). Tu cabina tiene <b>${nf(s.o2, 1)} %</b>.`;
      if (s.g === 1) why = EN ? `On Earth, PMMA needs about <b>17.4 % O₂</b> (usual limiting oxygen index; not a NASA source). Your cabin has <b>${nf(s.o2, 1)} %</b>.` : `En la Tierra, el PMMA necesita en torno al <b>17,4 % de O₂</b> (índice de oxígeno límite habitual; no es fuente NASA). Tu cabina tiene <b>${nf(s.o2, 1)} %</b>.`;
    } else if (M.kind === 'burns') {
      why = EN ? `In Saffire it burned completely with ${nf(vd.lo, 1)}–${nf(vd.hi, 1)} % O₂ and air at 20 cm/s. More oxygen only makes it worse.` : `En Saffire ardió entera con ${nf(vd.lo, 1)}–${nf(vd.hi, 1)} % de O₂ y aire a 20 cm/s. Con más oxígeno, solo puede ir a peor.`;
      if (vd.st === 'untested') why = EN ? `It was only tested at ${nf(vd.lo, 1)}–${nf(vd.hi, 1)} % O₂ (where it burned). Below that there is no data.` : `Solo se ensayó con ${nf(vd.lo, 1)}–${nf(vd.hi, 1)} % de O₂ (y ardió). Por debajo no hay datos.`;
    } else {
      why = EN ? `In Saffire-II it did not ignite with ~${nf(vd.hi, 1)} % O₂ and air at 20 cm/s.` : `En Saffire-II no prendió con ~${nf(vd.hi, 1)} % de O₂ y aire a 20 cm/s.`;
      if (vd.st === 'untested') why += EN ? ` Here there is more oxygen or gravity than tested: NASA warns that materials that do not burn on Earth can burn in exploration atmospheres (${src('abney')}).` : ` Aquí hay más oxígeno o gravedad que en el ensayo: la NASA avisa de que materiales que no arden en la Tierra pueden arder en atmósferas de exploración (${src('abney')}).`;
    }
    const notes = [];
    if (s.g > 0 && s.g < 1) notes.push(EN ? `Partial gravity can be the worst case ("Goldilocks"): little flow to cool the flame, enough to feed it (${src('zayac', 'tien')}). Result extrapolated.` : `La gravedad parcial puede ser el peor caso («Ricitos de Oro»): poca corriente para enfriar la llama, suficiente para alimentarla (${src('zayac', 'tien')}). Resultado extrapolado.`);
    if (s.p < 0.95) notes.push(EN ? `BASS-II and Saffire were at ~1 atm. NASA rates materials mainly by O₂ concentration (${src('hirsch')}), so lower pressure is treated as a caveat, not a fix.` : `BASS-II y Saffire fueron a ~1 atm. La NASA clasifica los materiales sobre todo por el % de O₂ (${src('hirsch')}): la presión baja se trata como un matiz, no como una solución.`);
    root.querySelector('#ft-rank').innerHTML = rankingCard();
    root.querySelector('#ft-q1').innerHTML = `
      <h3>${L.q1}</h3>
      <div class="ft-verdict ${light}"><span class="ft-light"></span><b>${L[vd.st]}</b> <span class="dim small">· ${vd.ex ? '⚠️ ' + L.extrap : '✅ ' + L.tested}</span></div>
      <p>${why}</p>${notes.map((n) => `<p class="small dim">${n}</p>`).join('')}
      <p class="small">${src(...M.src)}</p>
      ${M.photo ? `<figure class="ft-photo"><img src="assets/img/${M.photo}" alt="${esc(M.photoCap[LANG])}" loading="lazy"><figcaption class="small dim">${esc(M.photoCap[LANG])} · NASA</figcaption></figure>` : ''}
      ${vd.ex ? missingTest(s, M) : ''}
      ${M.kind === 'limit' && s.g === 0 ? mlBox() : ''}
      ${M.kind === 'limit' ? bassChart() : ''}`;
    scene.update({ ...s, sizeLen: SIZE[s.size].len, sizeArea: SIZE[s.size].area }, r, { name: P[LANG], phase: P.phase }, timeEnd(r));
    { const g = crewEl.querySelector('.ft-gc-screen'); if (g.dataset.k !== s.preset) { g.innerHTML = gcScreen(s.preset); g.dataset.k = s.preset; } }

    /* 2 · ¿Cuánto tiempo hay? */
    const fire = vd.st !== 'safe';
    root.querySelector('#ft-q2').innerHTML = `<h3>${L.q2}</h3>` + (!fire ? `<p>${L.noFire}</p>` : `
      ${vd.st !== 'burns' ? `<p class="small dim">${L.ifBurns}</p>` : ''}
      ${chart(r)}
      <table class="tbl ft-tbl">
        <tr><th></th><th>${L.none}</th><th>${L.plan}</th></tr>
        <tr><td>${L.detect}</td><td colspan="2">${r.tDet == null ? `<b class="bad">${L.noDetect}</b>` : `<b>${mm(r.tDet)}</b> · ${L.tl.smoke}: ${r.tSmoke == null ? L.smokeNever : mm(r.tSmoke)} · ${L.tl.gas}: ${mm(r.tGas)}`}</td></tr>
        <tr><td>${L.t425}</td><td>${rng(...r.t425.none)}</td><td>${rng(...r.t425.plan)}</td></tr>
        <tr><td>${L.peak}</td><td>${nf(r.peak.none[0])} – ${nf(r.peak.none[1])} ppm</td><td>${nf(r.peak.plan[0])} – ${nf(r.peak.plan[1])} ppm</td></tr>
        <tr><td>${L.outAt}</td><td>${L.burnsOut} ${rng(...r.dur)}</td><td>${r.tOut == null ? L.never : mm(r.tOut)}</td></tr>
      </table>
      <p class="small dim">${EN ? 'Bands: slowest and fastest Saffire-II spread, and the lowest and highest CO measured in Saffire. Well-mixed air without filters (conservative).' : 'Bandas: propagación más lenta y más rápida de Saffire-II, y el CO más bajo y más alto medido en Saffire. Aire bien mezclado y sin filtros (conservador).'}</p>`);

    /* 3 · ¿Qué hacer? */
    root.querySelector('#ft-q3').innerHTML = actionCard(r);
    planNow = -2;
    resetCrew();

    /* 4 · Otras naves */
    const rows = Object.entries(PRESETS).map(([k, p]) => {
      const sc = { ...s, ...p }, rr = simulate(sc), l = { burns: 'red', edge: 'amber', untested: 'amber', safe: 'green' }[rr.vd.st];
      return `<tr${k === s.preset ? ' class="on"' : ''}><td>${p[LANG]}</td><td>${nf(p.o2, 1)} % · ${nf(p.p, 2)} atm · ${p.V} m³</td><td><span class="ft-dot ${l}"></span>${L[rr.vd.st]}${rr.vd.ex ? ' ⚠️' : ''}</td>
        <td>${rr.vd.st === 'safe' ? '—' : rng(...rr.t425.none)}</td><td>${rr.vd.st === 'safe' ? '—' : rng(...rr.t425.plan)}</td></tr>`;
    }).join('');
    root.querySelector('#ft-q4').innerHTML = `<h3>${L.q4}: ${esc(M[LANG])}</h3>
      <div class="ft-scroll"><table class="tbl ft-tbl"><tr><th>${L.vehicle}</th><th>${EN ? 'Atmosphere · volume' : 'Atmósfera · volumen'}</th><th>${L.verdict}</th><th>${L.t425} · ${L.none}</th><th>${L.plan}</th></tr>${rows}</table></div>
      <p class="small dim">${EN ? 'The same fire fills a 9 m³ capsule with CO about 40 times sooner than the ISS (388 m³).' : 'El mismo fuego llena de CO una cápsula de 9 m³ unas 40 veces antes que la ISS (388 m³).'} ${src('urban16')}</p>`;

    /* 5 · Libro de cuentas */
    const led = ledger(r);
    const nasa = led.filter((x) => x.tag !== 'sup').length;
    root.querySelector('#ft-q5').innerHTML = `<h3>${L.q5}</h3>
      <p><b>${L.share(nasa, led.length)}</b> <span class="dim small">(${Math.round((100 * nasa) / led.length)} %)</span></p>
      <ul class="ft-ledger">${led.map((x) => `<li><span class="ft-tag ${x.tag}">${L.tags[x.tag]}</span> ${x.t} ${x.s ? `<span class="small">${x.s}</span>` : ''}</li>`).join('')}</ul>`;

    /* 6 · Validación */
    root.querySelector('#ft-q6').innerHTML = `<h3>${L.q6}</h3>
      <p class="small">${EN ? 'Each fit is checked by hiding one test at a time, predicting it with the rest and measuring the error (leave-one-out).' : 'Cada ajuste se comprueba escondiendo un ensayo cada vez, prediciéndolo con el resto y midiendo el error (validación «dejando uno fuera»).'}</p>
      <table class="tbl ft-tbl">
        <tr><th>${EN ? 'Model' : 'Modelo'}</th><th>${EN ? 'Data' : 'Datos'}</th><th>${EN ? 'Mean error' : 'Error medio'}</th></tr>
        <tr><td>${EN ? 'O₂ at which PMMA plates go out' : 'O₂ al que se apagan placas de PMMA'}</td><td>BASS-II · 16</td><td>± 1,3 ${EN ? 'points' : 'puntos'} O₂</td></tr>
        <tr><td>${EN ? 'O₂ at which PMMA rods go out' : 'O₂ al que se apagan varillas de PMMA'}</td><td>BASS-II · 25</td><td>± 1,4 ${EN ? 'points' : 'puntos'} O₂</td></tr>
        <tr><td>🧠 ${EN ? 'Chance of burning (Super-Intelligence, logistic regression)' : 'Probabilidad de arder (Super-Intelligence, regresión logística)'}</td><td>BASS-II · 82</td><td>± 1,4 ${EN ? 'points' : 'puntos'} O₂</td></tr>
        <tr><td>${EN ? 'Heptane droplet burning rate (d² law)' : 'Velocidad de combustión de gotas de heptano (ley d²)'}</td><td>FLEX · 41</td><td>± 0,105 mm²/s (${EN ? 'of' : 'de'} ~0,57)</td></tr>
        <tr><td>${EN ? 'Methanol droplet burning rate' : 'Velocidad de combustión de gotas de metanol'}</td><td>FLEX · 53</td><td>± 0,038 mm²/s (${EN ? 'of' : 'de'} ~0,47)</td></tr>
      </table>
      <p class="small dim">${EN ? 'Not validated yet: CO growth and detection times in a real crewed cabin (no open data exists). NASA validated a full CFD model of Saffire (' : 'Sin validar todavía: el crecimiento del CO y los tiempos de detección en una cabina tripulada real (no hay datos abiertos). La NASA validó un modelo CFD completo de Saffire ('}${src('niehaus')}${EN ? '); ours is the fast version for decisions.' : '); el nuestro es la versión rápida para decidir.'}</p>`;
    if (linkify) linkify(root);
  }

  /* ---------- Tarjeta de acción: QUÉ hace CADA persona en CADA momento, con su fuente */
  function actionCard(r) {
    const vd = r.vd, ph = PRESETS[s.preset].phase, M = MAT[s.mat], P = PRESETS[s.preset];
    const T2 = (es, en, ...k) => { k = k.filter(Boolean); return { t: EN ? en : es, s: k.length ? src(...k) : '' }; };
    const tm = (sec) => `T+${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
    const roles = EN ? ['Commander', 'Crew member 2', 'Ground control'] : ['Comandante', 'Tripulante 2', 'Control en tierra'];
    const icons = ['🧑‍✈️', '🧑‍🚀', '📡'];
    const seated = ph === 'reentry' || ph === 'splash';
    const smallCabin = s.V < 50, t425 = r.t425.none[0];
    const rows = [];
    const placeEs = s.g === 0 ? 'la cabina, junto a la ventilación' : 'la cabina', placeEn = s.g === 0 ? 'cabin, by the air vent' : 'cabin';
    // 0 · Antes: prevenir
    rows.push({ t: -1, k: 'prev', label: EN ? 'Before' : 'Antes', sub: EN ? 'prevent' : 'prevenir', cells: [
      vd.st === 'safe' ? T2(`Con ${nf(s.o2, 1)} % de O₂ este material no debería arder: mantener el O₂ donde está.`, `At ${nf(s.o2, 1)} % O₂ this material should not burn: keep the O₂ where it is.`, ...M.src)
        : s.o2 > 21.5 ? T2(`Retirar, cubrir o sacar de la corriente de aire la ${lc(M.es)} <b>antes</b> de subir el O₂ a ${nf(s.o2, 1)} %.`, `Remove, cover or move the ${lc(M.en)} out of the airflow <b>before</b> raising O₂ to ${nf(s.o2, 1)} %.`, 'abney', 'mcallister')
        : T2(`Saber dónde hay ${lc(M.es)}: con este O₂ puede arder.`, `Know where the ${lc(M.en)} is: at this O₂ it can burn.`, ...M.src),
      T2('Comprobar el detector de humo y el sensor de CO. La ventilación debe ir encendida: sin ella el humo no llega al detector.', 'Check the smoke detector and the CO sensor. Ventilation must be on: without it smoke never reaches the detector.', 'meyer'),
      ph === 'reentry' ? T2('Confirmar que el O₂ no pasa de 25,6 % (límite de Orion con la cabina a 1 atm).', 'Confirm O₂ stays below 25.6 % (Orion\'s limit with the cabin at 1 atm).', 'hirsch')
        : T2('Confirmar que el O₂ y la presión están dentro de lo certificado para esta nave.', 'Confirm O₂ and pressure are within what this vehicle is certified for.', 'hirsch'),
    ] });
    if (vd.st !== 'safe') {
      // 1 · Aviso
      if (r.tDet == null) rows.push({ t: 0, k: 'alarm', label: EN ? 'No warning' : 'Sin aviso', sub: EN ? 'nobody notices' : 'nadie se entera', cells: [
        T2('Ningún detector salta: el fuego solo se descubre a la vista. Revisar la cabina si hay olor o neblina.', 'No detector goes off: the fire is only found by sight. Check the cabin for smell or haze.', 'meyer'),
        T2('Instalar un sensor de gases sensible (CPM): avisa de CO, HCl y HF mucho antes.', 'Install a sensitive gas sensor (CPM): it warns of CO, HCl and HF much earlier.', 'briggs'),
        T2('Vigilar la subida de CO a distancia: es la única señal.', 'Watch the CO rise remotely: it is the only signal.', 'saffireCO'),
      ] });
      else rows.push({ t: r.tDet, k: 'alarm', label: tm(r.tDet), sub: EN ? 'warning' : 'aviso',
        call: EN ? [`Fire on board! ${M.en} burning in the ${placeEn}.`, 'Copy, I see it. Masks on!', `Copy: fire on ${P.en.split(' · ')[0]}. Masks on, we are tracking CO and O₂.`]
          : [`¡Fuego a bordo! Arde ${lc(M.es)} en ${placeEs}.`, 'Lo veo. ¡Mascarillas!', `Recibido: fuego en ${P.es.split(' · ')[0]}. Mascarillas puestas; seguimos el CO y el O₂.`],
        cells: [
        T2(`Dar la voz de <b>«¡fuego!»</b> y localizar el foco.${s.g === 0 ? ' En microgravedad la llama es azul y casi invisible: buscar el brillo y el humo pegado a la fuente.' : ''}`, `Call <b>"fire!"</b> and locate the source.${s.g === 0 ? ' In microgravity the flame is blue and almost invisible: look for the glow and the smoke hugging the source.' : ''}`, 'meyer'),
        T2(`<b>Mascarilla (PBA)</b> para los dos.${smallCabin && t425 != null ? ` Ya: en esta cabina el CO puede llegar al límite en ${mm(t425)}.` : ''}`, `<b>Masks (PBA)</b> on for both.${smallCabin && t425 != null ? ` Now: in this cabin CO can reach the limit in ${mm(t425)}.` : ''}`, 'saffireCO'),
        T2('Seguir el CO y el O₂ en directo y abrir el procedimiento de emergencia de fuego.', 'Track CO and O₂ live and open the fire emergency procedure.', 'urban16'),
      ] });
      // 2 · Actuar (y cómo apagarlo)
      const tA = r.tAct ?? (r.tDet ?? 0) + s.delay;
      let act;
      if (ph === 'reentry') act = [
        T2('<b>Cerrar los visores</b> de los cascos: el traje da aire limpio. Atados no se puede apagar a mano.', '<b>Close helmet visors</b>: the suit supplies clean air. Strapped in, the fire cannot be fought by hand.', ''),
        T2('Seguir atado. No intentar llegar al fuego.', 'Stay strapped in. Do not try to reach the fire.', ''),
        T2('Decidir con la tripulación: seguir la reentrada (lo más rápido es llegar al agua) y avisar al rescate para abrir la cápsula nada más amerizar.', 'Decide with the crew: continue re-entry (reaching the water is fastest) and tell recovery to open the capsule right after splashdown.', ''),
      ];
      else if (ph === 'splash') act = [
        T2('<b>Abrir la toma de aire exterior</b>; si el mar lo permite, la escotilla.', '<b>Open the outside air inlet</b>; if the sea allows, the hatch.', ''),
        T2('<b>Extintor de CO₂</b> a la base de la llama. Con gravedad la llama sube: apuntar abajo, no a la punta.', '<b>CO₂ extinguisher</b> at the base of the flame. With gravity the flame rises: aim low, not at the tip.', 'takahashi'),
        T2('Acelerar el rescate y preparar la salida de la tripulación.', 'Speed up recovery and prepare to get the crew out.', ''),
      ];
      else if (s.g === 0 && s.o2 < 30) act = [
        T2('<b>Cortar la ventilación y la corriente</b> de la zona. Sin corriente de aire, la llama se ahoga.', '<b>Switch off ventilation and power</b> in the area. Without airflow, the flame starves.', 'bass2', 'tien'),
        T2(`<b>Extintor de CO₂</b> preparado. Si a los ${ASSUME.quench} s sigue ardiendo: disparar a la base de la llama, desde el lado de donde venía el aire. Nunca helio.`, `<b>CO₂ extinguisher</b> ready. If it is still burning after ${ASSUME.quench} s: fire at the base of the flame, from the side the air was coming from. Never helium.`, 'flex', 'takahashi'),
        T2('Confirmar el corte de corriente y contar el tiempo hasta 425 ppm de CO.', 'Confirm power is off and count the time to 425 ppm CO.', 'saffireCO'),
      ];
      else if (s.g === 0) act = [
        T2(`<b>Cortar la corriente.</b> Cortar la ventilación <b>no basta</b> con ${nf(s.o2, 1)} % de O₂: en BRE la llama siguió sin ella.`, `<b>Switch off power.</b> Switching off ventilation is <b>not enough</b> at ${nf(s.o2, 1)} % O₂: in BRE the flame kept burning without it.`, 'bre'),
        T2('<b>Extintor de CO₂ ya</b>, a la base de la llama, desde el lado de donde venía el aire. Nunca helio.', '<b>CO₂ extinguisher now</b>, at the base of the flame, from the side the air was coming from. Never helium.', 'flex', 'takahashi'),
        T2('Preparar la evacuación del módulo y el cierre de la escotilla si no se apaga.', 'Prepare to evacuate the module and close the hatch if it does not go out.', 'takahashi'),
      ];
      else act = [
        T2('<b>Cortar la corriente y la ventilación.</b> Con gravedad, el aire caliente sigue alimentando la llama aunque se apaguen los ventiladores.', '<b>Switch off power and ventilation.</b> With gravity, hot air keeps feeding the flame even with the fans off.', 'takahashi'),
        T2('<b>Extintor de CO₂</b> a la base de la llama: aquí la llama sube, así que hay que apuntar abajo.', '<b>CO₂ extinguisher</b> at the base of the flame: here the flame rises, so aim low.', 'flex', 'takahashi'),
        T2('Resultado extrapolado (gravedad parcial): preparar la evacuación del hábitat por si no se apaga.', 'Extrapolated result (partial gravity): prepare to evacuate the habitat in case it does not go out.', 'zayac'),
      ];
      rows.push({ t: tA, k: 'act', label: tm(tA), sub: EN ? 'act' : 'actuar', cells: act });
      // 3 · Confirmar y después
      if (ph === 'reentry') rows.push({ t: tA + 60, k: 'after', label: EN ? 'Splashdown' : 'Al amerizar', sub: EN ? 'get out' : 'salir', cells: [
        T2('Abrir la toma de aire o la escotilla en cuanto se pueda.', 'Open the air inlet or the hatch as soon as possible.', ''),
        T2('Extintor si sigue ardiendo; salir de la cápsula con el rescate.', 'Extinguisher if still burning; leave the capsule with recovery.', ''),
        T2('Registrar qué ardió y por qué, para la siguiente misión.', 'Record what burned and why, for the next mission.', ''),
      ] });
      else {
        const tO = r.tOut ?? tA + 60;
        rows.push({ t: tO, k: 'check', label: tm(tO), sub: EN ? 'confirm' : 'confirmar', cells: [
          T2(`Comprobar que está apagado${s.g === 0 ? ': en microgravedad la llama casi no se ve; mirar si queda brillo o humo' : ''}.`, `Check it is out${s.g === 0 ? ': in microgravity the flame is hard to see; look for any glow or smoke' : ''}.`, ''),
          T2('Vigilar que no se reavive: tras apagarse puede seguir una llama fría casi invisible.', 'Watch for re-ignition: an almost invisible cool flame can continue after it goes out.', 'flex'),
          T2('Seguir el CO con la tripulación aún con mascarilla.', 'Keep tracking CO with the crew still masked.', 'saffireCO'),
        ] });
        rows.push({ t: tO + 60, k: 'after', label: EN ? 'After' : 'Después', sub: EN ? 'clean the air' : 'limpiar el aire', cells: [
          T2('Volver a encender la ventilación <b>con los filtros</b> para limpiar el aire: sin ella, los gases ácidos tardan mucho más en irse.', 'Turn ventilation back on <b>with the filters</b> to clean the air: without it, acid gases take much longer to clear.', 'niehaus'),
          T2('Mascarillas puestas hasta que el CO baje del límite.', 'Keep masks on until CO is below the limit.', 'saffireCO'),
          T2(`Registrar qué ardió y revisar el resto de la ${lc(M.es)} a bordo.`, `Record what burned and check the rest of the ${lc(M.en)} on board.`, ''),
        ] });
      }
    }
    const title = `${P[LANG]} · ${M[LANG]} · ${nf(s.o2, 1)} % O₂`;
    lastPlan = { rows, roles, icons, title, verdict: L[vd.st] };
    return `<div class="ft-plan-head"><h3>${L.q3}</h3><button type="button" class="ft-print">🖨 ${EN ? 'Print card' : 'Imprimir tarjeta'}</button></div>
      <p class="ft-plan-title">🔥 ${esc(title)}</p>
      <div class="ft-plan" role="table">
        <div class="ft-ph" role="row"><span></span>${roles.map((x, i) => `<span role="columnheader">${icons[i]} ${x}${seated && i < 2 ? ` <i class="dim">${EN ? '(strapped in)' : '(atado)'}</i>` : ''}</span>`).join('')}</div>
        ${rows.map((row) => `<div class="ft-pr ${row.k}" role="row" data-t="${row.t}"><span class="ft-pt"><b>${row.label}</b><i>${row.sub}</i></span>${row.cells.map((c, i) => `<span class="ft-pc" role="cell" data-role="${icons[i]} ${roles[i]}">${c.t}${c.s ? `<em>${c.s}</em>` : ''}</span>`).join('')}</div>`).join('')}
      </div>
      <p class="small dim">${EN ? 'While the scene plays, the current moment lights up. Times come from this scenario; each action carries its NASA source (blank: operational common sense, not from a test).' : 'Mientras corre la escena se ilumina el momento actual. Los tiempos salen de este escenario; cada acción lleva su fuente de la NASA (sin fuente: sentido común operativo, no sale de un ensayo).'}</p>`;
  }
  function ledger(r) {
    const M = MAT[s.mat], P = PRESETS[s.preset], X = [];
    if (M.kind === 'limit') X.push({ tag: 'psi', t: EN ? `Extinction O₂ for PMMA: ${nf(Math.min(...M.band), 1)}–${nf(Math.max(...M.band), 1)} %` : `O₂ de apagado del PMMA: ${nf(Math.min(...M.band), 1)}–${nf(Math.max(...M.band), 1)} %`, s: src('bass2') });
    else X.push({ tag: 'psi', t: EN ? `Burned / did not ignite at ${nf(M.tested[0], 1)}–${nf(M.tested[1], 1)} % O₂` : `Ardió / no prendió con ${nf(M.tested[0], 1)}–${nf(M.tested[1], 1)} % de O₂`, s: src(...M.src) });
    X.push({ tag: 'psi', t: EN ? `Flame spread ${SPREAD[0]}–${SPREAD[1]} mm/s (air at 20 cm/s)` : `Propagación de ${nf(SPREAD[0], 1)}–${nf(SPREAD[1], 1)} mm/s (aire a 20 cm/s)`, s: src('saffire2') });
    X.push({ tag: 'psi', t: EN ? `Burning faster with more O₂: ×${nf(r.k, 2)} (heptane droplets)` : `Arde más rápido con más O₂: ×${nf(r.k, 2)} (gotas de heptano)`, s: src('flex') });
    X.push({ tag: 'sup', t: EN ? 'Solids speed up with O₂ like the FLEX droplets (analogy)' : 'Los sólidos se aceleran con el O₂ igual que las gotas de FLEX (analogía)', s: '' });
    X.push({ tag: 'nasa', t: EN ? 'Saffire fires: 1.5–3.2 kW in 17–19 m³' : 'Fuegos de Saffire: 1,5–3,2 kW en 17–19 m³', s: src('saffire6') });
    X.push({ tag: 'nasa', t: EN ? 'Far-field CO after a Saffire fire: 1,390–2,360 ppm; 1-hour limit 425 ppm' : 'CO lejano tras un fuego de Saffire: 1.390–2.360 ppm; límite de 1 h: 425 ppm', s: src('saffireCO') });
    X.push({ tag: 'sup', t: EN ? 'CO grows in proportion to burned area, evenly while it burns' : 'El CO crece en proporción al área quemada, de forma uniforme mientras arde', s: '' });
    X.push({ tag: 'sup', t: EN ? 'Well-mixed cabin air with no filters (conservative)' : 'Aire de la cabina bien mezclado y sin filtros (conservador)', s: '' });
    X.push({ tag: 'nasa', t: EN ? `Volume ${P.V} m³ · ${nf(P.o2, 1)} % O₂ · ${nf(P.p, 2)} atm` : `Volumen ${P.V} m³ · ${nf(P.o2, 1)} % O₂ · ${nf(P.p, 2)} atm`, s: P.V === 30 ? (EN ? '(volume: our assumption) ' : '(volumen: supuesto nuestro) ') + src('mcallister') : src('urban16', 'hirsch') });
    X.push({ tag: 'sup', t: EN ? `Smoke detector ${ASSUME.smokeDist / 100} m away, ${ASSUME.smokeBuild} s for the smoke to build up; buoyant plume ${ASSUME.plume1g} cm/s at 1 g` : `Detector de humo a ${ASSUME.smokeDist / 100} m, ${ASSUME.smokeBuild} s para que se acumule el humo; columna caliente de ${ASSUME.plume1g} cm/s a 1 g`, s: '' });
    X.push({ tag: 'sup', t: EN ? `CO alarm at ${ASSUME.gasThr} ppm (${ASSUME.gasThrCpm} ppm with CPM)` : `Alarma de CO a ${ASSUME.gasThr} ppm (${ASSUME.gasThrCpm} ppm con CPM)`, s: '' });
    X.push({ tag: 'sup', t: EN ? `After switching off ventilation the flame dies in ${ASSUME.quench} s; extinguisher takes ${ASSUME.extTime} s` : `Tras cortar la ventilación la llama muere en ${ASSUME.quench} s; el extintor tarda ${ASSUME.extTime} s`, s: '' });
    X.push({ tag: 'nasa', t: EN ? 'High O₂ (≥ 30 %): flame survives without ventilation' : 'O₂ alto (≥ 30 %): la llama sobrevive sin ventilación', s: src('bre') });
    return X;
  }

  function mlBox() {
    const p = pBurn(s.o2, s.mat === 'pmma_s'), pc = Math.round(p * 100);
    const col = p >= 0.7 ? 'bad' : p >= 0.4 ? 'mid' : 'good';
    return `<div class="ft-ml"><div class="ft-ml-top"><span>🧠 ${EN ? 'Super-Intelligence model: chance the flame keeps burning' : 'Modelo de Super-Intelligence: probabilidad de que la llama siga ardiendo'}</span><b class="${col}">${pc} %</b></div>
      <div class="ft-ml-bar"><i class="${col}" style="width:${pc}%"></i></div>
      <p class="small dim">${EN ? `Machine learning (logistic regression) trained on ${ML.n} observations from ${ML.tests} BASS-II tests. Error when predicting a hidden test: ±${ML.mae} points of O₂.` : `Aprendizaje automático (regresión logística) entrenado con ${ML.n} observaciones de ${ML.tests} ensayos de BASS-II. Error al predecir un ensayo escondido: ±${nf(ML.mae, 1)} puntos de O₂.`}</p></div>`;
  }
  function bassChart() {
    const W = 520, H = 92, x = (v) => 20 + ((v - 12) / (24 - 12)) * (W - 40);
    const dots = BASS2.map(([k, v], i) => `<circle cx="${x(v).toFixed(1)}" cy="${k === 's' ? 30 : 58}" r="4" class="${k === 's' ? 'slab' : 'rod'}" opacity=".8"><title>${v} %</title></circle>`).join('');
    const yo = Math.min(Math.max(s.o2, 12), 24);
    return `<figure class="ft-bass"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L.bassChart}">
      <text x="2" y="34" class="lab">${L.slab}</text><text x="2" y="62" class="lab">${L.rod}</text>
      ${[12, 14, 16, 18, 20, 22, 24].map((v) => `<line x1="${x(v)}" x2="${x(v)}" y1="14" y2="72" class="grid"/><text x="${x(v)}" y="86" class="lab" text-anchor="middle">${v}%</text>`).join('')}
      ${dots}<line x1="${x(yo)}" x2="${x(yo)}" y1="8" y2="74" class="you"/><text x="${x(yo) + 4}" y="12" class="lab you-t">${L.you}${s.o2 > 24 ? ' →' : ''}</text></svg>
      <figcaption class="small dim">${L.bassChart}</figcaption></figure>`;
  }

  function timeEnd(r) {
    const ends = [r.dur[1], r.t425.none[1] ?? 0, (r.tOut ?? 0) + 120, 300].filter(Boolean);
    return Math.min(ASSUME.tmax, Math.max(...ends));
  }
  function chart(r) {
    const c = r.curves;
    const tEnd = timeEnd(r);
    const yMax = Math.max(SMAC_CO * 1.3, c.worst(tEnd) * 1.08);
    const W = 640, H = 230, l = 46, b = 26, t = 10, rr = 10;
    const X = (v) => l + (v / tEnd) * (W - l - rr), Y = (v) => H - b - (Math.min(v, yMax) / yMax) * (H - b - t);
    const N = 120, ts = Array.from({ length: N + 1 }, (_, i) => (i * tEnd) / N);
    const band = (lo, hi) => `M${ts.map((v) => `${X(v).toFixed(1)},${Y(hi(v)).toFixed(1)}`).join('L')}L${ts.slice().reverse().map((v) => `${X(v).toFixed(1)},${Y(lo(v)).toFixed(1)}`).join('L')}Z`;
    const line = (f) => `M${ts.map((v) => `${X(v).toFixed(1)},${Y(f(v)).toFixed(1)}`).join('L')}`;
    const ev = [[0, L.tl.ign], [r.tSmoke, L.tl.smoke], [r.tGas, L.tl.gas], [r.tAct, L.tl.act], [r.tOut, L.tl.out]].filter(([v]) => v != null && v <= tEnd).sort((p, q) => p[0] - q[0]);
    const step = tEnd > 900 ? 300 : tEnd > 400 ? 120 : 60;
    const yStep = yMax > 3000 ? 1000 : yMax > 1200 ? 500 : yMax > 500 ? 200 : 100;
    return `<figure class="ft-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L.chartY}">
      ${Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep).map((v) => `<line x1="${l}" x2="${W - rr}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${l - 4}" y="${Y(v) + 4}" text-anchor="end" class="lab">${nf(v)}</text>`).join('')}
      ${Array.from({ length: Math.floor(tEnd / step) + 1 }, (_, i) => i * step).map((v) => `<text x="${X(v)}" y="${H - 8}" text-anchor="middle" class="lab">${nf(v / 60, v % 60 ? 1 : 0)}</text>`).join('')}
      <path d="${band(c.best, c.worst)}" class="b-none"/><path d="${line(c.mid)}" class="l-none"/>
      ${r.tOut != null ? `<path d="${band(c.planBest, c.planWorst)}" class="b-plan"/><path d="${line(c.planMid)}" class="l-plan"/>` : ''}
      <line x1="${l}" x2="${W - rr}" y1="${Y(SMAC_CO)}" y2="${Y(SMAC_CO)}" class="smac"/><text x="${W - rr - 4}" y="${Y(SMAC_CO) - 5}" text-anchor="end" class="lab smac-t">425 ppm · ${EN ? '1-hour limit' : 'límite 1 h'}</text>
      ${ev.map(([v], i) => `<line x1="${X(v)}" x2="${X(v)}" y1="${t + 8}" y2="${H - b}" class="ev"/><circle cx="${X(v)}" cy="${t + 8 + (i % 2) * 16}" r="8" class="ev-c"/><text x="${X(v)}" y="${t + 12 + (i % 2) * 16}" text-anchor="middle" class="ev-n">${i + 1}</text>`).join('')}
      </svg><div class="ft-events small">${ev.map(([v, n], i) => `<span><b class="ev-b">${i + 1}</b> ${n} · ${mm(v)}</span>`).join('')}</div><figcaption class="small"><span class="key none"></span>${L.none} <span class="key plan"></span>${L.plan} · <span class="dim">${L.chartY} · ${L.chartX}</span></figcaption></figure>`;
  }

  setForm();
  render();
}
