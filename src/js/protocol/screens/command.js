// ─────────────────────────────────────────────────────────────────────────────
// command.js - Screen 3: the command screen during the incident
//
//   left    YOUR ACTION NOW: the order in a white box with its pictogram, the reason below it, a countdown ring,
//           DONE / Skip (or, for the final check, "looks out" / "still looks active") and what comes next
//   centre  incident class and code, floor plan, thermal camera, where the fire is
//   right   full plan progress, CO in the burning room, radio delay, crew status
//   bottom  queue of the next actions and the last voice command heard
// The screen is redrawn every 0.5 s with morph(), so buttons keep their hover and press states.
// ─────────────────────────────────────────────────────────────────────────────
import { SMAC_CO } from '../../fire-twin/index.js';
import { t } from '../i18n.js';
import { esc, nf, duration, clock } from '../format.js';
import { roomName, materialName } from '../scenarios.js';
import { WHO, ROLES, roleIcon } from '../crew.js';
import { pictogram } from '../pictograms.js';
import { app, world as W } from '../state.js';
import { sound } from '../audio.js';
import { currentAction, isMine } from '../incident.js';
import { homeLogo, langButtons } from './common.js';
import { mapSVG } from './map.js';
import { coChart } from './dashboard.js';

const whoTag = (x) => (x.who === 'all' ? t('Todos', 'Everyone') : WHO[x.who].short);
const whoColor = (x) => (x.who === 'all' ? '#fff' : WHO[x.who].col);

function nextMine(p, a) {
  const nx = p.A.filter((x) => isMine(x) && !W.status[x.n] && x.n !== a.n).slice(0, 3);
  return nx.length ? `<div class="f-next"><h4>${t('Después', 'Next')}</h4>${nx.map((x) => `<div><b>${x.n}</b> ${esc(x.short)} <span class="dim">· ${clock(x.start)}</span></div>`).join('')}</div>` : '';
}

/** Full plan as a table (button "N actions", key L or voice "list"). */
function planTable() {
  const p = W.plan, a = currentAction();
  const mark = (x) => (W.status[x.n] === 'skip' ? '⏭' : W.status[x.n] === 'still' ? '🔥' : W.status[x.n] ? '✓' : '⏳');
  return `<div class="f-modal" role="dialog"><div class="f-modal-in"><h2>${t('📋 Plan de respuesta', '📋 Response plan')} · ${esc(p.H.name)} · ${esc(p.rn)}</h2>
    <table class="f-t"><tr><th>#</th><th>${t('Quién', 'Who')}</th><th>${t('Acción', 'Action')}</th><th>${t('Cuándo', 'When')}</th><th>${t('Dura', 'Takes')}</th><th></th></tr>${p.A.map((x) => `<tr class="${a && a.n === x.n ? 'now' : ''}"><td><b>${x.n}</b></td><td><span class="f-who sm" style="--c:${whoColor(x)}">${whoTag(x)}</span></td><td>${x.text}<br><span class="dim small">${x.src.join(', ')}</span></td><td>${clock(x.start)}</td><td>${duration(x.dur)}</td><td>${mark(x)}</td></tr>`).join('')}</table>
    <button class="f-ok" data-act="list">${t('Cerrar', 'Close')}</button></div></div>`;
}

/** Full-screen alert on top of the command screen (toxic air, fire out, plan complete). Tap to close. */
export function alertOverlay() {
  const now = performance.now(); W.alerts = W.alerts.filter((a) => a.until > now);
  const a = W.alerts[0]; if (!a) return '';
  return `<div class="f-full ${a.kind}" data-act="dismiss" role="alert"><div><h1>${a.kind === 'ok' ? '✅' : '⚠️'} ${esc(a.title)}</h1><p>${esc(a.sub)}</p><small>${t('toca para cerrar', 'tap to close')}</small></div></div>`;
}

export function command() {
  const p = W.plan, a = currentAction(), fire = p.vd.st !== 'safe' && !(W.out != null && W.t > W.out), H = p.H, role = app.role;
  const el = a ? Math.max(0, W.t - a.start) : 0, wait = a ? Math.max(0, a.start - W.t) : 0, rem = a ? a.dur - el : 0, frac = a ? Math.min(1, el / a.dur) : 1, C = 2 * Math.PI * 52;
  const fr = W.sensors[p.cfg.room], left = Math.max(0, p.total - W.t), nDone = Object.keys(W.status).length;
  const queue = p.A.filter((x) => !W.status[x.n] && (!a || x.n !== a.n)).slice(0, 4);
  const action = a ? `<section class="f-act ${rem < 0 ? 'late' : ''}" aria-label="${t('Tu acción', 'Your action')}">
      <div class="f-act-tag">${t('▶ TU ACCIÓN AHORA', '▶ YOUR ACTION NOW')} · ${esc(ROLES[role].name.toUpperCase())}</div>
      <div class="f-act-h"><span class="f-num">${a.n}</span><span class="f-who" style="--c:${whoColor(a)}">${a.who === 'all' ? t('👥 TODOS', '👥 EVERYONE') : WHO[a.who].name.toUpperCase()}</span>
        <svg viewBox="0 0 120 120" class="f-ring"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg ${rem < 0 ? 'late' : ''}" stroke-dasharray="${C}" stroke-dashoffset="${C * frac}"/><text x="60" y="64" text-anchor="middle" class="big">${wait > 0 ? duration(wait) : rem >= 0 ? duration(rem) : '+' + duration(-rem)}</text><text x="60" y="82" text-anchor="middle" class="sm">${wait > 0 ? t('empieza en', 'starts in') : rem >= 0 ? t('para hacerla', 'to do it') : t('con retraso', 'late')}</text></svg></div>
      <p class="f-act-t">${a.text.replace('<b>', '<b>' + pictogram(a.ico) + '<span>').replace('</b>', '</span></b>')}</p>
      ${a.ask ? `<div class="f-act-b f-ask"><button class="f-ok" data-act="check">${t('✓ El fuego parece extinguido', '✓ The fire looks out')}</button><button class="f-still" data-act="still">${t('🔥 El fuego parece seguir activo', '🔥 The fire still looks active')}</button></div>` : `<div class="f-act-b"><button class="f-ok" data-act="check">${t('✓ HECHO', '✓ DONE')}</button><button class="f-skip" data-act="skip">${t('⏭ Saltar', '⏭ Skip')}</button></div>`}
      <p class="f-src">${a.src.length ? `${t('Se basa en', 'Based on')}: ${a.src.join(', ')}` : t('Procedimiento de la tripulación', 'Crew procedure')}</p>${nextMine(p, a)}</section>`
    : `<section class="f-act done"><p class="f-act-t">✓ ${role === 'gnd' ? t('Sin acciones para tierra ahora.', 'No actions for ground control right now.') : t('Tus acciones están hechas.', 'Your actions are done.')}</p><button class="f-ok" data-act="report">${t('📄 Ver el informe', '📄 View the report')}</button></section>`;
  const crewBox = role === 'gnd' || role === 'admin' || role === 'cmd' ? `<section class="f-box"><h3>${t('👥 Tripulación', '👥 Crew')}</h3><div class="f-crew">${W.crew.map((c) => {
    const nx = p.A.find((x) => (x.who === c.id || x.who === 'all') && !W.status[x.n]);
    return `<div style="--c:${c.col}"><b>${WHO[c.id].name}</b><span>${esc(roomName(p.G.rooms[c.at ?? 0].n).split(' (')[0])} · ❤️ ${nf(c.hr)} · <span class="${c.co > SMAC_CO ? 'bad' : c.co > 50 ? 'warn' : ''}">CO ${nf(c.co)}</span> ${c.mask ? '😷' : ''}</span><i>${nx ? `⏳ ${nx.n}. ${esc(nx.short)}` : t('✓ hecho', '✓ done')}</i></div>`;
  }).join('')}</div></section>` : '';
  const tl = p.r.t425.none[0];
  return `<main class="f-cmd ${fire ? 'burning' : 'calm'}" style="--hab:${H.col}">
    <header class="f-bar">${homeLogo()}
      <span class="f-status ${fire ? 'on' : 'off'}">${fire ? t('🔥 FUEGO', '🔥 FIRE') : p.vd.st === 'safe' ? t('🟢 SIN LLAMA', '🟢 NO FLAME') : t('✅ APAGADO', '✅ OUT')} · ${esc(p.rn)}</span>
      <span class="f-hab"><i style="background-image:url(${H.img})"></i>${esc(H.name)} · ${t('arde', 'burning:')} ${esc(materialName(p.cfg).toLowerCase())}</span>
      <span class="f-clock">${clock(W.t)}</span>
      <span class="f-tools"><button class="f-rolebadge" data-act="role" style="--c:${ROLES[role].col}" title="${t('Cambiar de rol', 'Change role')}">${roleIcon(role, 22)} ${ROLES[role].name} ▾</button>
        <button data-act="voice" class="${sound.voiceOn ? 'on' : ''}" aria-pressed="${sound.voiceOn}" title="${t('Órdenes por voz', 'Voice commands')}">🎙️</button><button data-act="audio" class="${sound.audioOn ? 'on' : ''}" aria-pressed="${sound.audioOn}" title="${t('Audio descrito', 'Audio description')}">🔊</button>
        <button data-act="speed">×${W.speed}</button><button data-act="report">${t('📄 Informe', '📄 Report')}</button><button data-act="new-fire" title="${t('Volver a la portada y simular otro fuego', 'Back to the start and simulate another fire')}">${t('⟲ Nuevo fuego', '⟲ New fire')}</button>${langButtons()}</span></header>
    <div class="f-grid">
      ${action}
      <section class="f-mapbox"><div class="f-sev" style="--c:${p.cls.sev[2]}">${t('CLASE', 'CLASS')} ${p.cls.sev[0]} · ${p.cls.sev[1]} <code>${p.cls.code}</code></div>${mapSVG()}
        <figure class="f-therm"><canvas id="f-therm" width="400" height="200" aria-label="${t('Cámara térmica', 'Thermal camera')}"></canvas><div class="f-therm-ctl"><span>◀</span><input type="range" id="f-pan" min="-100" max="100" step="1" value="${Math.round(app.camPan * 100)}" aria-label="${t('Girar la cámara', 'Turn the camera')}"><span>▶</span><b>${app.camPan > 0.02 ? '→ ' : app.camPan < -0.02 ? '← ' : ''}${Math.abs(Math.round(app.camPan * 60))}°</b></div><figcaption>📷 ${t('Cámara térmica', 'Thermal camera')} · ${esc(p.rn)} · ${t('arrastra para girarla', 'drag to turn it')}</figcaption></figure>
        <p class="f-loc">📍 <b>${esc(p.rn)}</b> · ${p.cls.fuel}, ${p.cls.reg}${p.vd.ex ? t(' · ⚠️ estimado: la NASA no tiene ensayos de este caso', ' · ⚠️ estimate: NASA has no tests for this case') : ''}</p></section>
      <section class="f-side">
        <div class="f-box f-tot"><h3>${t('⏳ Plan completo', '⏳ Full plan')}</h3><b>${duration(p.total)}</b><div class="f-barp"><i style="width:${Math.min(100, W.t / p.total * 100)}%"></i></div><span>${t(`quedan ${duration(left)} · ${nDone}/${p.A.length} acciones`, `${duration(left)} left · ${nDone}/${p.A.length} actions`)}${p.outAt ? t(` · apagado previsto ${clock(p.outAt)}`, ` · expected out at ${clock(p.outAt)}`) : ''}</span></div>
        <div class="f-box"><h3>${t('☁️ Gas tóxico (CO) en', '☁️ Toxic gas (CO) in')} ${esc(p.rn.split(' (')[0])} <b class="${fr.co > SMAC_CO ? 'bad' : fr.co > 50 ? 'warn' : ''}">${nf(fr.co)} ppm</b></h3>${coChart()}
          <span class="dim small">${p.vd.st === 'safe' ? '' : tl == null ? t(`La nave es grande (${p.s.V} m³): el gas tardaría más de 30 min en ser peligroso en toda ella, pero cerca del fuego sube rápido. Mascarilla igual.`, `The spacecraft is large (${p.s.V} m³): the gas would take more than 30 min to become dangerous everywhere, but near the fire it rises fast. Wear the mask anyway.`) : t(`Si nadie hace nada, en ${duration(tl)} el aire sería peligroso (la línea roja). Cálculo con el ensayo Saffire VI de la NASA.`, `If no one acts, the air becomes dangerous in ${duration(tl)} (the red line). Calculated with NASA's Saffire VI test.`)}</span></div>
        ${H.delay > 60 ? t('<div class="f-box warn"><b>📡 Retraso de radio 3–22 min.</b> La tripulación decide sola.</div>', '<div class="f-box warn"><b>📡 Radio delay 3–22 min.</b> The crew decides alone.</div>') : ''}
        ${crewBox}
      </section>
    </div>
    <nav class="f-queue" aria-label="${t('Siguientes acciones', 'Next actions')}"><button data-act="list">📋 ${p.A.length} ${t('acciones', 'actions')}</button>${queue.map((x) => `<span style="--c:${whoColor(x)}"><b>${x.n}</b> ${whoTag(x)} · ${esc(x.short)}</span>`).join('')}${app.heard ? `<em>«${esc(app.heard)}»</em>` : ''}</nav>
    ${app.listOpen ? planTable() : ''}
  </main>`;
}
