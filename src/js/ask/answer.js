// «Pregunta a Astale»
import { simulate, PRESETS, MAT, ML, FLEX_FIT, SMAC_CO } from '../fire-twin/index.js';

const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PSI = (id, txt) => `<a href="https://psi.nasa.gov/physci/repo/data/investigations/${id}" target="_blank" rel="noopener">${txt}</a>`;

export function parse(q) {
  const f = fold(q);
  const has = (re) => re.test(f);
  let preset = null;
  if (has(/\b(luna|lunar|moon)\b/)) preset = 'moon';
  else if (has(/\b(marte|mars|marciano|martian)\b/)) preset = 'mars';
  else if (has(/reentr|re-entr/)) preset = 'reentry';
  else if (has(/amerizaj|amerizar|splash/)) preset = 'splash';
  else if (has(/orion|capsul/) && has(/eva|paseo|explorac|spacewalk/)) preset = 'orion_eva';
  else if (has(/orion|capsul/)) preset = 'orion';
  else if (has(/\biss\b|estacion|station/)) preset = 'iss';
  let mat = null;
  if (has(/acril|pmma|plexi|metacril/)) mat = has(/varilla|\brod|barra|cilindr/) ? 'pmma_r' : 'pmma_s';
  else if (has(/nomex|traje|suit|bolsa/)) mat = 'nomex';
  else if (has(/silicon|junta|seal|cable/)) mat = 'silicone';
  else if (has(/tela|algodon|fabric|cotton|sibal|textil|ropa|cloth/)) mat = 'sibal';
  const m = f.match(/(\d{1,2}(?:[.,]\d+)?)\s*(%|por ?ciento|percent)/) || f.match(/(?:o2|oxigeno|oxygen)\D{0,12}(\d{1,2}(?:[.,]\d+)?)/);
  const o2 = m ? parseFloat(m[1].replace(',', '.')) : null;
  const pa = f.match(/(\d(?:[.,]\d+)?)\s*(atm|bar)\b/), pp = f.match(/(\d{1,2}(?:[.,]\d+)?)\s*psi\b/);
  const p = pa ? parseFloat(pa[1].replace(',', '.')) : pp ? parseFloat(pp[1].replace(',', '.')) / 14.7 : null;
  const size = has(/grande|enorme|large|big/) ? 'large' : has(/pequen|small|chispa|tiny/) ? 'small' : null;
  const it = {
    meta: has(/capaz|puedes|podeis|sabes|eres capaz|todos los escenarios|cualquier escenario|sin datos|no (tengas|tienes|hay) datos|huecos|extrapol|can you|able to|any scenario|every scenario|without data|no data|gaps/),
    burn: has(/arde|arder|quema|prende|incendi|inflamable|burn|ignit|flammab|catch fire/),
    time: has(/cuanto tiempo|tiempo|minutos|segundos|rapido|how long|how much time|how fast|minutes|seconds/),
    todo: has(/que hago|que hacer|que debo|como (se )?apag|apagar|extintor|evacu|actuar|protocolo|what (should|to) do|extinguish|put (it )?out|evacuat|respond/),
    detect: has(/detector|detecta|sensor|alarma|aviso|detect|alarm|warning/),
    co: has(/\bco\b|monoxido|monoxide|toxic|humo|smoke|respirar|breath|mascar|mask/),
    why: has(/por que|porque|why|diferente|distint|different|como es el fuego|how does fire|forma de la llama|flame shape/),
    model: has(/modelo|precis|fiable|exact|confian|error|machine learning|aprendizaje|xgboost|catboost|ensemble|reliable|accura|trained|entrenad/),
  };
  return { f, preset, mat, o2, p, size, it };
}

const mmss = (x, EN) => (x == null ? (EN ? 'not reached in 30 min' : 'no se llega en 30 min') : x < 90 ? Math.round(x) + ' s' : (x / 60).toFixed(1).replace('.', EN ? '.' : ',') + ' min');
const nf = (x, d, EN) => Number(x).toFixed(d).replace('.', EN ? '.' : ',');

export function smartAnswer(q, LANG) {
  const EN = LANG === 'en', t = (es, en) => (EN ? en : es);
  const P = parse(q), it = P.it;
  const scenarioAsked = !!(P.preset || P.mat || P.o2 != null || P.p != null);
  const blocks = [], text = [];
  let direct = null, scenario = null;

  // ---- ¿Puedes predecir cualquier escenario, aunque no haya datos?
  if (it.meta && !(scenarioAsked && (it.burn || it.time || it.todo))) {
    const s = { ...PRESETS.moon, preset: 'moon', mat: 'sibal', size: 'saffire', delay: 60, cpm: false }, r = simulate(s);
    direct = t('Sí: Astale da una respuesta para cualquier nave, gravedad, oxígeno y presión, pero no todas valen lo mismo, y cada una dice cuánto hay que fiarse de ella.',
      'Yes: Astale gives an answer for any vehicle, gravity, oxygen and pressure, but not all answers are equally solid, and each one says how far to trust it.');
    blocks.push(`<ul>
      <li>✅ <b>${t('Donde la NASA ensayó', 'Where NASA tested')}</b> (${t('microgravedad, 15–22 % de O₂, ~1 atm: ISS, Orion en crucero', 'microgravity, 15–22 % O₂, ~1 atm: ISS, Orion in cruise')}): ${t(`responde con lo medido. El límite de oxígeno se acierta con ±${nf(ML.mae, 1)} puntos (${PSI('PSI-25', 'BASS-II')}, ${ML.n} observaciones).`, `it answers with what was measured. The oxygen limit is predicted within ±${nf(ML.mae, 1, true)} points (${PSI('PSI-25', 'BASS-II')}, ${ML.n} observations).`)}</li>
      <li>⚠️ <b>${t('Donde no hay ensayos', 'Where there are no tests')}</b> (${t('Luna, Marte, más de 23 % de O₂, menos de 0,7 atm', 'Moon, Mars, above 23 % O₂, below 0.7 atm')}): ${t('extrapola con cuatro reglas: acotar entre 0 g y 1 g, ante la duda lo más peligroso, física y literatura de la NASA, y marcarlo como «extrapolado» diciendo qué ensayo falta.', 'it extrapolates with four rules: bracket between 0 g and 1 g, when in doubt the most dangerous, physics and NASA literature, and flag it as "extrapolated" saying which test is missing.')}</li>
      <li>❌ <b>${t('Lo que no hace', 'What it does not do')}</b>: ${t('materiales que no están en los datos (solo tiene 5: tela SIBAL, placa y varilla de acrílico, Nomex y silicona) ni cómo reacciona la gente.', 'materials that are not in the data (it only has 5: SIBAL fabric, acrylic plate and rod, Nomex and silicone) or how people react.')}</li></ul>
      <p>${t('Ejemplo sin datos, la base lunar (34 % O₂, 0,56 atm, 0,16 g) con una tela ardiendo:', 'Example with no data, the lunar base (34 % O₂, 0.56 atm, 0.16 g) with burning fabric:')} <b>${t('arde', 'it burns')}</b> ⚠️, ${t('el CO llega al límite de 1 hora en', 'CO reaches the 1-hour limit in')} <b>${mmss(r.t425.none[0], EN)}</b> ${t('en el peor caso, y la orden es', 'in the worst case, and the order is')} <b>${t('extintor ya y preparar la evacuación', 'extinguisher now and prepare to evacuate')}</b>, ${t('porque con tanto oxígeno cortar el aire no basta.', 'because with this much oxygen cutting the air is not enough.')}</p>
      <p><a href="#pn-gaps">${t('Las cuatro reglas explicadas →', 'The four rules explained →')}</a></p>`);
    scenario = { preset: 'moon', mat: 'sibal', size: 'saffire' };
  }

  // ---- Escenario: ¿arde?, ¿cuánto tiempo?, ¿qué hacer?
  else if (scenarioAsked || it.burn || it.time || it.todo) {
    const preset = P.preset || 'iss', base = PRESETS[preset];
    const s = { ...base, preset, mat: P.mat || 'sibal', size: P.size || 'saffire', delay: 60, cpm: false };
    if (P.o2 != null && P.o2 >= 10 && P.o2 <= 100) s.o2 = P.o2;
    if (P.p != null && P.p > 0.1 && P.p <= 3) s.p = P.p;
    const r = simulate(s), vd = r.vd, M = MAT[s.mat];
    const where = `${base[LANG]} · ${nf(s.o2, s.o2 % 1 ? 1 : 0, EN)} % O₂ · ${nf(s.p, 2, EN)} atm · ${nf(s.g, 2, EN)} g · ${s.V} m³`;
    const assumed = [];
    if (!P.preset) assumed.push(t('en la ISS', 'on the ISS'));
    if (!P.mat) assumed.push(t('que arde una tela de la cabina (SIBAL)', 'that a cabin fabric (SIBAL) burns'));
    const ST = { burns: t('Sí, arde', 'Yes, it burns'), edge: t('Está en el límite: puede arder', 'It is on the edge: it may burn'), safe: t('No debería arder', 'It should not burn'), untested: t('Nadie lo ha ensayado: se trata como si ardiera', 'Nobody has tested it: it is treated as burning') }[vd.st];
    const why = M.kind === 'limit'
      ? t(`Su llama se apaga por debajo de ~${nf(vd.hi, 1)} % de O₂ en microgravedad (${PSI('PSI-25', 'BASS-II')}); aquí hay ${nf(s.o2, 1)} %.`, `Its flame goes out below ~${nf(vd.hi, 1, true)} % O₂ in microgravity (${PSI('PSI-25', 'BASS-II')}); here there is ${nf(s.o2, 1, true)} %.`)
      : M.kind === 'burns' ? t(`Ardió en Saffire-II con ${nf(vd.lo, 1)}–${nf(vd.hi, 1)} % de O₂.`, `It burned in Saffire-II at ${nf(vd.lo, 1, true)}–${nf(vd.hi, 1, true)} % O₂.`)
        : t(`No prendió en Saffire-II hasta ${nf(vd.hi, 1)} % de O₂; por encima no hay ensayos.`, `It did not ignite in Saffire-II up to ${nf(vd.hi, 1, true)} % O₂; above that there are no tests.`);
    const ex = vd.ex ? ` ⚠️ <i>${t('Extrapolado: fuera de lo que ensayó la NASA (gravedad, presión u oxígeno).', 'Extrapolated: outside what NASA tested (gravity, pressure or oxygen).')}</i>` : '';
    const burnsHere = vd.st !== 'safe';
    const tl = r.t425.none[0], tlPlan = r.t425.plan[0];
    const act = s.phase === 'splash' ? t('abrir la toma de aire exterior y salir de la cápsula', 'open the outside air vent and leave the capsule')
      : r.ventWorks ? t('cortar la ventilación y la corriente: en 0 g y con menos de 30 % de O₂ la llama se ahoga sola (BASS-II)', 'cut ventilation and power: in 0 g and below 30 % O₂ the flame smothers itself (BASS-II)')
        : s.o2 >= 30 ? t('extintor ya: con 30 % de O₂ o más, cortar el aire no basta', 'extinguisher now: at 30 % O₂ or more, cutting the air is not enough')
          : t('cortar la ventilación y usar el extintor: con gravedad el aire sube solo y sigue alimentando la llama', 'cut ventilation and use the extinguisher: with gravity the air rises by itself and keeps feeding the flame');
    const mask = tl != null && tl < 600 ? t(' Mascarillas con el primer aviso: el CO llega pronto al límite.', ' Masks at the first alarm: CO reaches the limit soon.') : '';
    const evac = (preset === 'moon' || preset === 'mars') && s.o2 >= 30 ? t(' Preparar la evacuación del hábitat (BRE, Zayac 2024).', ' Prepare to evacuate the habitat (BRE, Zayac 2024).') : '';

    // Lo primero, lo que se ha preguntado
    const ansBurn = `${ST}${burnsHere ? '' : '.'}`;
    const ansTime = burnsHere && tl == null ? t(`El CO no llega al límite de 1 hora (${SMAC_CO} ppm) en 30 minutos: la cabina es grande y diluye el humo.`, `CO does not reach the 1-hour limit (${SMAC_CO} ppm) within 30 minutes: the cabin is large and dilutes the smoke.`) : burnsHere ? t(`El CO llega al límite de 1 hora (${SMAC_CO} ppm) en ${mmss(tl, EN)} en el peor caso, y en ${mmss(r.t425.none[1], EN)} en el mejor.`, `CO reaches the 1-hour limit (${SMAC_CO} ppm) in ${mmss(tl, true)} in the worst case, and in ${mmss(r.t425.none[1], true)} in the best.`) : t('Sin fuego no corre el reloj del CO.', 'With no fire there is no CO clock.');
    const ansTodo = burnsHere ? t(`Lo primero: ${act}.${mask}${evac}`, `First: ${act}.${mask}${evac}`) : t('Nada urgente: vigilar y no subir el oxígeno.', 'Nothing urgent: monitor and do not raise the oxygen.');
    direct = it.todo ? ansTodo : it.time ? (burnsHere ? `${ansTime}` : ansTime) : burnsHere ? `${ansBurn}. ${ansTime}` : ansBurn;

    blocks.push(`<p class="small dim">${where}${assumed.length ? ` · ${t('suponiendo', 'assuming')} ${assumed.join(t(' y ', ' and '))}` : ''}</p>
      <ol class="pn-sa">
        <li><b>${t('¿Arde?', 'Does it burn?')}</b> ${ST}. ${why}${ex}</li>
        <li><b>${t('¿Cuánto tiempo hay?', 'How much time?')}</b> ${burnsHere ? `${t('Primer aviso a los', 'First warning at')} ${mmss(r.tDet, EN)}. ${ansTime}${tlPlan == null && tl != null ? ' ' + t('Con el plan a tiempo no se llega al límite.', 'With the plan on time the limit is not reached.') : ''} ${t('Calibrado con los fuegos reales de Saffire VI.', 'Calibrated with the real Saffire VI fires.')}` : ansTime}</li>
        <li><b>${t('¿Qué hacer?', 'What to do?')}</b> ${ansTodo}</li>
      </ol>`);
    scenario = { preset, mat: s.mat, size: s.size, ...(P.o2 != null ? { o2: s.o2 } : {}), ...(P.p != null ? { p: s.p } : {}) };
    text.push(`[Cálculo del Fire Twin para ${where}, material ${M.es}] ${ST}. ${why.replace(/<[^>]+>/g, '')} ${vd.ex ? 'EXTRAPOLADO.' : 'Dentro de lo ensayado.'} Primer aviso ${mmss(r.tDet)}; CO al límite de 425 ppm en ${mmss(tl)} (peor) / ${mmss(r.t425.none[1])} (mejor); con el plan: ${mmss(tlPlan)}. Acción: ${act}.${mask}${evac}`);
  }

  // ---- Detectores
  else if (it.detect || (it.co && !it.why)) {
    const preset = P.preset || 'iss', s = { ...PRESETS[preset], preset, mat: 'sibal', size: 'saffire', delay: 60, cpm: false };
    const a = simulate(s), b = simulate({ ...s, cpm: true });
    direct = t('En microgravedad el humo no sube al techo: el detector tiene que estar donde lo lleve la ventilación, y un sensor de CO o de partículas sensible avisa antes.',
      'In microgravity smoke does not rise to the ceiling: the detector has to be where the ventilation carries it, and a sensitive CO or particle sensor warns earlier.');
    blocks.push(`<p>${t(`Las partículas del humo en 0 g son distintas (más grandes y con otra forma): por eso la NASA probó los detectores con humo real en órbita (SAME, SAME-2) y en Saffire. En ${PRESETS[preset].es}, con nuestro motor, el primer aviso llega a los <b>${mmss(a.tDet)}</b>; con un sensor sensible de CO o partículas, a los <b>${mmss(b.tDet)}</b>.`,
      `Smoke particles in 0 g are different (larger and shaped differently): that is why NASA tested detectors with real smoke in orbit (SAME, SAME-2) and in Saffire. In ${PRESETS[preset].en}, with our engine, the first warning arrives at <b>${mmss(a.tDet, true)}</b>; with a sensitive CO or particle sensor, at <b>${mmss(b.tDet, true)}</b>.`)}</p>
      <p><a href="#pn-3">${t('Ficha de diseño: detectores y CO →', 'Design card: detectors and CO →')}</a></p>`);
    scenario = { preset, mat: 'sibal', size: 'saffire' };
  }

  // ---- Por qué el fuego es distinto en el espacio
  else if (it.why) {
    direct = t('Porque sin gravedad el aire caliente no sube: la llama no tiene lenguas, es una burbuja azul que se alimenta solo del aire que le llega, y por eso la ventilación decide si vive o se apaga.',
      'Because without gravity hot air does not rise: the flame has no tongues, it is a blue bubble fed only by the air that reaches it, so ventilation decides whether it lives or dies.');
    blocks.push(`<p>${t(`En ${PSI('PSI-25', 'BASS-II')} las llamas de acrílico se apagaban al quitar el aire con 15–22 % de O₂, cosa que en la Tierra no pasa. En Saffire, fuegos grandes en naves Cygnus vacías mostraron que avanzan despacio pero llenan de CO una cabina pequeña en minutos. Y con más oxígeno y menos presión, como en las atmósferas de exploración, todo arde más rápido (${PSI('PSI-69', 'FLEX')}).`,
      `In ${PSI('PSI-25', 'BASS-II')} acrylic flames went out when the air was removed at 15–22 % O₂, which does not happen on Earth. In Saffire, large fires in empty Cygnus vehicles showed they spread slowly but fill a small cabin with CO in minutes. And with more oxygen and lower pressure, as in exploration atmospheres, everything burns faster (${PSI('PSI-69', 'FLEX')}).`)}</p>`);
  }

  // ---- El modelo
  else if (it.model) {
    direct = t(`Astale entrena su propio modelo en el navegador: con las 257 gotas de FLEX predice la velocidad de combustión con R² 0,70 (±0,049 mm²/s) y si la llama se apaga sola con un 84 % de aciertos; el límite de oxígeno de BASS-II, con ±${nf(ML.mae, 1)} puntos.`,
      `Astale trains its own model in the browser: with the 257 FLEX droplets it predicts burning rate with R² 0.70 (±0.049 mm²/s) and whether the flame goes out by itself with 84 % accuracy; the BASS-II oxygen limit, within ±${nf(ML.mae, 1, true)} points.`);
    blocks.push(`<p>${t('Es un ensemble (XGBoost 40 %, CatBoost 40 %, bosque aleatorio 10 %, lineal 10 %), comprobado con validación cruzada en 5 bloques. Fuera de lo ensayado (más de 34 % de O₂ o fuera de 0,7–1 atm) avisa de que extrapola.', 'It is an ensemble (XGBoost 40 %, CatBoost 40 %, random forest 10 %, linear 10 %), checked with 5-fold cross-validation. Outside what was tested (above 34 % O₂ or outside 0.7–1 atm) it warns that it is extrapolating.')}</p>
      <p><a href="#pn-model">${t('Ver el modelo y su documentación →', 'See the model and its documentation →')}</a></p>`);
  }

  if (direct) text.unshift('[Respuesta directa del panel] ' + direct.replace(/<[^>]+>/g, ''));
  const html = direct ? `<p class="pn-direct">${direct}</p>${blocks.join('')}${scenario ? `<p><a href="#pn-twin" class="pn-sa-try" data-sc='${esc(JSON.stringify(scenario))}'>🔥 ${t('Verlo en el Fire Twin →', 'See it in the Fire Twin →')}</a></p>` : ''}` : '';
  return { html, text: text.join('\n'), scenario, direct, parsed: P };
}
