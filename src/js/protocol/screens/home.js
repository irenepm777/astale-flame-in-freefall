// ─────────────────────────────────────────────────────────────────────────────
// home.js - Screen 1: "What would happen if a fire broke out now?"
//
// The page reveals itself step by step:
//   step 1  where (spacecraft or habitat, NASA photos with a common blue tint)
//   step 2  which area is burning, then what is burning (everything in the area, or one tested material)
//   then    the scenario summary and the SIMULATE FIRE button; the choices not taken are darkened.
// reveal() scrolls just enough to show what has just appeared.
// ─────────────────────────────────────────────────────────────────────────────
import { t } from '../i18n.js';
import { esc } from '../format.js';
import { HABITATS, ZONES, MATERIALS, materialName } from '../scenarios.js';
import { app } from '../state.js';
import { langButtons, dataLine } from './common.js';

const habitatImage = (h) => `background-image:url(${h.img})${h.pos ? `;background-position:${h.pos}` : ''}`;

export function home() {
  const cfg = app.cfg;
  if (cfg.zone && !ZONES[cfg.zone]) cfg.zone = null;
  if (cfg.zone && !(cfg.mat === 'mix' || ZONES[cfg.zone].mats.includes(cfg.mat))) cfg.mat = null;
  const ready = cfg.hab && cfg.zone && cfg.mat;
  const zone = ZONES[cfg.zone];
  return `<main class="f-start">
    <header class="f-brand"><a href="./" class="f-logo" title="astale.com"><b>ASTALE</b></a> · ${t('Seguridad contra incendios en naves', 'Fire safety for spacecraft')}${langButtons()}</header>
    <h1>${t('¿Qué pasaría si hubiera un fuego <em>ahora</em>?', 'What would happen if a fire broke out <em>now</em>?')}</h1>
    <section class="f-step ${cfg.hab ? 'done' : 'now'}" style="--s:#4f8dff">
      <header class="f-step-h"><span class="f-n">1</span><div><b>${t('¿Dónde?', 'Where?')}</b><small>${t('Elige <u>una</u> nave o hábitat', 'Choose <u>one</u> spacecraft or habitat')}</small></div>
        <span class="f-step-st">${cfg.hab ? '✓ ' + esc(HABITATS[cfg.hab].name) : t('Pulsa una ↓', 'Tap one ↓')}</span></header>
      <div class="f-tiles hab ${cfg.hab ? 'has' : ''}">${Object.entries(HABITATS).map(([k, h]) => `
      <button class="f-tile ${cfg.hab === k ? 'on' : ''}" data-hab="${k}" aria-pressed="${cfg.hab === k}"><span class="f-img" style="${habitatImage(h)}"></span><i class="f-tint"></i><b>${h.name}</b><small>${h.sub}</small></button>`).join('')}</div></section>
    ${cfg.hab ? `<section class="f-step f-appear ${ready ? 'done' : 'now'}" id="f-step2" style="--s:#ff7a2a">
      <header class="f-step-h"><span class="f-n">2</span><div><b>${t('¿Qué zona arde?', 'Which area is on fire?')}</b><small>${t('Elige <u>una</u> zona', 'Choose <u>one</u> area')}</small></div>
        <span class="f-step-st">${ready ? '✓ ' + esc(zone.name) + ' · ' + esc(materialName(cfg)) : cfg.zone ? t('Ahora, ¿qué arde? ↓', 'Now, what is burning? ↓') : t('Pulsa una ↓', 'Tap one ↓')}</span></header>
      <div class="f-tiles zon ${cfg.zone ? 'has' : ''}">${Object.entries(ZONES).map(([k, z]) => `
      <button class="f-tile ${cfg.zone === k ? 'on' : ''}" data-zone="${k}" aria-pressed="${cfg.zone === k}"><span class="f-img" style="background-image:url(${z.img})${z.svg ? ';background-size:100% auto;background-position:center top;background-color:#0b0f1a' : ''}"></span><b>${z.name}</b><small>${z.sub}</small></button>`).join('')}</div>
      ${cfg.zone ? `<div class="f-mats f-appear ${cfg.mat ? '' : 'now'}" id="f-mats"><p><b>${t('¿Qué está ardiendo?', 'What is burning?')}</b> <span class="dim">${t('Todo lo de la zona, o solo uno de estos materiales (los que la NASA ha ensayado en microgravedad).', 'Everything in the area, or just one of these materials (the ones NASA has tested in microgravity).')}</span></p>
        <div class="f-chips ${cfg.mat ? 'has' : ''}"><button class="f-chip all ${cfg.mat === 'mix' ? 'on' : ''}" data-mat="mix" aria-pressed="${cfg.mat === 'mix'}"><span class="f-chip-i" style="background-image:url(${zone.img})"></span><span><b>${t('Todo lo de la zona', 'Everything in the area')}</b><small>${t(`el caso más realista · ${zone.mats.length} materiales`, `the most realistic case · ${zone.mats.length} materials`)}</small></span></button>${zone.mats.map((k) => `
          <button class="f-chip ${cfg.mat === k ? 'on' : ''}" data-mat="${k}" aria-pressed="${cfg.mat === k}"><span class="f-chip-i" style="background-image:url(${MATERIALS[k].img})"></span><span><b>${MATERIALS[k].name}</b><small>${MATERIALS[k].sub}</small></span></button>`).join('')}</div></div>` : ''}</section>` : ''}
    ${ready ? `<div class="f-launch f-appear" id="f-launch"><p class="f-sum">${t(`🔥 Fuego en <b>${esc(HABITATS[cfg.hab].name)}</b> · zona <b>${esc(zone.name.toLowerCase())}</b> · arde <b>${esc(materialName(cfg))}</b>`, `🔥 Fire in <b>${esc(HABITATS[cfg.hab].name)}</b> · area <b>${esc(zone.name.toLowerCase())}</b> · burning <b>${esc(materialName(cfg))}</b>`)}</p>
    <button class="f-go" data-act="simulate">${t('🔥 SIMULAR FUEGO', '🔥 SIMULATE FIRE')}</button></div>` : ''}
    ${ready ? `<footer class="f-appear f-pfoot"><button class="f-linkbtn" data-act="about">${t('Acerca de', 'About')}</button><p class="f-foot dim">${dataLine()}</p></footer>` : ''}
  </main>`;
}

/** Scrolls so that the element that just appeared is visible (only if it is not). block: 'center' | 'nearest' | 'end'. */
export function reveal(sel, block) {
  setTimeout(() => {
    const el = document.querySelector(sel); if (!el) return;
    const sc = document.body.scrollHeight > document.body.clientHeight + 2 ? document.body : document.scrollingElement;
    const top0 = sc.scrollTop, r = el.getBoundingClientRect(), H = innerHeight;
    if (r.top >= 0 && r.bottom <= H - 8) return;
    let y = block === 'end' ? top0 + r.bottom - H + 24 : block === 'center' && r.height < H ? top0 + r.top - (H - r.height) / 2 : top0 + r.bottom - H + 16;
    y = Math.min(y, top0 + r.top - 8);
    sc.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }, 60);
}
