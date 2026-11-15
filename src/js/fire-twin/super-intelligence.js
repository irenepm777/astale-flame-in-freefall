// ─────────────────────────────────────────────────────────────────────────────
// super-intelligence.js - Tarjeta «Dónde está la Super-Intelligence» del Fire Twin
//
// Explica qué parte del producto es Super-Intelligence:
//   1. Conocimiento extraído: resúmenes de las 24 investigaciones de PSI
//   2. Aprendizaje automático: la regresión logística entrenada con BASS-II (ML.n observaciones)
//   3. Sistema experto: la tarjeta de acción, con reglas sacadas de resultados de la NASA
// Devuelve el HTML de la tarjeta en español o inglés.
// ─────────────────────────────────────────────────────────────────────────────

export function tarjetaSuperIntelligence(EN, ML) {
  return EN ? `<h3>Where the Super-Intelligence is</h3>
  <ol class="ft-si-list">
    <li><b>Extracted knowledge.</b> Super-Intelligence read the 24 PSI combustion investigations and their papers, and wrote the summaries, the classification by pillar and the safety reading of the <a href="#dashboard">experiment library</a>. The team reviewed it; the official data are untouched.</li>
    <li><b>Machine learning.</b> A model trained on ${ML.n} BASS-II observations gives the chance that a flame keeps burning, with its error measured on hidden tests.</li>
    <li><b>Expert system.</b> The action card: rules taken from NASA results (BASS-II, BRE, FLEX, Saffire), each with its source.</li>
  </ol>
  <p class="small dim">No pay-per-use: everything runs in the browser, and the same scenario always gives the same answer, traceable to its source.</p>`
  : `<h3>Dónde está la Super-Intelligence</h3>
  <ol class="ft-si-list">
    <li><b>Conocimiento extraído.</b> La Super-Intelligence leyó las 24 investigaciones de combustión de PSI y sus artículos, y escribió los resúmenes, la clasificación por pilar y la lectura de seguridad de la <a href="#dashboard">base de experimentos</a>. Lo revisó el equipo; los datos oficiales no se tocan.</li>
    <li><b>Aprendizaje automático.</b> Un modelo entrenado con ${ML.n} observaciones de BASS-II da la probabilidad de que una llama siga ardiendo, con su error medido en ensayos escondidos.</li>
    <li><b>Sistema experto.</b> La tarjeta de acción: reglas sacadas de resultados de la NASA (BASS-II, BRE, FLEX, Saffire), cada una con su fuente.</li>
  </ol>
  <p class="small dim">Sin pago por uso: todo se calcula en el navegador y el mismo escenario da siempre la misma respuesta, con su fuente.</p>`;
}
