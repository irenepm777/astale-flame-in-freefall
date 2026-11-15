// ─────────────────────────────────────────────────────────────────────────────
// data.js - Los datos y constantes del Fire Twin: lo medido por la NASA y los escenarios
//
// REGLA DEL TWIN: inventar lo mínimo. Todo lo que hay aquí sale de experimentos de la NASA
// (PSI: BASS-II, FLEX, Saffire) o de sus informes (NTRS), con su fuente. Los supuestos nuestros
// están aparte, juntos, en engine.js (ASSUME).
//
// Contenido, por orden:
//   1. BASS2        41 ensayos reales: a qué % de oxígeno se apagó la llama
//   2. ML, pBurn    nuestro modelo de aprendizaje automático (regresión logística) sobre BASS-II
//   3. FLEX_FIT     recta que ajusta la velocidad de combustión de gotas de heptano (FLEX)
//   4. CO_LOAD, SPREAD, SMAC_CO   cifras de los fuegos de Saffire (CO, velocidad de propagación, límite de CO)
//   5. MAT          materiales que se pueden elegir y qué se midió de cada uno
//   6. SIZE         tamaños del fuego
//   7. PRESETS      escenarios: nave + fase de la misión (atmósfera, volumen, gravedad…)
// ─────────────────────────────────────────────────────────────────────────────

// BASS-II: O₂ (%) al que se apagó la llama al diluir con N₂, 1 atm, aire lento. s = placa, r = varilla.
export const BASS2 = [['s', 21.2], ['s', 19.7], ['s', 19.8], ['s', 19], ['s', 20.7], ['s', 18.2], ['s', 18.6], ['s', 18.5], ['s', 20.4], ['s', 19], ['s', 21.6], ['s', 20], ['s', 17.1], ['s', 16.8], ['s', 17.4], ['s', 17.4],
  ['r', 13.6], ['r', 14.2], ['r', 16], ['r', 16.1], ['r', 14.8], ['r', 14.6], ['r', 15.3], ['r', 15.6], ['r', 14.3], ['r', 14.5], ['r', 14.6], ['r', 15.9], ['r', 16.8], ['r', 17.1], ['r', 17.6], ['r', 16.4],
  ['r', 16.8], ['r', 19.1], ['r', 17.4], ['r', 19], ['r', 16.7], ['r', 18.2], ['r', 17], ['r', 17.5], ['r', 20.2]];
const ext = (k) => BASS2.filter((x) => x[0] === k).map((x) => x[1]);

// FLEX: ley d² ajustada por mínimos cuadrados (sin diluyentes): K = a + b·O₂ + c·p  (mm²/s; O₂ en fracción, p en atm)
// Super-Intelligence · aprendizaje automático: regresión logística entrenada con 82 observaciones de 41 ensayos de BASS-II
// (cada ensayo: la llama ardía con o2_start y se apagó con o2_end). z = w0 + w1·(O₂ − 18) + w2·placa.
// Validación dejando un ensayo fuera: el O₂ al 50 % se equivoca ±1,4 puntos (igual que la media; lo que añade es la probabilidad).
export const ML = { w: [0.491, 0.415, -1.230], n: 82, tests: 41, mae: 1.4 };
export const pBurn = (o2, slab) => 1 / (1 + Math.exp(-(ML.w[0] + ML.w[1] * (o2 - 18) + ML.w[2] * (slab ? 1 : 0))));
export const FLEX_FIT = { heptane: [0.013, 1.842, 0.170], n: 41, mae: 0.105, o2: [0.13, 0.34], p: [0.70, 1.02] };
export const kHept = (o2, p) => FLEX_FIT.heptane[0] + FLEX_FIT.heptane[1] * o2 + FLEX_FIT.heptane[2] * p;

// Saffire: CO en el aire lejano de la Cygnus (17–19 m³) tras un fuego de 1,5–3,2 kW → «carga de CO» en ppm·m³
export const CO_LOAD = [1390 * 17, 2360 * 19]; // 23.630 – 44.840 ppm·m³
export const SPREAD = [0.6, 2.6]; // mm/s, Saffire-II con aire a 20 cm/s
export const SMAC_CO = 425; // ppm, límite de 1 hora citado en Saffire (ICES 2024)

/* ============================================================ MATERIALES */
export const MAT = {
  sibal: { photo: 'nasa/jsc2023e046375.jpg', photoCap: { es: 'Tela ardiendo en Saffire-IV, a bordo de una Cygnus', en: 'Fabric burning in Saffire-IV, aboard a Cygnus' }, es: 'Tela de algodón y fibra de vidrio (SIBAL)', en: 'Cotton–fiberglass fabric (SIBAL)', kind: 'burns', tested: [21.5, 22.1], src: ['saffire2', 'saffire6'] },
  pmma_s: { photo: 'nasa/iss040e072900.jpg', photoCap: { es: 'Placa de acrílico ardiendo en BASS-II (ISS)', en: 'Acrylic plate burning in BASS-II (ISS)' }, es: 'Placa de acrílico (PMMA)', en: 'Acrylic plate (PMMA)', kind: 'limit', band: ext('s'), g1: 17.4, src: ['bass2', 'saffire6'] },
  pmma_r: { photo: 'nasa/jsc2024e053516.jpg', photoCap: { es: 'Varilla de plexiglás ardiendo en microgravedad', en: 'Plexiglass rod burning in microgravity' }, es: 'Varilla de acrílico (PMMA)', en: 'Acrylic rod (PMMA)', kind: 'limit', band: ext('r'), g1: 17.4, src: ['bass2'] },
  nomex: { es: 'Tela Nomex (trajes, bolsas)', en: 'Nomex fabric (suits, bags)', kind: 'noign', tested: [22.1, 22.1], src: ['saffire2'] },
  silicone: { es: 'Silicona (juntas, cables)', en: 'Silicone (seals, cables)', kind: 'noign', tested: [21.5, 22.1], src: ['saffire2'] },
};
export const SIZE = {
  small: { es: 'Pequeño: tira de 5 × 30 cm (tamaño del ensayo NASA-STD-6001)', en: 'Small: 5 × 30 cm strip (NASA-STD-6001 test size)', area: 150, len: 300 },
  saffire: { es: 'Como Saffire VI: 41 × 50 cm (1,5–3,2 kW)', en: 'Like Saffire VI: 41 × 50 cm (1.5–3.2 kW)', area: 2050, len: 500 },
  large: { es: 'Grande: 41 × 100 cm (el doble que Saffire)', en: 'Large: 41 × 100 cm (twice Saffire)', area: 4100, len: 1000 },
};

/* ============================================================ ESCENARIOS (nave + fase) */
export const PRESETS = {
  iss: { es: 'ISS · en órbita', en: 'ISS · in orbit', g: 0, V: 388, o2: 21, p: 1, u: 10, phase: 'orbit' },
  orion: { es: 'Orion · crucero', en: 'Orion · cruise', g: 0, V: 9, o2: 21, p: 1, u: 10, phase: 'orbit' },
  orion_eva: { es: 'Orion · atmósfera de exploración (antes de un paseo)', en: 'Orion · exploration atmosphere (before an EVA)', g: 0, V: 9, o2: 26.5, p: 0.69, u: 10, phase: 'eva' },
  reentry: { es: 'Orion · reentrada (varias g)', en: 'Orion · re-entry (several g)', g: 1, V: 9, o2: 25.6, p: 1, u: 10, phase: 'reentry' },
  splash: { es: 'Cápsula tras amerizar', en: 'Capsule after splashdown', g: 1, V: 9, o2: 21, p: 1, u: 0, phase: 'splash' },
  moon: { es: 'Hábitat en la Luna', en: 'Lunar habitat', g: 0.16, V: 30, o2: 34, p: 0.56, u: 10, phase: 'surface' },
  mars: { es: 'Hábitat en Marte', en: 'Mars habitat', g: 0.38, V: 30, o2: 34, p: 0.56, u: 10, phase: 'surface' },
};
