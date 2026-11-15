// Panel: la pantalla que responde, punto por punto, a lo que pide el reto «Flame in Freefall».
//  1. Investigaciones más relevantes para la seguridad de entornos habitados (clasificación por misión)
//  2. Datos útiles para modelos predictivos (descargas, modelos ajustados, mapa de huecos)
//  3. Diseño de equipos y controles de nueva generación (fichas de diseño con número y fuente)
//  4. Aplicaciones en la Tierra (niebla de agua, detectores, bomberos, salas con oxígeno)
//  + «Pregúntale al panel»: búsqueda gratis sobre nuestros datos, o Claude con la suscripción de quien lo use (puente local).
//
// CÓMO ESTÁ ORGANIZADO:
//   · Este archivo monta la pantalla (mountPanel): textos, fichas de diseño (DESIGN), aplicaciones en la Tierra (EARTH),
//     descargas de datos (DATASETS), clasificación de investigaciones, pestañas y el chat flotante «Pregunta a Astale».
//   · panel/buscador.js     El motor que responde sin Claude (búsqueda de texto + cálculos + respuestas calculadas)
//   · panel/mapa-huecos.js  El mapa de huecos (oxígeno × presión) y «Cómo rellenamos los huecos»
//   · panel/enlaces.js      Direcciones: puente a Claude, fichas de PSI e informes de NTRS
//   · Los números de las fichas se CALCULAN con los modelos del Fire Twin (fire-twin/index.js), no se escriben a mano.
//
// NOMBRES CORTOS: t(es, en) elige el texto según el idioma | nf() formatea números | esc() protege el HTML |
//   INV = las 24 investigaciones de PSI con nuestra capa | root = el elemento donde se monta el Panel.
import { ML, FLEX_FIT, kHept, CO_LOAD, SMAC_CO, SPREAD } from '../fire-twin/index.js';
import { mountModel } from './model-block.js';
import { crearBuscador } from './search.js';
import { crearMapaHuecos } from './gap-map.js';
import { BRIDGE, PSI_URL, NTRS } from './links.js';

export function mountPanel(root, ctx) {
  if (!root) return;
  const { LANG, INV, SCENARIOS, PILLARS, score, scoreTip, covers, stateName, decorate } = ctx;
  const EN = LANG === 'en';
  const t = (es, en) => (EN ? en : es);
  const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
  const nf = (v, d = 0) => v.toLocaleString(LANG, { minimumFractionDigits: d, maximumFractionDigits: d });
  const src = (label, url) => `<a href="${url}" target="_blank" rel="noopener">${esc(label)}</a>`;

  /* ---------------------------------------------------------------- números calculados (no escritos a mano) */
  const K21 = kHept(0.21, 1), K265 = kHept(0.265, 0.694), K34 = kHept(0.34, 0.558);
  const pct = (a, b) => Math.round((a / b - 1) * 100);
  const coOrion = CO_LOAD.map((x) => x / 9); // ppm en 9 m³ con el mismo fuego que Saffire VI
  const rods = INV.find((i) => i.id === 'PSI-25');
  const timeFab = [500 / SPREAD[1] / 60, 500 / SPREAD[0] / 60]; // min para recorrer 50 cm de tela

  /* ---------------------------------------------------------------- 3 · fichas de diseño */
  const DESIGN = [
    { ico: '🧪', img: 'nasa/iss040e072900.jpg', conf: 'high',
      title: t('Ensayar los materiales en microgravedad y con aire', 'Test materials in microgravity, with airflow'),
      big: '13,6 %', bigEn: '13.6 %',
      rule: t('Varillas de acrílico de BASS-II siguieron ardiendo hasta con 13,6 % de O₂ en 0 g y aire lento. El ensayo estándar (NASA-STD-6001, con gravedad) puede no ser conservador. Nomex y silicona gruesa no propagaron en Saffire-II (21,5–22 % O₂): buenos candidatos, pero sin datos con más oxígeno.',
        'BASS-II acrylic rods kept burning down to 13.6 % O₂ in 0 g with slow air. The standard test (NASA-STD-6001, under gravity) may not be conservative. Nomex and thick silicone did not spread in Saffire-II (21.5–22 % O₂): good candidates, but no data at higher oxygen.'),
      srcs: [['BASS-II', PSI_URL('PSI-25')], ['BASS', PSI_URL('PSI-26')], ['Saffire-II', PSI_URL('PSI-99')]] },
    { ico: '🌀', img: 'nasa/iss040e086481.jpg', conf: 'mid',
      title: t('Corte de ventilación rápido… que no basta con mucho O₂', 'Fast ventilation shut-off… not enough with high O₂'),
      big: '26,5–34 %', bigEn: '26.5–34 %',
      rule: t('En 0 g, sin corriente de aire la llama se ahoga cerca del límite: por eso cortar la ventilación es el primer paso en la ISS. Pero en BRE, con las atmósferas de exploración (26,5 % a 10,2 psi y 34 % a 8,2 psi) la llama siguió ardiendo sin ventilación: en esas naves hace falta extintor además del corte.',
        'In 0 g, without airflow the flame starves near its limit: that is why cutting ventilation is the first step on the ISS. But in BRE, with exploration atmospheres (26.5 % at 10.2 psi and 34 % at 8.2 psi) the flame kept burning without ventilation: those vehicles need an extinguisher as well as the shut-off.'),
      srcs: [['BRE', PSI_URL('PSI-20')], ["Sacksteder & T'ien 1993", NTRS('19930040901')]] },
    { ico: '💧', img: 'nasa/iss043e190395.jpg', conf: 'mid',
      title: t('Más O₂ y menos presión = arde más rápido', 'More O₂ and lower pressure = faster burning'),
      big: '+' + pct(K265, K21) + ' %',
      rule: t(`Con el ajuste de FLEX (K = 0,013 + 1,842·O₂ + 0,170·p, ±${nf(FLEX_FIT.mae, 2)} mm²/s), una gota de heptano arde un ${pct(K265, K21)} % más rápido con la atmósfera de preparación EVA (26,5 %, 0,69 atm) que con aire. Con la de Marte (34 %, 0,56 atm) sería un ${pct(K34, K21)} %, pero eso ya es extrapolar. Los tiempos de respuesta de los equipos deben acortarse en esas misiones.`,
        `With the FLEX fit (K = 0.013 + 1.842·O₂ + 0.170·p, ±${nf(FLEX_FIT.mae, 2)} mm²/s), a heptane droplet burns ${pct(K265, K21)} % faster in the EVA-prep atmosphere (26.5 %, 0.69 atm) than in air. In the Mars one (34 %, 0.56 atm) it would be ${pct(K34, K21)} %, but that is extrapolation. Equipment response times must shrink on those missions.`),
      srcs: [['FLEX', PSI_URL('PSI-69')], ['FLEX-2', PSI_URL('PSI-68')]] },
    { ico: '😷', img: 'nasa/jsc2023e046375.jpg', conf: 'mid',
      title: t('Sensor de CO y mascarillas desde el primer aviso', 'CO sensor and masks from the first alarm'),
      big: '×' + Math.round(coOrion[0] / SMAC_CO) + '–' + Math.round(coOrion[1] / SMAC_CO),
      rule: t(`Saffire VI (1,5–3,2 kW) dejó 1.390–2.360 ppm de CO en una Cygnus de 17–19 m³. El mismo fuego en una cápsula de 9 m³ como Orion daría ${nf(coOrion[0])}–${nf(coOrion[1])} ppm: de ${Math.round(coOrion[0] / SMAC_CO)} a ${Math.round(coOrion[1] / SMAC_CO)} veces el límite de 1 hora (${SMAC_CO} ppm). En naves pequeñas, el humo es el peligro aunque el fuego se apague pronto.`,
        `Saffire VI (1.5–3.2 kW) left 1,390–2,360 ppm of CO in a 17–19 m³ Cygnus. The same fire in a 9 m³ capsule like Orion would give ${nf(coOrion[0])}–${nf(coOrion[1])} ppm: ${Math.round(coOrion[0] / SMAC_CO)} to ${Math.round(coOrion[1] / SMAC_CO)} times the 1-hour limit (${SMAC_CO} ppm). In small vehicles, smoke is the danger even if the fire goes out quickly.`),
      srcs: [['Saffire VI (Urban 2024)', NTRS('20240002981')], ['Saffire, ICES 2024', 'https://ntrs.nasa.gov/api/citations/20240007488/downloads/Saffire%20ICES%202024%20Saffire%20presentation072124small.pdf']] },
    { ico: '📡', img: 'nasa/iss015e27411.jpg', conf: 'mid',
      title: t('Detectores probados con humo de microgravedad', 'Detectors tested with microgravity smoke'),
      big: nf(timeFab[0], 0) + '–' + nf(timeFab[1], 0) + ' min',
      rule: t(`En Saffire-II la llama avanzó 0,6–2,6 mm/s: una tela de 50 cm tarda ${nf(timeFab[0])}–${nf(timeFab[1])} minutos en arder entera. Hay tiempo, pero solo si se detecta pronto. SAME y SAME-R midieron que el humo en 0 g tiene otro tamaño de partícula: los detectores se deben calibrar con ese humo, y distinguirlo del polvo (DAFT; en la Luna habrá mucho).`,
        `In Saffire-II the flame advanced 0.6–2.6 mm/s: a 50 cm fabric takes ${nf(timeFab[0])}–${nf(timeFab[1])} minutes to burn completely. There is time, but only with early detection. SAME and SAME-R measured that 0 g smoke has a different particle size: detectors must be calibrated with that smoke, and tell it apart from dust (DAFT; the Moon will have plenty).`),
      srcs: [['SAME', PSI_URL('PSI-102')], ['SAME-R', PSI_URL('PSI-101')], ['DAFT', PSI_URL('PSI-47')], ['Saffire-II', PSI_URL('PSI-99')]] },
    { ico: '🔁', img: 'cfig-coolflame.jpg', conf: 'low',
      title: t('Vigilar la reignición después de apagar', 'Watch for re-ignition after extinguishing'),
      big: t('llama fría', 'cool flame'),
      rule: t('FLEX descubrió las «llamas frías»: el combustible sigue reaccionando, sin llama visible, después de apagarse. CFI y ACME CFI-G lo estudian. Un fuego que parece apagado puede reavivarse: el control debe seguir midiendo temperatura y gases un rato después, no solo mirar.',
        'FLEX discovered "cool flames": the fuel keeps reacting, with no visible flame, after going out. CFI and ACME CFI-G study it. A fire that looks out can flare up again: the controls must keep measuring temperature and gases for a while afterwards, not just look.'),
      srcs: [['FLEX', PSI_URL('PSI-69')], ['CFI', PSI_URL('PSI-39')], ['ACME CFI-G', PSI_URL('PSI-159')]] },
  ];
  const CONF = { high: t('confianza alta · medido', 'high confidence · measured'), mid: t('confianza media · medido + cálculo', 'medium confidence · measured + calculation'), low: t('confianza baja · cualitativo', 'low confidence · qualitative') };

  /* ---------------------------------------------------------------- 4 · en la Tierra */
  const EARTH = [
    { img: 'nasa/0100139.jpg', title: t('Extintores de niebla de agua', 'Water-mist extinguishers'),
      text: t('Gotas de agua muy finas apagan con poca agua y sin dañar equipos. El programa Water Mist de la NASA (Colorado School of Mines, STS-107) estudió en microgravedad qué tamaño de gota apaga mejor un frente de llama; FLEX aporta 258 gotas medidas para los modelos de evaporación. Útil en salas de servidores, barcos, trenes y museos.',
        'Very fine water droplets put fires out with little water and without damaging equipment. NASA\'s Water Mist program (Colorado School of Mines, STS-107) studied in microgravity which droplet size best stops a flame front; FLEX adds 258 measured droplets for evaporation models. Useful in server rooms, ships, trains and museums.'),
      srcs: [['Water Mist (NASA)', 'https://images.nasa.gov/details/0100139'], ['FLEX', PSI_URL('PSI-69')]] },
    { img: 'nasa/iss015e27411.jpg', title: t('Detectores de humo más listos', 'Smarter smoke detectors'),
      text: t('SAME midió el tamaño de las partículas de humo de los materiales de una nave. Ese conocimiento sirve para detectores que avisen antes y den menos falsas alarmas, distinguiendo humo de polvo o vapor (DAFT): cocinas, hospitales, aviones.',
        'SAME measured the size of smoke particles from spacecraft materials. That knowledge feeds detectors that warn earlier with fewer false alarms, telling smoke from dust or steam (DAFT): kitchens, hospitals, aircraft.'),
      srcs: [['SAME', PSI_URL('PSI-102')], ['DAFT', PSI_URL('PSI-47')]] },
    { img: 'nasa/KSC-2014-1647.jpg', title: t('Bomberos en espacios cerrados', 'Firefighters in enclosed spaces'),
      text: t('Saffire es la única prueba de un fuego grande en una nave real: cómo crece con aire lento, cuánto CO deja y cuánto sube la presión. Son las mismas preguntas de un incendio en un túnel, un submarino o un sótano con poca ventilación, donde el humo mata antes que las llamas.',
        'Saffire is the only test of a large fire in a real spacecraft: how it grows with slow air, how much CO it leaves and how much the pressure rises. Those are the same questions as a fire in a tunnel, a submarine or a poorly ventilated basement, where smoke kills before flames.'),
      srcs: [['Saffire', PSI_URL('PSI-98')], ['Saffire VI', NTRS('20240002981')]] },
    { img: 'nasa/iss040e023287.jpg', title: t('Salas con oxígeno enriquecido', 'Oxygen-enriched rooms'),
      text: t('Hospitales, cámaras hiperbáricas y pacientes con oxígeno en casa: con más O₂ todo arde más rápido y con más hollín (la llama amarilla de la foto). BRE demostró que con O₂ alto la llama sigue sin ventilación: cortar el aire no basta, hay que cortar el oxígeno.',
        'Hospitals, hyperbaric chambers and patients on home oxygen: with more O₂ everything burns faster and sootier (the yellow flame in the photo). BRE showed that with high O₂ the flame keeps going without ventilation: cutting the air is not enough, the oxygen must be cut.'),
      srcs: [['BRE', PSI_URL('PSI-20')], ['BASS-II', PSI_URL('PSI-25')]] },
  ];

  /* ---------------------------------------------------------------- 2 · datos y huecos */
  const DATASETS = [
    { f: 'psi_condiciones.csv', n: 'psi', title: t('Condiciones ensayadas en PSI', 'Conditions tested in PSI'), vars: 'O₂ %, atm, psi', from: t('24 investigaciones de combustión', '24 combustion investigations') },
    { f: 'flex_gotas.csv', n: 'flex', title: t('FLEX: gotas de combustible', 'FLEX: fuel droplets'), vars: t('combustible, O₂, presión, CO₂, He, d₀, K, tiempo', 'fuel, O₂, pressure, CO₂, He, d₀, K, time'), from: 'FLEX (PSI-69)' },
    { f: 'bass2_extincion.csv', n: 'bass', title: t('BASS-II: oxígeno de apagado', 'BASS-II: extinction oxygen'), vars: t('muestra, forma, aire, O₂ ardiendo, O₂ de apagado', 'sample, shape, air, O₂ burning, O₂ at extinction'), from: 'BASS-II (PSI-25)' },
    { f: 'saffire2_materiales.csv', n: 'saf', title: t('Saffire-II: materiales de cabina', 'Saffire-II: cabin materials'), vars: t('material, grosor, flujo, O₂, resultado', 'material, thickness, flow, O₂, result'), from: 'Saffire-II (PSI-99)' },
  ];
  const MODELS = [
    [t('¿Se apaga? (O₂ límite)', 'Does it go out? (O₂ limit)'), 'BASS-II', t('media por forma: placa / varilla', 'mean by shape: slab / rod'), '±1,3 / ±1,4 ' + t('puntos O₂', 'O₂ points')],
    [t('Probabilidad de que arda', 'Probability of burning'), 'BASS-II', t('regresión logística', 'logistic regression') + ` (${ML.n} obs.)`, '±' + nf(ML.mae, 1) + ' ' + t('puntos O₂', 'O₂ points')],
    [t('Velocidad de combustión', 'Burning rate'), 'FLEX', 'K = 0,013 + 1,842·O₂ + 0,170·p', '±' + nf(FLEX_FIT.mae, 2) + ' mm²/s'],
    [t('CO en la cabina', 'CO in the cabin'), 'Saffire VI', t('carga de CO ÷ volumen', 'CO load ÷ volume'), t('escalado (supuesto)', 'scaled (assumption)')],
  ];

  // Mapa de huecos y «Cómo rellenamos los huecos»: ver panel/mapa-huecos.js
  const { coverageSvg, gapCells, gapsBlock } = crearMapaHuecos({ INV, EN, t, nf, esc });

  /* ---------------------------------------------------------------- pintar */
  const head = (n, title, sub, img) => `<div class="pn-head">${img ? `<img src="assets/img/${img}" alt="" loading="lazy">` : ''}<div><span class="pn-num">${n}</span><h2>${title}</h2><p class="dim">${sub}</p></div></div>`;
  // Lo que antes era la «vista pública» (Fer, 14-11: un solo proyecto a presentar): portada arriba y «acerca de» abajo
  const WHY = EN ? [
    ['🔵', 'Flames are round and faint', 'Without buoyancy, oxygen only arrives by diffusion or ventilation: flames turn blue, round and sometimes almost invisible.'],
    ['💨', 'Smoke does not rise', 'It stays near the source and only travels with the ventilation. Switch the fans off and the smoke detector may never see it.'],
    ['🫁', 'The air is all there is', 'No windows to open: CO builds up in the cabin, and in a small capsule far sooner than in a station.'],
    ['🧪', 'More oxygen ahead', 'Exploration vehicles plan lower pressure and more oxygen (up to 34 %). Materials that are safe on Earth can burn there.'],
  ] : [
    ['🔵', 'Las llamas son redondas y tenues', 'Sin flotación el oxígeno solo llega por difusión o con la ventilación: la llama es azul, redonda y a veces casi invisible.'],
    ['💨', 'El humo no sube', 'Se queda junto al fuego y solo viaja con la ventilación. Si se apagan los ventiladores, el detector puede no verlo nunca.'],
    ['🫁', 'No hay más aire', 'No se puede abrir una ventana: el CO se acumula en la cabina, y en una cápsula pequeña mucho antes que en una estación.'],
    ['🧪', 'Más oxígeno en camino', 'Las naves de exploración llevarán menos presión y más oxígeno (hasta 34 %). Materiales seguros en la Tierra pueden arder allí.'],
  ];
  const TEAM = [['Fernando Constantino', t('producto y desarrollo', 'product and development')], ['José Luis Endrino', t('validación científica', 'scientific validation')],
    ['Álvaro', ''], ['Irene Pascual', ''], ['Iván', ''], ['José María Mallén', ''], ['Prof. Saurav Goel', t('consejero, ciencia de materiales', 'advisor, materials science')]];
  root.innerHTML = `
  <section class="pn-hero" style="background-image:linear-gradient(90deg, rgba(5,7,12,.92) 0%, rgba(5,7,12,.7) 45%, rgba(5,7,12,.1) 100%), url(assets/img/nasa/iss040e023287.jpg)">
    <p class="kicker">NASA Space Apps Challenge 2026 · Flame in Freefall</p>
    <h2>${t('¿Qué haría un fuego en tu nave?', 'What would a fire do in your spacecraft?')}</h2>
    <p>${t('Astale convierte los experimentos de combustión en microgravedad de la NASA en respuestas que una tripulación puede usar: <b>¿arde aquí?</b>, <b>¿cuánto tiempo hay?</b> y <b>¿qué hace cada uno?</b>, en la ISS, Orion o una base en la Luna o Marte. Y responde, punto por punto, a lo que pide el reto.',
      'Astale turns NASA microgravity combustion experiments into answers a crew can act on: <b>does it burn here?</b>, <b>how much time is there?</b> and <b>what does each person do?</b>, on the ISS, Orion or a base on the Moon or Mars. And it answers the challenge goals one by one.')}</p>
    <a class="pn-cta" href="#pn-twin">🔥 ${t('Probar el Fire Twin', 'Try the Fire Twin')} ↓</a>
    <span class="pn-credit">${t('Llama en la ISS: el amarillo es hollín incandescente', 'Flame on the ISS: the yellow is glowing soot')} · NASA</span>
  </section>
  <div class="pn-goals">
    ${[['🔥', 'Fire Twin: ' + t('predecir, avisar y actuar', 'predict, warn and act'), '#pn-twin'], ['★', 'Super-Intelligence: ' + t('pregúntale al panel', 'ask the dashboard'), '#pn-ask'], ['🧠', t('Nuestro modelo predictivo', 'Our predictive model'), '#pn-model'], [1, t('Investigaciones más relevantes', 'Most relevant investigations'), '#pn-1'], [2, t('Datos para modelos predictivos', 'Data for predictive models'), '#pn-2'],
      [3, t('Equipos y controles nuevos', 'Next-generation equipment and controls'), '#pn-3'], [4, t('Aplicaciones en la Tierra', 'Applications on Earth'), '#pn-4'],
      ].map(([n, l, h]) => `<a class="pn-goal" href="${h}"><span>${n}</span>${l}</a>`).join('')}
  </div>

  <section class="pn-block pn-twin" id="pn-twin">
    ${head('🔥', 'Fire Twin: ' + t('predecir, avisar y decir qué hacer', 'predict, warn and say what to do'),
      t('El corazón del panel: un gemelo digital del fuego que usa los datos y modelos de los puntos 1–3. Eliges nave, fase de la misión y qué empieza a arder, y responde <b>¿arde aquí?</b>, <b>¿cuánto tiempo hay?</b> (CO en la cabina minuto a minuto) y <b>¿qué hace cada persona?</b> (comandante, tripulante 2 y control en tierra), con la fuente de la NASA de cada número.',
        'The heart of the dashboard: a digital twin of fire that uses the data and models from goals 1–3. Pick a vehicle, a mission phase and what starts burning, and it answers <b>does it burn here?</b>, <b>how much time is there?</b> (cabin CO minute by minute) and <b>what does each person do?</b> (commander, crew member 2 and ground control), with the NASA source of every number.'), 'nasa/jsc2023e046375.jpg')}
    <div id="pn-twin-slot"></div>
  </section>

  <section class="pn-block pn-ask" id="pn-ask">
    ${head('★', t('Pregúntale al panel', 'Ask the dashboard'), t('Escribe una pregunta sobre fuego en una nave o un hábitat. Responde con los datos de PSI, los modelos y las fichas de diseño de esta página, citando de dónde sale cada cosa.', 'Ask a question about fire in a spacecraft or habitat. It answers from the PSI data, the models and the design cards on this page, citing where everything comes from.'), 'efield-blue.jpg')}
    <form class="pn-q"><input id="pn-q" type="text" autocomplete="off" placeholder="${t('Ej.: ¿arde una placa de acrílico en la Luna con 30 % de O₂?', 'E.g.: does an acrylic plate burn on the Moon at 30 % O₂?')}"><button type="submit">${t('Preguntar', 'Ask')}</button></form>
    <div class="pn-chips">${[
      t('¿Arde una placa de acrílico en la Luna con 30 % de O₂?', 'Does an acrylic plate burn on the Moon at 30 % O₂?'),
      t('¿Qué detector de humo sirve en microgravedad?', 'Which smoke detector works in microgravity?'),
      t('¿Basta con cortar la ventilación en Marte?', 'Is cutting ventilation enough on Mars?'),
      t('¿Cuánto CO deja un fuego en Orion?', 'How much CO does a fire leave in Orion?'),
      t('¿Qué datos sirven para modelar la combustión de gotas?', 'What data can model droplet burning?'),
    ].map((q) => `<button type="button" class="pn-chip">${esc(q)}</button>`).join('')}</div>
    <div class="pn-engine"><label><input type="checkbox" id="pn-claude"> ${t('Usar Claude con mi suscripción (en este ordenador)', 'Use Claude with my subscription (on this computer)')}</label> <span id="pn-status" class="dim small"></span></div>
    <div id="pn-answer" class="pn-answer" hidden></div>
  </section>

  <section class="pn-block pn-model" id="pn-model">
    ${head('🧠', t('Nuestro modelo predictivo: entrenado aquí con datos de la NASA, sin API', 'Our predictive model: trained right here on NASA data, no API'),
      t('Un ensemble de XGBoost, CatBoost, bosque aleatorio y regresión lineal se entrena en tu navegador con las 257 gotas de combustible que ardieron en la ISS (FLEX), junto a otros modelos de referencia. Se comparan con validación cruzada, se ve qué variables deciden y se puede predecir. Sin pagar por uso y con el mismo resultado cada vez.', 'An ensemble of XGBoost, CatBoost, random forest and linear regression is trained in your browser on the 257 fuel droplets that burned on the ISS (FLEX), alongside baseline models. They are compared with cross-validation, you see which variables decide, and you can predict. No pay-per-use, same result every time.'), 'nasa/iss043e190395.jpg')}
    <div id="pn-model-app"></div>
  </section>

  <section class="pn-block" id="pn-1">
    ${head(1, t('Identificar las investigaciones más relevantes para la seguridad de entornos habitados', 'Identify the investigations most relevant to the safety of inhabited environments'),
      t('Las 24 investigaciones de combustión de PSI ordenadas por relevancia 0–100 para la misión que elijas: lo que pide el reto (40) + el pilar de seguridad (40) + si hay ensayos con esa atmósfera (20).', 'The 24 PSI combustion investigations ranked 0–100 for the mission you choose: what the challenge asks (40) + the safety pillar (40) + whether there are tests in that atmosphere (20).'), 'nasa/iss040e088023.jpg')}
    <div class="pn-ctrl"><label>${t('Misión', 'Mission')} <select id="pn-sc">${SCENARIOS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select></label>
      <label>${t('Pilar', 'Pillar')} <select id="pn-pil"><option value="all">${t('Todos', 'All')}</option>${Object.entries(PILLARS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select></label>
      <span id="pn-scnote" class="dim small"></span></div>
    <ol id="pn-rank" class="pn-rank"></ol>
    <p class="small"><a href="#dashboard">${t('Ver las 24 con filtros y fichas completas →', 'See all 24 with filters and full cards →')}</a></p>
  </section>

  <section class="pn-block" id="pn-2">
    ${head(2, t('Extraer datos útiles para modelos predictivos de inflamabilidad e incendios', 'Extract data useful for predictive flammability and fire models'),
      t('Las tablas de ensayos de PSI, limpias y unificadas, listas para descargar; los modelos que ya hemos ajustado con ellas (con su error medido dejando un ensayo fuera); y dónde faltan datos.', 'The PSI test tables, cleaned and unified, ready to download; the models we have already fitted with them (with error measured leaving one test out); and where data is missing.'), 'nasa/jsc2024e053516.jpg')}
    <div class="pn-2col">
      <div>
        <h3>${t('Descargar (CSV, licencia CC0 de la NASA)', 'Download (CSV, NASA CC0 licence)')}</h3>
        <table class="pn-tbl"><tr><th>${t('Conjunto', 'Dataset')}</th><th>${t('Filas', 'Rows')}</th><th>${t('Variables', 'Variables')}</th><th></th></tr>
        ${DATASETS.map((d) => `<tr><td><b>${esc(d.title)}</b><br><span class="dim small">${esc(d.from)}</span></td><td class="pn-rows" data-f="${d.f}">…</td><td class="small">${esc(d.vars)}</td><td><a class="pn-dl" href="datasets/${d.f}" download>⬇ CSV</a></td></tr>`).join('')}
        </table>
        <h3>${t('Modelos ajustados con esos datos', 'Models fitted with that data')}</h3>
        <table class="pn-tbl"><tr><th>${t('Predice', 'Predicts')}</th><th>${t('Datos', 'Data')}</th><th>${t('Modelo', 'Model')}</th><th>${t('Error', 'Error')}</th></tr>
        ${MODELS.map((m) => `<tr>${m.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table>
        <p class="small dim">${t('Todos se usan en el', 'All are used in the')} <a href="#firetwin">Fire Twin</a>.</p>
      </div>
      <div>
        <h3>${t('Mapa de huecos: condiciones ensayadas por oxígeno y presión', 'Gap map: conditions tested by oxygen and pressure')}</h3>
        ${coverageSvg()}
        <p class="small">${t('Cada casilla cuenta las combinaciones de oxígeno y presión ensayadas en PSI (las 641 filas del primer CSV). Recuadro azul: atmósfera de misión con datos; rojo discontinuo: menos de 10. La base lunar es el gran hueco.', 'Each cell counts the oxygen–pressure combinations tested in PSI (the 641 rows of the first CSV). Blue frame: mission atmosphere with data; dashed red: fewer than 10. The lunar base is the big gap.')}
          ${gapCells.map(([l, n]) => `<b>${esc(l)}</b>: ${n}`).join(' · ')}.</p>
      </div>
    </div>
    <h3 class="pn-valh">✅ ${t('¿Cuánto aciertan los modelos? Validación dejando un ensayo fuera', 'How right are the models? Leave-one-out validation')}</h3>
    <p class="small dim">${t('Cada punto es un ensayo real de la NASA que el modelo <b>no vio</b> al ajustarse: se quita, se ajusta con el resto y se predice. Si el punto cae sobre la diagonal, el modelo acierta.', 'Each dot is a real NASA test the model <b>did not see</b> when fitted: it is removed, the model is fitted on the rest and then predicts it. Dots on the diagonal mean the model is right.')}</p>
    <div class="pn-val" id="pn-val"><p class="dim">…</p></div>
    ${gapsBlock()}
  </section>

  <section class="pn-block" id="pn-3">
    ${head(3, t('Destacar lo que ayude a diseñar equipos y controles de nueva generación', 'Highlight what helps design next-generation equipment and controls'),
      t('Seis reglas de diseño, cada una con su número, su fuente y cuánto nos fiamos de ella. Para ingenieros de naves y hábitats, no para la tripulación (lo de la tripulación está en la tarjeta de acción del Fire Twin).', 'Six design rules, each with its number, its source and how much we trust it. For vehicle and habitat engineers, not for the crew (the crew part is the Fire Twin action card).'), null)}
    <div class="pn-cards">${DESIGN.map((d) => `
      <article class="pn-card">
        <div class="pn-img" style="background-image:url(assets/img/${d.img})"><span class="pn-big">${esc(EN && d.bigEn ? d.bigEn : d.big)}</span></div>
        <div class="pn-body"><h3>${d.ico} ${esc(d.title)}</h3><p>${esc(d.rule)}</p>
          <p class="pn-src"><span class="pn-conf ${d.conf}">${CONF[d.conf]}</span> ${d.srcs.map(([l, u]) => src(l, u)).join(' · ')}</p></div>
      </article>`).join('')}</div>
  </section>

  <section class="pn-block" id="pn-4">
    ${head(4, t('Conectarlo con aplicaciones en la Tierra', 'Connect it to applications on Earth'),
      t('Lo que se aprende de un fuego en el espacio también salva vidas aquí.', 'What we learn from a fire in space also saves lives here.'), null)}
    <div class="pn-earth">${EARTH.map((e) => `
      <article class="pn-card"><div class="pn-img" style="background-image:url(assets/img/${e.img})"></div>
        <div class="pn-body"><h3>🌍 ${esc(e.title)}</h3><p>${esc(e.text)}</p><p class="pn-src">${e.srcs.map(([l, u]) => src(l, u)).join(' · ')} <span class="dim">· ${t('Foto', 'Photo')}: NASA</span></p></div></article>`).join('')}</div>
  </section>

  <section class="pn-block" id="pn-about">
    ${head('ℹ️', t('Por qué el fuego es distinto en el espacio, y quiénes somos', 'Why fire is different in space, and who we are'), t('El problema, los límites del panel, el equipo y cómo usamos la Super-Intelligence.', 'The problem, the limits of the dashboard, the team and how we use Super-Intelligence.'), null)}
    <div class="pn-why">
      <figure><img src="assets/img/nasa/vela-tierra-vs-espacio.jpg" alt="" loading="lazy"><figcaption class="small dim">${t('La misma vela en la Tierra (izquierda) y en microgravedad (derecha)', 'The same candle on Earth (left) and in microgravity (right)')} · NASA</figcaption></figure>
      <div class="pn-whycards">${WHY.map(([i, h, p]) => `<div class="pn-whyc"><b>${i} ${h}</b><p>${p}</p></div>`).join('')}</div>
    </div>
    <div class="pn-3col">
      <div><h3>${t('Lo que todavía no hace', 'What it does not do (yet)')}</h3><ul class="small">
        <li>${t('Es un modelo rápido para decidir, no una simulación completa: para eso la NASA usa modelos CFD de Saffire (Niehaus 2026).', 'It is a fast decision model, not a full simulation: for that NASA uses CFD models of Saffire (Niehaus 2026).')}</li>
        <li>${t('El crecimiento del CO y los tiempos de detección no están validados en una cabina tripulada: no hay datos abiertos.', 'CO growth and detection times are not validated in a crewed cabin: no open data exists.')}</li>
        <li>${t('La gravedad parcial (Luna, Marte) y las atmósferas de más de 23 % de O₂ se extrapolan, y siempre se avisa.', 'Partial gravity (Moon, Mars) and atmospheres above 23 % O₂ are extrapolated, and always flagged.')}</li>
        <li>${t('Baterías de litio y propelentes quedan fuera.', 'Lithium batteries and propellants are out of scope.')}</li></ul></div>
      <div><h3>${t('Uso de Super-Intelligence', 'Use of Super-Intelligence')}</h3><ul class="small">
        <li><b>${t('Conocimiento extraído', 'Extracted knowledge')}:</b> ${t('Claude leyó las 24 investigaciones de combustión de PSI y redactó resúmenes, clasificación y lectura de seguridad; el equipo los revisó y los datos oficiales no se tocan.', 'Claude read the 24 PSI combustion investigations and drafted summaries, classification and safety reading; the team reviewed them and the official data are untouched.')}</li>
        <li><b>${t('Modelos propios', 'Our own models')}:</b> ${t('un ensemble ponderado de XGBoost, CatBoost, bosque aleatorio y regresión lineal entrenado en el navegador con 257 gotas de FLEX (velocidad de combustión, R² 0,70; si la llama se apaga sola, 84 % de aciertos, AUC 0,89) y una regresión logística con 82 observaciones de BASS-II (±1,4 puntos de O₂). Sin API.', 'a weighted ensemble of XGBoost, CatBoost, random forest and linear regression trained in the browser on 257 FLEX droplets (burning rate, R² 0.70; whether the flame goes out by itself, 84 % accuracy, AUC 0.89) and a logistic regression on 82 BASS-II observations (±1.4 O₂ points). No API.')}</li>
        <li><b>${t('Sistema experto', 'Expert system')}:</b> ${t('las reglas de la tarjeta de acción, cada una con su fuente de la NASA.', 'the action-card rules, each with its NASA source.')}</li>
        <li><b>${t('Pregúntale al panel', 'Ask the dashboard')}:</b> ${t('Claude responde solo con los datos de esta página y cita la fuente.', 'Claude answers only from the data on this page and cites the source.')}</li></ul></div>
      <div><h3>${t('Equipo Astale', 'Team Astale')}</h3><p class="small dim">${t('Sevilla, España', 'Seville, Spain')}</p>
        <div class="pn-team">${TEAM.map(([n, r]) => `<span><b>${n}</b>${r ? ` · <i>${r}</i>` : ''}</span>`).join('')}</div></div>
    </div>
  </section>`;

  // Validación: se calcula aquí, en el navegador, con los mismos CSV que se descargan (nada escrito a mano)
  (async () => {
    const box = root.querySelector('#pn-val');
    try {
      const csv = async (f) => (await (await fetch('datasets/' + f)).text()).trim().split('\n').slice(1).map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '')));
      const bass = (await csv('bass2_extincion.csv')).map((r) => ({ g: r[2], y: +r[5] })).filter((r) => isFinite(r.y) && r.y > 0);
      const bassP = bass.map((r, i) => { const o = bass.filter((q, j) => j !== i && q.g === r.g); return [o.reduce((a, q) => a + q.y, 0) / o.length, r.y, r.g]; });
      const fl = (await csv('flex_gotas.csv')).filter((r) => /heptane/i.test(r[0]) && +r[3] === 0 && +r[4] === 0 && r[7] !== '').map((r) => ({ o: +r[1], p: +r[2], y: +r[7] }));
      const fit = (rows) => { // mínimos cuadrados K = a + b·O₂ + c·p (ecuaciones normales 3×3)
        const X = rows.map((r) => [1, r.o, r.p]);
        const M = [0, 1, 2].map((i) => [...[0, 1, 2].map((j) => X.reduce((s2, x) => s2 + x[i] * x[j], 0)), X.reduce((s2, x, k) => s2 + x[i] * rows[k].y, 0)]);
        for (let i = 0; i < 3; i++) { const p = M[i][i]; for (let j = i; j < 4; j++) M[i][j] /= p; for (let k = 0; k < 3; k++) if (k !== i) { const f = M[k][i]; for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j]; } }
        return M.map((r) => r[3]);
      };
      const flP = fl.map((r, i) => { const c = fit(fl.filter((_, j) => j !== i)); return [c[0] + c[1] * r.o + c[2] * r.p, r.y, r.o > 0.25 ? 'hi' : 'air']; });
      const mae = (P) => P.reduce((a, [p, y]) => a + Math.abs(p - y), 0) / P.length;
      const plot = (P, lo, hi, axX, axY, col, fmt) => {
        const W2 = 420, H2 = 300, L2 = 54, B2 = 44, T2 = 14, R2 = 14;
        const X = (v) => L2 + (v - lo) / (hi - lo) * (W2 - L2 - R2), Y = (v) => H2 - B2 - (v - lo) / (hi - lo) * (H2 - B2 - T2);
        let g = '<svg viewBox="0 0 ' + W2 + ' ' + H2 + '" class="pn-valsvg">';
        for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; g += '<line x1="' + L2 + '" x2="' + (W2 - R2) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="pn-grid"/><text x="' + (L2 - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="pn-ax">' + fmt(v) + '</text><text x="' + X(v) + '" y="' + (H2 - B2 + 16) + '" text-anchor="middle" class="pn-ax">' + fmt(v) + '</text>'; }
        g += '<line x1="' + X(lo) + '" y1="' + Y(lo) + '" x2="' + X(hi) + '" y2="' + Y(hi) + '" stroke="#4ade80" stroke-width="2" stroke-dasharray="6 4"/>';
        P.forEach(([p, y, k]) => (g += '<circle cx="' + X(p).toFixed(1) + '" cy="' + Y(y).toFixed(1) + '" r="5" fill="' + col[k] + '" fill-opacity=".8" stroke="#0b0f1c"/>'));
        g += '<text x="' + ((W2 + L2) / 2) + '" y="' + (H2 - 8) + '" text-anchor="middle" class="pn-axl">' + axX + '</text><text transform="translate(14 ' + ((H2 - B2) / 2) + ') rotate(-90)" text-anchor="middle" class="pn-axl">' + axY + '</text></svg>';
        return g;
      };
      const mB = mae(bassP), mF = mae(flP);
      box.innerHTML =
        '<figure><figcaption><b>BASS-II · ' + t('O₂ al que se apaga la llama', 'O₂ at which the flame goes out') + '</b> · ' + bass.length + ' ' + t('ensayos', 'tests') + ' · ' + t('error medio', 'mean error') + ' <b>±' + nf(mB, 1) + '</b> ' + t('puntos de O₂', 'O₂ points') + '</figcaption>' +
        plot(bassP, 13, 23, t('Predicho (%)', 'Predicted (%)'), t('Medido (%)', 'Measured (%)'), { slab: '#ff9a4a', rod: '#4fc3f7' }, (v) => nf(v, 0)) +
        '<p class="small dim">' + t('Naranja: placas · azul: varillas de acrílico. Las columnas muestran que el modelo da la media de cada forma: la dispersión entre ensayos iguales es el margen (±) que usa el Fire Twin.', 'Orange: slabs · blue: acrylic rods. The columns show that the model gives the mean for each shape: the scatter between identical tests is the margin (±) the Fire Twin uses.') + ' <a href="https://psi.nasa.gov/physci/repo/investigations/PSI-25" target="_blank" rel="noopener">PSI-25</a></p></figure>' +
        '<figure><figcaption><b>FLEX · ' + t('velocidad a la que arde una gota de heptano', 'burning rate of a heptane droplet') + '</b> · ' + fl.length + ' ' + t('gotas', 'droplets') + ' · ' + t('error medio', 'mean error') + ' <b>±' + nf(mF, 2) + '</b> mm²/s</figcaption>' +
        plot(flP, 0.4, 1.0, t('Predicho K (mm²/s)', 'Predicted K (mm²/s)'), t('Medido K (mm²/s)', 'Measured K (mm²/s)'), { air: '#4fc3f7', hi: '#ff9a4a' }, (v) => nf(v, 1)) +
        '<p class="small dim">' + t('Azul: aire normal · naranja: más de 25 % de O₂ (atmósferas de exploración).', 'Blue: normal air · orange: above 25 % O₂ (exploration atmospheres).') + ' <a href="https://psi.nasa.gov/physci/repo/investigations/PSI-69" target="_blank" rel="noopener">PSI-69</a></p></figure>' +
        '<div class="pn-valnote"><h4>' + t('Lo que todavía no está validado', 'What is not validated yet') + '</h4><p>' +
        t('El crecimiento del CO en una cabina con gente y el tiempo de detección: solo hay dos fuegos grandes medidos (Saffire VI) y el modelo se calibró con ellos, así que no sirven también para comprobarlo. La NASA tiene un modelo detallado (CFD) de esos fuegos, <a href="https://ntrs.nasa.gov/citations/20260001600" target="_blank" rel="noopener">Niehaus 2026</a>: es la siguiente comparación.',
          'CO growth in a crewed cabin and detection time: only two large fires have been measured (Saffire VI) and the model was calibrated with them, so they cannot also be used to check it. NASA has a detailed (CFD) model of those fires, <a href="https://ntrs.nasa.gov/citations/20260001600" target="_blank" rel="noopener">Niehaus 2026</a>: that is the next comparison.') +
        '</p><p>' + t('Revisión científica pendiente: José Luis Endrino y el Prof. Saurav Goel.', 'Scientific review pending: José Luis Endrino and Prof. Saurav Goel.') + '</p></div>';
      decorate(box);
    } catch (e) { box.innerHTML = '<p class="dim">' + esc(String(e)) + '</p>'; }
  })();

  // Filas reales de cada CSV (se cuentan al cargar, para no escribir números a mano)
  root.querySelectorAll('.pn-rows').forEach(async (td) => {
    try { const txt = await (await fetch('datasets/' + td.dataset.f)).text(); td.textContent = nf(txt.trim().split('\n').length - 1); } catch { td.textContent = '—'; }
  });

  /* ---------------------------------------------------------------- 1 · clasificación */
  // Las investigaciones sin foto propia llevan una foto real de la NASA de su tipo de combustible
  const FALLBACK = { 'sólido': 'nasa/iss035e015827.jpg', 'líquido': 'nasa/iss043e190395.jpg', gas: 'flamedesign-space.jpg', humo: 'nasa/iss015e27411.jpg' };
  const scSel = root.querySelector('#pn-sc'), pilSel = root.querySelector('#pn-pil');
  scSel.value = 'moon';
  function rank() {
    const sc = SCENARIOS.find((s) => s.id === scSel.value), pil = pilSel.value;
    root.querySelector('#pn-scnote').textContent = `O₂ ${sc.o2} % · ${sc.psi} psi — ${sc.note}`;
    const rows = INV.map((i) => ({ i, s: score(i, sc, pil) })).sort((a, b) => b.s - a.s).slice(0, 8);
    const COVER = [t('sin ensayos así', 'no tests like this'), t('cobertura parcial', 'partial coverage'), t('hay ensayos así', 'tested conditions')];
    root.querySelector('#pn-rank').innerHTML = rows.map(({ i, s }) => `
      <li><a href="#" data-inv="${i.id}" class="pn-row">
        <img src="assets/img/${i.img ? i.img + '.jpg' : FALLBACK[i.state] || 'nasa/iss035e015827.jpg'}" alt="" loading="lazy">
        <span class="pn-rt"><b>${esc(i.acr)}</b> <span class="dim small">${esc(i.id)} · ${esc(stateName(i.state || ''))} · ${COVER[covers(i, sc)]}</span><br><span class="small">${esc(i.find || i.title)}</span></span>
        <span class="pn-score" title="${esc(scoreTip(i, sc, pil))}"><i style="width:${s}%"></i><b>${s}</b></span></a></li>`).join('');
    decorate(root.querySelector('#pn-rank'));
  }
  scSel.addEventListener('change', rank); pilSel.addEventListener('change', rank);
  rank();
  mountModel(root.querySelector('#pn-model-app'), LANG, decorate);
  decorate(root);

  /* ---------------------------------------------------------------- ★ pregúntale al panel */
  const { search, compute, freeAnswer } = crearBuscador({ LANG, INV, SCENARIOS, DESIGN, EARTH, t, nf, esc });

  const qIn = root.querySelector('#pn-q'), thread = root.querySelector('#pn-answer'), useClaude = root.querySelector('#pn-claude'), stat = root.querySelector('#pn-status');
  let bridgeOk = false;
  async function probe() {
    stat.textContent = t('buscando el puente…', 'looking for the bridge…');
    try {
      const r = await fetch(BRIDGE + '/health', { signal: AbortSignal.timeout(1500) });
      bridgeOk = r.ok;
    } catch { bridgeOk = false; }
    stat.innerHTML = bridgeOk ? '🟢 ' + t('Claude conectado (tu suscripción, sin coste extra)', 'Claude connected (your subscription, no extra cost)')
      : '⚪ ' + t('No encuentro el puente. En este ordenador, abre <code>Super-Intelligence.cmd</code> de la carpeta astale y vuelve a marcar la casilla. Mientras, responde la búsqueda gratis.', 'Bridge not found. On this computer, open <code>Super-Intelligence.cmd</code> in the astale folder and tick the box again. Meanwhile, the free search answers.');
  }
  try { if (localStorage.getItem('astale-claude') === '1') { useClaude.checked = true; probe(); } } catch {}
  useClaude.addEventListener('change', () => {
    try { localStorage.setItem('astale-claude', useClaude.checked ? '1' : '0'); } catch {}
    if (useClaude.checked) probe(); else { bridgeOk = false; stat.textContent = ''; }
  });

  async function ask(q) {
    q = q.trim();
    if (!q) return;
    const free = freeAnswer(q);
    // Conversación: cada pregunta y su respuesta se van añadiendo, como en un chat
    thread.hidden = false;
    const qb = document.createElement('div'); qb.className = 'pn-msg-q'; qb.textContent = q;
    const ans = document.createElement('div'); ans.className = 'pn-msg-a';
    thread.append(qb, ans); qIn.value = '';
    thread.scrollTop = thread.scrollHeight;
    document.dispatchEvent(new CustomEvent('astale:event', { detail: { type: 'ask', q } }));
    const badge = (txt, cls) => `<p class="pn-badge ${cls}">${txt}</p>`;
    if (!(useClaude.checked && bridgeOk)) {
      ans.innerHTML = badge(free.smart ? '🧮 ' + t('Respuesta calculada por Astale con los datos de la NASA', 'Answer computed by Astale from NASA data') : '🔎 ' + t('Búsqueda en los datos del panel', 'Search over the dashboard data'), 'free') + free.html;
      decorate(ans);
      return;
    }
    ans.innerHTML = badge('🧠 ' + t('Super-Intelligence (Claude) pensando con los datos de la NASA…', 'Super-Intelligence (Claude) thinking with NASA data…'), 'si wait') + free.html;
    decorate(ans);
    // Contexto que se manda a Claude: lo encontrado + los cálculos + las fichas de diseño (todo con su fuente)
    const more = search(q + ' ' + q).slice(0, 4);
    const ctxDocs = [...new Set([...free.hits, ...more])].slice(0, 6);
    const context = [
      ...free.calc.map((c) => (c.startsWith('[') ? c : '[Cálculo del panel] ' + c)),
      ...ctxDocs.map((d) => `[${d.title}] ${d.text}`),
      ...DESIGN.map((d) => `[${t('Ficha de diseño', 'Design card')}: ${d.title} — ${t('fuentes', 'sources')}: ${d.srcs.map((x) => x[0]).join(', ')}] ${d.rule}`),
    ].join('\n');
    try {
      const r = await fetch(BRIDGE + '/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, lang: LANG, context }), signal: AbortSignal.timeout(120000) });
      const j = await r.json();
      if (!r.ok || !j.answer) throw new Error(j.error || 'error');
      const body = esc(j.answer).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
      ans.innerHTML = badge('🧠 ' + t('Super-Intelligence (Claude, con tu suscripción) · solo con los datos de abajo', 'Super-Intelligence (Claude, with your subscription) · only from the data below'), 'si') +
        `<div class="pn-si">${body}</div><details><summary>${t('Fuentes que ha leído', 'Sources it read')}</summary>${free.html}</details>`;
    } catch (e) {
      ans.innerHTML = badge('⚠️ ' + t('Claude no ha respondido (', 'Claude did not answer (') + esc(String(e.message || e).slice(0, 120)) + t('). Respuesta de la búsqueda gratis:', '). Free search answer:'), 'free') + free.html;
    }
    decorate(ans);
    thread.scrollTop = thread.scrollHeight;
  }
  root.querySelector('.pn-q').addEventListener('submit', (e) => { e.preventDefault(); ask(qIn.value); });
  root.querySelectorAll('.pn-chip').forEach((b) => b.addEventListener('click', () => { qIn.value = b.textContent; ask(b.textContent); }));

  /* ---------------- Pestañas */
  const TABS = [
    ['pn-home', '🏠', t('Inicio', 'Overview'), t('Qué es y qué responde', 'What it is and what it answers')],
    ['pn-twin', '🔥', 'Fire Twin', t('Simula un fuego en tu nave', 'Simulate a fire in your vehicle')],
    ['pn-model', '🧠', t('Modelo', 'Model'), t('Entrena y predice con datos de la NASA', 'Train and predict on NASA data')],
    ['pn-1', '🔭', t('Investigaciones', 'Investigations'), t('Las más relevantes para tu misión', 'The most relevant for your mission')],
    ['pn-2', '📊', t('Datos', 'Data'), t('Descargas, huecos y validación', 'Downloads, gaps and validation')],
    ['pn-3', '🛠️', t('Diseño', 'Design'), t('Reglas para equipos y controles', 'Rules for equipment and controls')],
    ['pn-4', '🌍', t('En la Tierra', 'On Earth'), t('Lo que sirve aquí', 'What is useful here')],
    ['pn-about', 'ℹ️', t('Acerca de', 'About'), t('Equipo, límites y método', 'Team, limits and method')],
  ];
  // Inicio: la portada y un mapa de qué hay en cada pestaña, con los 4 puntos del reto
  const home = document.createElement('section');
  home.className = 'pn-block pn-homepane'; home.id = 'pn-home';
  home.append(root.querySelector('.pn-hero'));
  const GOALS = [[1, t('Identificar las investigaciones más relevantes para la seguridad de entornos habitados', 'Identify the investigations most relevant to the safety of inhabited environments'), 'pn-1'],
    [2, t('Extraer datos útiles para modelos predictivos de inflamabilidad e incendios', 'Extract data useful for predictive flammability and fire models'), 'pn-2'],
    [3, t('Destacar lo que ayude a diseñar equipos y controles de nueva generación', 'Highlight what helps design next-generation equipment and controls'), 'pn-3'],
    [4, t('Conectarlo con aplicaciones en la Tierra', 'Connect it to applications on Earth'), 'pn-4']];
  home.insertAdjacentHTML('beforeend', `
    <div class="pn-homegrid">
      ${TABS.slice(1).map(([id, ico, name, sub]) => `<a class="pn-hcard" href="#${id}"><span>${ico}</span><b>${name}</b><small>${sub}</small></a>`).join('')}
    </div>
    <h3 class="pn-goalh">${t('Lo que pide el reto «Flame in Freefall», y dónde está', 'What the "Flame in Freefall" challenge asks, and where it is')}</h3>
    <div class="pn-goallist">${GOALS.map(([n, txt, id]) => `<a href="#${id}"><span>${n}</span>${txt}<em>→ ${TABS.find((x) => x[0] === id)[2]}</em></a>`).join('')}
      <a href="#pn-model"><span>★</span>${t('Con Super-Intelligence: un modelo propio entrenado con datos de la NASA', 'Super-Intelligence-powered: our own model trained on NASA data')}<em>→ ${t('Modelo', 'Model')}</em></a></div>`);
  const bar = document.createElement('nav');
  bar.className = 'pn-tabs';
  bar.innerHTML = TABS.map(([id, ico, name]) => `<button type="button" data-pane="${id}"><span>${ico}</span>${name}</button>`).join('');
  const goalsOld = root.querySelector('.pn-goals');
  goalsOld.replaceWith(bar);
  bar.after(home);
  const panes = TABS.map(([id]) => root.querySelector('#' + id)).filter(Boolean);
  panes.forEach((p) => p.classList.add('pn-tabpane'));
  function panelTab(id, scroll = true) {
    const pane = root.querySelector('#' + id)?.closest('.pn-tabpane') || root.querySelector('#pn-home');
    panes.forEach((p) => p.classList.toggle('on', p === pane));
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.pane === pane.id));
    const target = root.querySelector('#' + id);
    if (scroll) (target && target !== pane ? target : bar).scrollIntoView({ behavior: 'smooth', block: 'start' });
    root.dispatchEvent(new CustomEvent('pn-tab', { detail: pane.id, bubbles: true }));
  }
  bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; panelTab(b.dataset.pane); try { history.replaceState(null, '', '#' + b.dataset.pane); } catch {} });
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#pn-"]'); if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const id = a.getAttribute('href').slice(1); panelTab(id); try { history.replaceState(null, '', '#' + id); } catch {}
  });
  window.__panelTab = panelTab;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.pn-sa-try'); if (!a) return;
    let sc = null; try { sc = JSON.parse(a.dataset.sc); } catch {}
    setTimeout(() => sc && window.__astaleTwin?.set(sc), 30);
  });
  root.querySelector('.pn-gaptry')?.addEventListener('click', () => setTimeout(() => window.__astaleTwin?.set({ preset: 'moon', mat: 'sibal', size: 'saffire' }), 30));

  /* ---------------- La IA siempre presente: chat flotante abajo a la derecha */
  const askSec = root.querySelector('#pn-ask');
  const dock = document.createElement('div');
  dock.className = 'ai-dock';
  dock.innerHTML = `<div class="ai-panel" hidden role="dialog" aria-label="${t('Pregunta a Astale', 'Ask Astale')}">
      <div class="ai-head"><span class="ai-orb">✦</span><div><b>${t('Pregunta a Astale', 'Ask Astale')}</b><small>${t('Responde con datos de la NASA y cita la fuente', 'Answers from NASA data and cites the source')}</small></div><button type="button" class="ai-x" aria-label="${t('Cerrar', 'Close')}">✕</button></div>
    </div>
    <button type="button" class="ai-fab"><span class="ai-orb">✦</span><span>${t('Pregunta a Astale', 'Ask Astale')}</span></button>`;
  const aiPanel = dock.querySelector('.ai-panel');
  thread.hidden = false;
  thread.innerHTML = `<div class="pn-msg-a pn-msg-hi">${t('Hola. Pregúntame por el fuego en una nave o un hábitat: si algo arde, cuánto tiempo hay, qué hacer o qué dicen los experimentos de la NASA.', 'Hi. Ask me about fire in a spacecraft or habitat: whether something burns, how much time there is, what to do or what NASA experiments say.')}</div>`;
  aiPanel.append(thread, askSec.querySelector('.pn-chips'), askSec.querySelector('.pn-q'));
  const eng = askSec.querySelector('.pn-engine'); if (eng) aiPanel.append(eng);
  askSec.remove();
  document.body.append(dock);
  const setOpen = (o) => { aiPanel.hidden = !o; dock.classList.toggle('open', o); if (o) setTimeout(() => qIn.focus(), 50); };
  dock.querySelector('.ai-fab').addEventListener('click', () => setOpen(aiPanel.hidden));
  dock.querySelector('.ai-x').addEventListener('click', () => setOpen(false));
  window.__openAsk = () => setOpen(true);
  root.addEventListener('click', (e) => { if (e.target.closest('a[href="#pn-ask"]')) { e.preventDefault(); e.stopImmediatePropagation(); setOpen(true); } }, true);
  panelTab('pn-home', false);

}
