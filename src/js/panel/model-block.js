// Bloque «Nuestro modelo» del Panel: entrena en el navegador 4 modelos con las 257 gotas de FLEX (NASA PSI-69),
// los compara con validación cruzada, enseña qué variables pesan y deja predecir. Sin API: todo aquí y siempre igual.
//
// Cómo se lee este archivo (de arriba abajo):
//   1. VARIABLES y TAREAS: qué columnas usa el modelo y las dos preguntas que contesta (velocidad / se apaga).
//   2. mountModel(): pinta la estructura HTML y, dentro, define las funciones del bloque:
//        cargarDatos()         lee el CSV de gotas y lo convierte en números
//        entrenar(tarea)       validación cruzada de cada modelo + entrena el ensemble final
//        mostrarResultados()   tabla comparativa, texto explicativo y barras de importancia
//        predecir()            formulario con deslizadores → velocidad K y probabilidad de apagarse
//   3. Al final: se activa todo cuando el bloque aparece en pantalla (IntersectionObserver).
// Los textos largos de la documentación están aparte, en modelblock/documentacion.js
import { MODELS, crossValidate } from '../ml/index.js';
import { documentacionHTML } from './model-docs.js';

// Las 6 columnas de entrada del modelo, en el mismo orden que en cada fila de X (índice j)
const VARIABLES = [
  { k: 'hept', es: 'Combustible (heptano / metanol)', en: 'Fuel (heptane / methanol)' },
  { k: 'o2', es: 'Oxígeno', en: 'Oxygen' },
  { k: 'p', es: 'Presión', en: 'Pressure' },
  { k: 'co2', es: 'CO₂ en el aire', en: 'CO₂ in the air' },
  { k: 'he', es: 'Helio en el aire', en: 'Helium in the air' },
  { k: 'd0', es: 'Tamaño de la gota', en: 'Droplet size' },
];

// Las dos preguntas que contesta el modelo: reg = regresión (un número), cls = clasificación (sí / no)
const TAREAS = {
  reg: { es: '¿A qué velocidad arde?', en: 'How fast does it burn?', sub: { es: 'Velocidad de combustión K (mm²/s)', en: 'Burning rate K (mm²/s)' } },
  cls: { es: '¿Se apaga sola la llama?', en: 'Does the flame go out by itself?', sub: { es: 'Antes de consumir el combustible (sí / no)', en: 'Before the fuel is used up (yes / no)' } },
};

export function mountModel(root, LANG, decorate = () => {}) {
  if (!root) return;
  const EN = LANG === 'en', t = (es, en) => (EN ? en : es);
  // nf = formato numérico según el idioma, con `d` decimales fijos
  const nf = (x, d = 2) => Number(x).toLocaleString(LANG, { maximumFractionDigits: d, minimumFractionDigits: d });

  root.innerHTML = `
    <div class="ml-tasks">${Object.entries(TAREAS).map(([k, v]) => `<button type="button" data-task="${k}"><b>${v[LANG]}</b><small>${v.sub[LANG]}</small></button>`).join('')}</div>
    <div class="ml-grid">
      <div class="ml-card"><h3>1 · ${t('Entrenar y comparar', 'Train and compare')}</h3><div class="ml-res"><p class="dim">${t('Entrenando…', 'Training…')}</p></div></div>
      <div class="ml-card"><h3>2 · ${t('Qué variables pesan más', 'Which variables matter most')}</h3><div class="ml-imp"></div></div>
      <div class="ml-card ml-pred"><h3>3 · ${t('Predecir', 'Predict')}</h3><div class="ml-form"></div><div class="ml-out"></div></div>
    </div>
    ${documentacionHTML(t)}`;

  let datos = null;        // { X, y: {reg, cls}, range } una vez cargado el CSV
  let tarea = 'reg';       // pregunta seleccionada ahora mismo
  const resultados = {};   // resultados[tarea] = lista de modelos con su nota de validación cruzada
  const finales = {};      // finales[tarea] = modelo ya entrenado con todas las gotas, listo para predecir
  const $ = (selector) => root.querySelector(selector);

  // Lee datasets/flex_gotas.csv. Columnas: 0 combustible, 1 O₂, 2 presión, 3 CO₂, 4 helio, 5 tamaño, 7 velocidad K, 9 resultado.
  async function cargarDatos() {
    const texto = await (await fetch('datasets/flex_gotas.csv')).text();
    const filas = texto.trim().split('\n').slice(1).map((l) => l.split(',')).filter((f) => f[7] !== '' && +f[2] > 0);
    // Entradas: [es_heptano (1/0), O₂, presión, CO₂, helio, tamaño]
    const X = filas.map((f) => [/heptane/i.test(f[0]) ? 1 : 0, +f[1], +f[2], +f[3], +f[4], +f[5]]);
    // Rango [mín, máx] de cada variable, para avisar cuando se predice fuera de lo ensayado
    const rango = VARIABLES.map((_, j) => [Math.min(...X.map((x) => x[j])), Math.max(...X.map((x) => x[j]))]);
    return {
      X,
      y: { reg: filas.map((f) => +f[7]), cls: filas.map((f) => (f[9] === 'Extinction' ? 1 : 0)) },
      range: rango,
    };
  }

  const entrenando = {}; // promesas en curso, para no entrenar dos veces la misma tarea
  async function entrenar(tk) { // un modelo cada vez, devolviendo el control a la página entre uno y otro
    if (resultados[tk]) return;
    if (entrenando[tk]) return entrenando[tk];
    entrenando[tk] = (async () => {
      const claves = Object.keys(MODELS), salida = [];
      for (const [n, k] of claves.entries()) {
        if (tk === tarea) $('.ml-res').innerHTML = `<p class="ml-prog">${t('Entrenando', 'Training')} <b>${MODELS[k].name[LANG]}</b> (${n + 1}/${claves.length})…</p><span class="ml-bar"><i style="width:${n / claves.length * 100}%"></i></span>`;
        await new Promise((r) => setTimeout(r, 20));
        const t0 = performance.now();
        const cv = crossValidate(k, datos.X, datos.y[tk], tk);
        salida.push({ k, ...cv, ms: performance.now() - t0 });
      }
      salida.sort((a, b) => b.score - a.score); // el mejor primero
      await new Promise((r) => setTimeout(r, 20));
      // Para predecir se usa el ensemble ponderado (decisión del equipo), aunque otro modelo saque mejor nota.
      // El bosque se entrena aparte porque el desacuerdo entre sus árboles da la incertidumbre (el «±»).
      finales[tk] = { key: 'ensemble', f: MODELS.ensemble.fit(datos.X, datos.y[tk], tk), forest: MODELS.forest.fit(datos.X, datos.y[tk], tk) };
      resultados[tk] = salida;
    })();
    return entrenando[tk];
  }

  // Tabla comparativa de modelos + frase explicativa + barras de importancia de cada variable
  async function mostrarResultados() {
    const tk = tarea;
    await entrenar(tk);
    if (tk !== tarea) return; // mientras entrenaba, la persona cambió de pregunta
    const R = resultados[tarea], mejor = R[0], ens = R.find((r) => r.k === 'ensemble');
    const siSeApaga = datos.y.cls.filter((v) => v).length, n = datos.y.cls.length;
    $('.ml-res').innerHTML = `<table class="ml-tbl"><tr><th>${t('Modelo', 'Model')}</th><th>${tarea === 'reg' ? t('Acierto (R²)', 'Fit (R²)') : t('Aciertos', 'Accuracy')}</th><th>${tarea === 'reg' ? t('Error medio', 'Mean error') : 'AUC'}</th></tr>
      ${R.map((r) => { const v = tarea === 'reg' ? r.r2 : r.acc; return `<tr class="${r === mejor ? 'best' : ''}"><td>${MODELS[r.k].name[LANG]}${r === mejor ? ` <span class="ml-badge">${t('mejor nota', 'top score')}</span>` : ''}${r.k === 'ensemble' ? ` <span class="ml-badge use">${t('el que predice', 'used to predict')}</span>` : ''}</td>
        <td><span class="ml-bar"><i style="width:${Math.max(0, v) * 100}%"></i><b>${tarea === 'reg' ? nf(v, 2) : nf(v * 100, 0) + ' %'}</b></span></td>
        <td>${tarea === 'reg' ? '±' + nf(r.mae, 3) + ' mm²/s' : nf(r.auc, 2)}</td></tr>`; }).join('')}</table>
      <p class="small">${tarea === 'reg'
        ? t(`El ensemble que predice explica el ${nf(ens.r2 * 100, 0)} % de las diferencias entre gotas que <b>no vio</b> al entrenar; el mejor modelo suelto, el ${nf(mejor.r2 * 100, 0)} %. ${mejor.k === 'ensemble' ? 'Gana el ensemble: XGBoost, CatBoost, el bosque y la lineal se equivocan de forma distinta, y al promediarlos los errores se compensan.' : mejor.k === 'linear' ? 'Gana el modelo más sencillo: con 257 gotas, uno complicado no aporta más.' : ''}`,
          `The ensemble used to predict explains ${nf(ens.r2 * 100, 0)} % of the differences between droplets it <b>never saw</b>; the best single model, ${nf(mejor.r2 * 100, 0)} %. ${mejor.k === 'ensemble' ? 'The ensemble wins: XGBoost, CatBoost, the forest and the linear model err in different ways, and averaging them cancels errors out.' : mejor.k === 'linear' ? 'The simplest model wins: with 257 droplets, a complex one adds nothing.' : ''}`)
        : t(`El ensemble que predice acierta ${nf(ens.acc * 100, 0)} de cada 100 gotas que no vio (el mejor suelto, ${nf(mejor.acc * 100, 0)}). Decir siempre «se apaga» acertaría ${nf(siSeApaga / n * 100, 0)}.`,
          `The ensemble used to predict gets ${nf(ens.acc * 100, 0)} out of 100 unseen droplets right (best single model, ${nf(mejor.acc * 100, 0)}). Always saying "it goes out" would get ${nf(siSeApaga / n * 100, 0)}.`)}</p>`;
    // Importancia por permutación: cuánto empeora el modelo al barajar cada variable
    const imp = mejor.imp, maximo = Math.max(...imp.map((v) => Math.max(0, v))) || 1;
    const orden = imp.map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]);
    $('.ml-imp').innerHTML = orden.map(([v, j]) => `<div class="ml-ib"><span>${VARIABLES[j][LANG]}</span><span class="ml-bar imp"><i style="width:${Math.max(0, v) / maximo * 100}%"></i></span></div>`).join('') +
      `<p class="small dim">${t('Cuánto empeora el modelo si se baraja esa variable (en gotas que no vio). ', 'How much worse the model gets when that variable is shuffled (on unseen droplets). ')}${orden[0][1] === 1 ? t('El oxígeno es lo que más decide, como dice la física de la combustión.', 'Oxygen decides the most, as combustion physics says.') : ''}</p>`;
  }

  // ── Formulario de predicción ──
  // Un deslizador por variable (menos el combustible, que son dos botones).
  //   j = columna en X · k = divisor (el deslizador va en %, el modelo usa fracción) · u = unidad que se muestra
  const CONTROLES = [
    { j: 1, min: 12, max: 40, step: 0.5, v: 21, k: 100, u: '%', lab: t('Oxígeno', 'Oxygen') },
    { j: 2, min: 0.2, max: 3, step: 0.05, v: 1, k: 1, u: 'atm', lab: t('Presión', 'Pressure') },
    { j: 3, min: 0, max: 70, step: 1, v: 0, k: 100, u: '%', lab: t('CO₂ en el aire', 'CO₂ in the air') },
    { j: 4, min: 0, max: 45, step: 1, v: 0, k: 100, u: '%', lab: t('Helio en el aire', 'Helium in the air') },
    { j: 5, min: 1, max: 5, step: 0.1, v: 2.5, k: 1, u: 'mm', lab: t('Tamaño de la gota', 'Droplet size') },
  ];
  $('.ml-form').innerHTML = `<div class="ml-fuel"><button type="button" data-f="1" class="on">${t('Heptano', 'Heptane')}</button><button type="button" data-f="0">${t('Metanol', 'Methanol')}</button></div>` +
    CONTROLES.map((s) => `<label class="ml-sl"><span>${s.lab} <output></output></span><input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.v}" data-j="${s.j}"></label>`).join('');
  let combustible = 1; // 1 = heptano, 0 = metanol
  $('.ml-fuel').addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;
    combustible = +boton.dataset.f;
    root.querySelectorAll('.ml-fuel button').forEach((x) => x.classList.toggle('on', x === boton));
    predecir();
  });
  root.querySelectorAll('.ml-sl input').forEach((i) => i.addEventListener('input', predecir));

  // Lee los deslizadores, pregunta al modelo y pinta velocidad K, probabilidad de apagarse, tiempo de vida y avisos
  function predecir() {
    const x = [combustible, 0, 0, 0, 0, 0];
    root.querySelectorAll('.ml-sl input').forEach((i, n) => {
      const s = CONTROLES[n];
      x[s.j] = +i.value / s.k;
      i.previousElementSibling.querySelector('output').textContent = nf(+i.value, s.step < 1 ? (s.step < 0.1 ? 2 : 1) : 0) + ' ' + s.u;
    });
    if (!finales.reg || !finales.cls) { $('.ml-out').innerHTML = `<p class="dim">${t('Entrenando…', 'Training…')}</p>`; return; }
    // ¿Alguna variable fuera del rango ensayado en FLEX? Entonces es extrapolación y se avisa.
    const extrapolado = datos.range.map(([a, b], j) => x[j] < a - 1e-9 || x[j] > b + 1e-9).some(Boolean);
    const K = finales.reg.f(x);                       // velocidad de combustión (mm²/s)
    const incertidumbre = finales.reg.forest.spread(x); // el «±»: desacuerdo entre los árboles del bosque
    const P = finales.cls.f(x);                       // probabilidad de que la llama se apague sola
    // Aviso al resto de la página (el asistente y el Fire Twin escuchan este evento)
    document.dispatchEvent(new CustomEvent('astale:event', { detail: { type: 'predict', x: { fuel: x[0] ? 'heptane' : 'methanol', o2: Math.round(x[1] * 1000) / 10, p: x[2], co2: x[3], he: x[4], d0: x[5] } } }));
    const vida = (x[5] ** 2) / Math.max(0.01, K); // ley d²: tiempo = d0² / K
    $('.ml-out').innerHTML = `<div class="ml-big"><div><small>${t('Velocidad de combustión', 'Burning rate')}</small><b>${nf(Math.max(0, K), 2)}</b><span>mm²/s ± ${nf(incertidumbre, 2)}</span></div>
      <div><small>${t('Se apaga sola', 'Goes out by itself')}</small><b>${nf(P * 100, 0)} %</b><span>${t('de probabilidad', 'probability')}</span></div></div>
      <p class="small">${t(`Una gota de ${nf(x[5], 1)} mm tardaría unos <b>${nf(vida, 1)} s</b> en arder entera (ley d²).`, `A ${nf(x[5], 1)} mm droplet would take about <b>${nf(vida, 1)} s</b> to burn completely (d² law).`)}
      ${x[3] + x[4] > 0.15 ? t(' Con tanto gas inerte, la llama tiende a ahogarse: es la idea de los extintores de CO₂ de la ISS.', ' With this much inert gas the flame tends to starve: that is the idea behind the ISS CO₂ extinguishers.') : ''}</p>
      ${extrapolado ? `<p class="ml-warn">⚠️ ${t('Fuera de lo ensayado en FLEX: predicción extrapolada.', 'Outside what FLEX tested: extrapolated prediction.')}</p>` : ''}
      <p class="small dim">${t('Modelos', 'Models')}: ${MODELS[finales.reg.key].name[LANG]} · ${MODELS[finales.cls.key].name[LANG]}. ${t('El ± sale del desacuerdo entre los 120 árboles del bosque.', 'The ± is the disagreement among the forest’s 120 trees.')}</p>`;
  }
  predecir();

  // Botones de arriba: cambiar de pregunta (velocidad / se apaga)
  root.querySelectorAll('.ml-tasks button').forEach((b) => b.addEventListener('click', () => {
    tarea = b.dataset.task;
    root.querySelectorAll('.ml-tasks button').forEach((x) => x.classList.toggle('on', x === b));
    if (datos) mostrarResultados().then(predecir);
  }));
  root.querySelector('.ml-tasks button').classList.add('on');

  // Se entrena cuando el bloque aparece en pantalla (para no frenar la carga de la página)
  const arrancarEntrenamiento = async () => {
    datos = await cargarDatos();
    await mostrarResultados(); predecir();
    await entrenar('cls'); predecir();
    decorate(root);
  };
  let arrancado = false;
  const arrancar = () => { if (!arrancado) { arrancado = true; arrancarEntrenamiento(); } };
  if ('IntersectionObserver' in window) {
    const vigilante = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { vigilante.disconnect(); arrancar(); } });
    vigilante.observe(root);
  }
  setTimeout(arrancar, 2000); // por si el navegador no avisa de que el bloque está a la vista
}
