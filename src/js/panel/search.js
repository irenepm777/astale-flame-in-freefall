// ─────────────────────────────────────────────────────────────────────────────
// search.js · «Pregúntale al panel»: el motor que responde SIN Claude (gratis, en el navegador)
//
// Cuando alguien pregunta algo, se hacen tres cosas y se juntan:
//   1. search()      Buscador de texto sobre lo que sabe el panel (fichas de PSI, reglas de diseño, aplicaciones
//                    en la Tierra). Puntúa cada documento con las palabras de la pregunta (tipo TF-IDF: las palabras
//                    raras pesan más) y entiende sinónimos sencillos (luna/moon, humo/smoke…).
//   2. compute()     Cálculos directos si la pregunta trae un oxígeno o una misión («¿arde con 30 % de O₂?»):
//                    usa el modelo entrenado con BASS-II.
//   3. smartAnswer() (ask/answer.js) Si entiende la pregunta (¿arde?, ¿cuánto tiempo?, ¿qué hacer?…), responde
//                    CALCULANDO con el motor del Fire Twin.
// freeAnswer(q) las combina y devuelve el HTML de la respuesta. Si no entiende la pregunta, lo dice claro.
//
// Se crea con crearBuscador(...) porque necesita los datos del Panel (INV, DESIGN, EARTH, SCENARIOS).
// ─────────────────────────────────────────────────────────────────────────────
import { ML, pBurn } from '../fire-twin/index.js';
import { smartAnswer } from '../ask/answer.js';
import { PSI_URL } from './links.js';

export function crearBuscador({ LANG, INV, SCENARIOS, DESIGN, EARTH, t, nf, esc }) {
  const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const STOP = new Set(fold('el la los las un una unos unas de del al a en y o que qué es se con sin por para su sus lo como cómo cuánto cuanto hay más mas muy the a an of in on and or is are does do what which how much many with without for to it be can at this that there from')
    .split(' '));
  const toks = (s) => fold(s).replace(/[^a-z0-9₂%.\- ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  // El corpus: lo que sabe el panel (fichas de PSI, reglas de diseño, aplicaciones en la Tierra)
  const DOCS = [
    ...INV.map((i) => ({ kind: 'psi', title: `${i.acr} (${i.id})`, url: PSI_URL(i.id), text: [i.es, i.find, i.earth].filter(Boolean).join(' '), extra: [i.title, (i.keywords || []).join(' ')].join(' ') })),
    ...DESIGN.map((d) => ({ kind: 'design', title: d.title, url: '#pn-3', text: d.rule, extra: d.srcs.map((x) => x[0]).join(' ') })),
    ...EARTH.map((e) => ({ kind: 'earth', title: e.title, url: '#pn-4', text: e.text, extra: e.srcs.map((x) => x[0]).join(' ') })),
  ].map((d) => ({ ...d, tk: toks(d.title + ' ' + d.text + ' ' + d.extra) }));
  const DF = {};
  DOCS.forEach((d) => new Set(d.tk).forEach((w) => (DF[w] = (DF[w] || 0) + 1)));
  // Sinónimos sencillos entre idiomas y palabras de la calle
  const SYN = { luna: 'moon lunar', moon: 'luna lunar', marte: 'mars', mars: 'marte', humo: 'smoke detector detection', smoke: 'humo detector', detector: 'smoke humo detection',
    acrilico: 'pmma acrylic', acrylic: 'pmma acrilico', pmma: 'acrylic acrilico', gota: 'droplet flex', gotas: 'droplet droplets flex', droplet: 'gota flex', ventilacion: 'ventilation flow aire', ventilation: 'ventilacion flow',
    extintor: 'extinguisher suppression extincion', apagar: 'extinction extinguish', co: 'saffire cabin', orion: 'capsule capsula', tela: 'fabric sibal cotton', algodon: 'cotton sibal', oxigeno: 'o2 oxygen', oxygen: 'o2 oxigeno', niebla: 'mist water', agua: 'water mist' };
  function search(q) {
    let qt = toks(q);
    qt = qt.concat(...qt.map((w) => (SYN[w] ? SYN[w].split(' ') : [])));
    return DOCS.map((d) => {
      let s = 0;
      for (const w of new Set(qt)) { const n = d.tk.filter((x) => x === w || (w.length > 4 && x.startsWith(w.slice(0, 5)))).length; if (n) s += (1 + Math.log(n)) * Math.log(1 + DOCS.length / (DF[w] || 1)); }
      return { d, s: s * (d.kind === 'design' ? 1.25 : 1) };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 4).map((x) => x.d);
  }
  // Cálculos directos cuando la pregunta trae un oxígeno o una misión
  function compute(q) {
    const f = fold(q), out = [];
    const m = f.match(/(\d{1,2}(?:[.,]\d)?)\s*%/);
    let o2 = m ? parseFloat(m[1].replace(',', '.')) : null, where = '';
    if (o2 == null) {
      const sc = /luna|moon|lunar/.test(f) ? SCENARIOS.find((s) => s.id === 'moon') : /marte|mars/.test(f) ? SCENARIOS.find((s) => s.id === 'mars') : /eva/.test(f) ? SCENARIOS.find((s) => s.id === 'staging') : null;
      if (sc) { o2 = sc.o2; where = ` (${sc.label})`; }
    }
    if (o2 != null && o2 >= 10 && o2 <= 60) {
      const ps = Math.round(pBurn(o2, true) * 100), pr = Math.round(pBurn(o2, false) * 100);
      out.push(t(`Con ${nf(o2, o2 % 1 ? 1 : 0)} % de O₂${where}, el modelo entrenado con ${ML.n} observaciones de BASS-II da: placa de acrílico arde con probabilidad ${ps} %, varilla ${pr} % (±${nf(ML.mae, 1)} puntos de O₂; medido a ~1 atm con aire lento${o2 > 23 ? ', por encima de 23 % es extrapolar' : ''}).`,
        `At ${nf(o2, o2 % 1 ? 1 : 0)} % O₂${where}, the model trained on ${ML.n} BASS-II observations gives: acrylic plate burns with probability ${ps} %, rod ${pr} % (±${nf(ML.mae, 1)} O₂ points; measured at ~1 atm with slow air${o2 > 23 ? '; above 23 % it is extrapolation' : ''}).`));
    }
    if (/\bco\b|monoxido|monoxide|humo|smoke/.test(f) && /orion|capsul|cabina|cabin|nave|vehicle/.test(f))
      out.push(DESIGN[3].rule);
    return out;
  }
  function freeAnswer(q) {
    const hits = search(q), calc = compute(q), smart = smartAnswer(q, LANG);
    const first = (s) => { const m = String(s).match(/^.{40,260}?[.!?](\s|$)/); return m ? m[0].trim() : String(s).slice(0, 220) + '…'; };
    const link = (d) => `<a href="${d.url}" ${d.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}><b>${esc(d.title)}</b></a>`;
    // 1) La pregunta se entiende: respuesta directa calculada, y las fichas solo como «para saber más»
    if (smart.direct) return { smart: true, hits, calc: [smart.text], html: smart.html +
      (hits.length ? `<details class="pn-more"><summary>${t('Para saber más', 'Read more')}</summary><ul>${hits.slice(0, 3).map((d) => `<li>${link(d)} — ${esc(first(d.text))}</li>`).join('')}</ul></details>` : '') };
    // 2) No se entiende: decirlo claro, lo más parecido en una línea y qué SÍ sabe contestar
    return { hits, calc, html: `
      <p class="pn-direct">${t('Esa pregunta no la sé contestar con cálculos.', 'I cannot answer that question with calculations.')} ${hits.length ? t('Lo más cercano que tengo:', 'The closest thing I have:') : ''}</p>
      ${hits.length ? `<ul>${hits.slice(0, 2).map((d) => `<li>${link(d)} — ${esc(first(d.text))}</li>`).join('')}</ul>` : ''}
      <p class="small">${t('Lo que sí respondo, con números y fuente: <b>¿arde</b> un material en una nave o con un oxígeno?, <b>¿cuánto tiempo</b> hay?, <b>¿qué hacer?</b>, <b>detectores</b>, <b>por qué</b> el fuego es distinto en el espacio, <b>el modelo</b> y escenarios <b>sin datos</b>.', 'What I do answer, with numbers and sources: does a material <b>burn</b> in a vehicle or at an oxygen level?, <b>how much time</b> is there?, <b>what to do</b>?, <b>detectors</b>, <b>why</b> fire is different in space, <b>the model</b> and scenarios <b>without data</b>.')}</p>` };
  }

  return { search, compute, freeAnswer };
}
