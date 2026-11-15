// ─────────────────────────────────────────────────────────────────────────────
// gap-map.js - El mapa de huecos (qué condiciones han ensayado ya en la NASA) y «Cómo rellenamos los huecos»
//
// IDEA: la NASA ha ensayado mucho en aire normal (≈21 % de oxígeno, 1 atm) y casi nada en las atmósferas de
// exploración (más oxígeno, menos presión: Luna, Marte). El mapa cuenta cuántos ensayos de PSI hay en cada casilla
// «oxígeno × presión» y marca dónde caen las misiones reales. Donde casi no hay ensayos, hay un HUECO.
//   · coverageSvg()  el dibujo del mapa (casillas más naranjas = más ensayos; recuadro rojo discontinuo = hueco)
//   · gapCells       cuántos ensayos hay en la casilla de cada misión (ISS/Orion, preparación de EVA, Luna, Marte)
//   · gapsBlock()    el bloque que explica las 4 reglas con las que Astale responde donde no hay ensayos,
//                    con un ejemplo CALCULADO con el motor del Fire Twin (una tela ardiendo en la base lunar)
// Se crea con crearMapaHuecos(...) porque necesita las investigaciones (INV) y las ayudas de texto del Panel.
// ─────────────────────────────────────────────────────────────────────────────
import { simulate, PRESETS } from '../fire-twin/index.js';
import { PSI } from '../data/psi.js';

export function crearMapaHuecos({ INV, EN, t, nf, esc }) {
  // Mapa de cobertura: cuántos ensayos hay en cada casilla O₂ × presión, y dónde caen las atmósferas de misión
  const O2E = [0, 18, 23, 28, 32, 40, 60, 101], O2L = ['<18', '18–23', '23–28', '28–32', '32–40', '40–60', '>60'];
  const PE = [0, 0.4, 0.6, 0.8, 1.1, 2, 99], PL = ['<0,4', '0,4–0,6', '0,6–0,8', '0,8–1,1', '1,1–2', '>2'].map((s) => (EN ? s.replace(/,/g, '.') : s));
  const grid = PE.slice(1).map(() => O2E.slice(1).map(() => 0));
  const bin = (v, E) => E.findIndex((e, k) => k < E.length - 1 && v >= e && v < E[k + 1]);
  INV.forEach((i) => i.points.forEach(([o, p]) => { const a = bin(o, O2E), b = bin(p, PE); if (a >= 0 && b >= 0) grid[b][a]++; }));
  const MISS = [[t('ISS · Orion', 'ISS · Orion'), 21, 1], [t('Prep. EVA', 'EVA prep'), 26.5, 0.694], [t('Luna', 'Moon'), 30, 0.694], [t('Marte', 'Mars'), 34, 0.558]];
  function coverageSvg() {
    const cw = 92, ch = 46, L = 74, T = 10, W = L + cw * 7 + 10, H = T + ch * 6 + 44;
    const max = Math.max(...grid.flat());
    let s = `<svg viewBox="0 0 ${W} ${H}" class="pn-cov" role="img" aria-label="${t('Mapa de huecos', 'Gap map')}">`;
    for (let b = 0; b < 6; b++) for (let a = 0; a < 7; a++) {
      const n = grid[5 - b][a], x = L + a * cw, y = T + b * ch;
      const op = n ? 0.18 + 0.82 * Math.sqrt(n / max) : 0;
      s += `<rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="5" fill="${n ? `rgba(255,138,44,${op.toFixed(2)})` : 'var(--pn-empty)'}"/>`;
      s += `<text x="${x + cw / 2}" y="${y + ch / 2 + 5}" text-anchor="middle" class="pn-n">${n || '·'}</text>`;
    }
    O2L.forEach((l, a) => (s += `<text x="${L + a * cw + cw / 2}" y="${T + ch * 6 + 18}" text-anchor="middle" class="pn-ax">${l}</text>`));
    PL.slice().reverse().forEach((l, b) => (s += `<text x="${L - 8}" y="${T + b * ch + ch / 2 + 4}" text-anchor="end" class="pn-ax">${l}</text>`));
    s += `<text x="${L + cw * 3.5}" y="${H - 4}" text-anchor="middle" class="pn-axl">${t('Oxígeno (%)', 'Oxygen (%)')}</text>`;
    s += `<text transform="translate(12 ${T + ch * 3}) rotate(-90)" text-anchor="middle" class="pn-axl">${t('Presión (atm)', 'Pressure (atm)')}</text>`;
    MISS.forEach(([lab, o, p], k) => {
      const a = bin(o, O2E), b = 5 - bin(p, PE), x = L + a * cw, y = T + b * ch, n = grid[5 - b][a];
      s += `<rect x="${x + 3}" y="${y + 3}" width="${cw - 6}" height="${ch - 6}" rx="4" fill="none" stroke="${n < 10 ? '#ff4d4d' : '#3d7bff'}" stroke-width="3" ${n < 10 ? 'stroke-dasharray="6 4"' : ''}/>`;
      s += `<text x="${x + 8}" y="${y + 15 + (k === 3 ? 0 : 0)}" class="pn-ml">${lab}</text>`;
    });
    return s + '</svg>';
  }
  const gapCells = MISS.map(([lab, o, p]) => [lab, grid[bin(p, PE)][bin(o, O2E)]]);

  /* Cómo rellenamos los huecos: qué hace Astale donde no hay ensayos (Luna, Marte, mucho O₂) */
  function gapsBlock() {
    const s = { ...PRESETS.moon, preset: 'moon', mat: 'sibal', size: 'saffire', delay: 60, cpm: false }, r = simulate(s);
    const near = PSI.reduce((k, p) => k + p.points.filter(([o, a]) => Math.abs(o - s.o2) <= 2.5 && Math.abs(a - s.p) <= 0.1).length, 0);
    const mmss = (x) => (x == null ? t('no llega', 'not reached') : x < 90 ? Math.round(x) + ' s' : nf(x / 60, 1) + ' min');
    const RULES = [
      ['📏', t('Acotar entre lo medido', 'Bracket between what was measured'), t('No hay ensayos en gravedad parcial, pero sí en microgravedad (BASS-II, ISS) y con gravedad terrestre. El límite de oxígeno en la Luna o Marte se toma entre los dos, quedándonos con el más peligroso.', 'There are no partial-gravity tests, but there are in microgravity (BASS-II, ISS) and with Earth gravity. The oxygen limit on the Moon or Mars is taken between the two, keeping the more dangerous one.')],
      ['🛡️', t('Ante la duda, lo más peligroso', 'When in doubt, the most dangerous'), t('Un material sin ensayos con ese oxígeno se trata como si ardiera, nunca como seguro. Por debajo de la presión ensayada se usa el último valor medido, que da un fuego algo más rápido. Y en gravedad parcial no se da por hecho que cortar la ventilación apague el fuego (BRE vio llamas que seguían sin ella con mucho O₂).', 'A material with no tests at that oxygen is treated as burning, never as safe. Below the tested pressure, the last measured value is used, which gives a slightly faster fire. And in partial gravity we do not assume cutting ventilation puts the fire out (BRE saw flames keep going without it at high O₂).')],
      ['📚', t('Física y literatura de la NASA', 'Physics and NASA literature'), t('El CO se escala con el volumen de la cabina a partir de los fuegos reales de Saffire VI; el humo sube según la gravedad. Zayac 2024 avisa de que la gravedad parcial puede ser el peor caso: poco flujo para enfriar la llama y suficiente para alimentarla.', 'CO is scaled by cabin volume from the real Saffire VI fires; smoke rises according to gravity. Zayac 2024 warns that partial gravity can be the worst case: too little flow to cool the flame, enough to feed it.')],
      ['🔦', t('Decirlo y señalar el hueco', 'Say so and point to the gap'), t('Todo resultado así lleva ⚠️ «extrapolado», el Fire Twin dice qué ensayo de la NASA faltaría y cuántos parecidos hay en PSI, y el mapa de huecos de arriba enseña dónde no hay datos. No inventamos números que parezcan medidos.', 'Every such result carries ⚠️ "extrapolated", the Fire Twin says which NASA test is missing and how many similar ones PSI has, and the gap map above shows where there is no data. We do not invent numbers that look measured.')],
    ];
    return `<div class="pn-gaps" id="pn-gaps"><h3>🧩 ${t('Cómo rellenamos los huecos: qué hace Astale donde no hay ensayos', 'How we fill the gaps: what Astale does where there are no tests')}</h3>
      <p class="small dim">${t('La Luna, Marte y las atmósferas con más de 23 % de O₂ casi no tienen ensayos. Astale no se calla ni se lo inventa: responde con estas cuatro reglas y lo marca.', 'The Moon, Mars and atmospheres above 23 % O₂ have almost no tests. Astale neither stays silent nor makes things up: it answers with these four rules and flags it.')}</p>
      <div class="pn-gapgrid">${RULES.map(([i, h, p], k) => `<div class="pn-gapc"><span>${k + 1}</span><b>${i} ${h}</b><p>${p}</p></div>`).join('')}</div>
      <div class="pn-gapex"><h4>🌑 ${t('Ejemplo: se prende una tela en la base lunar', 'Example: a fabric catches fire on the lunar base')} <span class="dim small">(${t('34 % O₂ · 0,56 atm · 0,16 g · 30 m³', '34 % O₂ · 0.56 atm · 0.16 g · 30 m³')})</span></h4>
        <ol>
          <li>${t('¿Arde?', 'Does it burn?')} <b>${r.vd.st === 'safe' ? t('No debería', 'It should not') : t('Sí', 'Yes')}</b> ⚠️ ${t('extrapolado: la tela solo se ensayó hasta 22 % de O₂ y en microgravedad (Saffire-II).', 'extrapolated: the fabric was only tested up to 22 % O₂ and in microgravity (Saffire-II).')}</li>
          <li>${t('¿Cuánto tiempo hay?', 'How much time?')} ${t('El CO llegaría al límite de 1 hora en', 'CO would reach the 1-hour limit in')} <b>${mmss(r.t425.none[0])}</b> ${t('(peor caso), escalando Saffire VI a 30 m³.', '(worst case), scaling Saffire VI to 30 m³.')}</li>
          <li>${t('¿Qué hacer?', 'What to do?')} <b>${r.ventWorks ? t('Cortar la ventilación', 'Cut ventilation') : t('Extintor ya, sin esperar a que cortar el aire lo apague, y preparar la evacuación del hábitat', 'Extinguisher now, without waiting for cutting the air to put it out, and prepare to evacuate the habitat')}</b> (BRE, Zayac 2024).</li>
          <li>${t('¿Qué falta?', 'What is missing?')} ${t(`Un ensayo de tela con 34 % de O₂ a 0,56 atm y 0,16 g. En PSI hay <b>${near}</b> condiciones ensayadas cerca, y ninguna en gravedad parcial: es lo que medirán LUCI y FM2.`, `A fabric test at 34 % O₂, 0.56 atm and 0.16 g. PSI has <b>${near}</b> tested conditions nearby, and none at partial gravity: that is what LUCI and FM2 will measure.`)}</li>
        </ol>
        <p><a href="#pn-twin" class="pn-gaptry">${t('Verlo en el Fire Twin →', 'See it in the Fire Twin →')}</a></p></div></div>`;
  }

  return { coverageSvg, gapCells, gapsBlock };
}
