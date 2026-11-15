// ─────────────────────────────────────────────────────────────────────────────
// incident.js - The simulated incident: clock, sensors, crew, alerts and the progress of the plan
//
//   newIncident(cfg)   builds the plan and places the crew (the crew member nearest the fire starts in that room)
//   tick(dt)           advances the clock: room sensors (CO, smoke, temperature) follow the Fire Twin CO curve,
//                      crew walk their routes, pulse and SpO₂ react, and full-screen alerts fire once each
//                      (toxic air in the room, fire out, plan complete)
//   markDone(a, how)   an action is done ('tap', 'voice', 'auto' when someone else's time is up) or skipped ('skip')
//   stillBurning(a)    the commander reports the fire still looks active: extinguisher again, check again,
//                      and the final inspection moves to the end
// ─────────────────────────────────────────────────────────────────────────────
import { SMAC_CO } from '../fire-twin/index.js';
import { t, LANG, inLang } from './i18n.js';
import { nf, esc, clock } from './format.js';
import { S } from './sources.js';
import { materialName, roomName, route } from './scenarios.js';
import { CREW, WHO, roleOwns } from './crew.js';
import { buildPlan, classify, localVolume } from './plan.js';
import { app, world as W } from './state.js';
import { beep, say } from './audio.js';

export function log(text) { W.log.unshift(`${clock(W.t)} · ${text}`); W.log = W.log.slice(0, 60); }

/** Full-screen alert. A green alert with the same title is not repeated within 90 s. */
export function alertFull(kind, title, sub, ms = 4500) {
  if (kind === 'ok' && W.shown[title] && performance.now() - W.shown[title] < 90000) return;
  W.shown[title] = performance.now();
  W.alerts = W.alerts.filter((x) => x.title !== title);
  W.alerts.push({ kind, title, sub, until: performance.now() + ms });
  beep(kind === 'ok' ? 'ok' : 'warn'); say(`${title}. ${sub}`);
}

export function newIncident(cfg) {
  const plan = buildPlan(cfg);
  Object.assign(W, { plan, t: 0, status: {}, out: null, coAlert: false, outShown: false, doneShown: false, shown: {}, log: [], alerts: [], co: [] });
  const n = plan.G.rooms.length, others = [...Array(n).keys()].filter((k) => k !== cfg.room).sort(() => Math.random() - 0.5);
  const start = { cmd: others[0], eng: others[1 % others.length], ms1: cfg.room, ms2: others[2 % others.length] };
  W.crew = CREW.filter((c) => !c.ground).map((c) => {
    const k = start[c.id], [x, y] = plan.G.rooms[k].c;
    return { ...c, room: k, pos: [x + (Math.random() - 0.5) * 22, y + 8 + Math.random() * 8], hr: 72, spo2: 98, co: 0, mask: false };
  });
  W.sensors = plan.G.rooms.map(() => ({ co: 1, smoke: 0, temp: 22.4 }));
  log(t(`🔥 Fuego en ${plan.rn} · ${plan.H.name} · arde ${materialName(cfg).toLowerCase()}`, `🔥 Fire in ${plan.rn} · ${plan.H.name} · burning: ${materialName(cfg).toLowerCase()}`));
}

/** After a language change: room, classification and plan texts switch language (the log stays as it was written). */
export function relang() {
  const p = W.plan; if (!p) return;
  p.rn = roomName(p.G.rooms[p.cfg.room].n); p.cls = classify(p.s, p.vd, p.cfg.mat, p.r, p.mats);
  p.A.forEach((a) => { if (a.i18n) Object.assign(a, a.i18n[LANG]); });
}

export const isMine = (a) => roleOwns(app.role, a);
export const currentAction = () => W.plan?.A.find((a) => isMine(a) && !W.status[a.n]) || null;

export function tick(dt) {
  if (!W.plan || app.screen !== 'command') return;
  W.t += dt;
  const p = W.plan, burning = p.vd.st !== 'safe';
  W.sensors.forEach((x, k) => {
    let co = 1 + Math.sin(W.t / 9 + k) * 0.4, smoke = 0, temp = 22.4;
    if (burning) {
      // CO in the burning room follows the Fire Twin curve; other rooms get part of it as the air mixes (~4 min)
      const tf = W.out != null ? Math.min(W.t, W.out) : W.t, here = p.r.curves.mid(tf) * (p.H.kind === 'cabin' ? 1 : p.s.V / 20), mix = p.H.kind === 'cabin' ? 1 : Math.min(1, W.t / 240);
      co += k === p.cfg.room ? here : here * 0.35 * mix;
      smoke = k === p.cfg.room ? Math.min(100, tf * 2.5) : Math.min(60, tf * 0.6 * mix);
      temp += k === p.cfg.room ? Math.min(18, tf * 0.12) : 0;
      if (W.out != null && W.t > W.out) { const d = W.t - W.out; co *= Math.max(0.35, 1 - d / 900); smoke *= Math.max(0, 1 - d / 120); }
    }
    Object.assign(x, { co, smoke, temp });
  });
  const fr = W.sensors[p.cfg.room]; W.co.push([W.t, fr.co]); if (W.co.length > 400) W.co.shift();
  if (burning && !W.coAlert && fr.co >= SMAC_CO) {
    W.coAlert = true;
    alertFull('warn', t(`AIRE TÓXICO EN «${p.rn.toUpperCase()}»`, `TOXIC AIR IN “${p.rn.toUpperCase()}”`), t(`El gas tóxico (CO) ha llegado a ${nf(fr.co)} ppm, el límite seguro. Todos con la mascarilla puesta y fuera de esa zona.`, `Toxic gas (CO) has reached ${nf(fr.co)} ppm, the safe limit. Everyone masks on and out of that area.`));
    log(t(`⚠️ CO ${nf(fr.co)} ppm en ${p.rn}`, `⚠️ CO ${nf(fr.co)} ppm in ${p.rn}`));
  }
  if (W.out != null && W.t >= W.out && !W.outShown) { W.outShown = true; alertFull('ok', t('FUEGO APAGADO', 'FIRE OUT'), t('Seguid con la mascarilla puesta y vigilad 10 minutos que no vuelva a prender.', 'Keep masks on and watch for 10 minutes that it does not catch fire again.')); }
  // actions of other people are done when their time is up
  for (const a of p.A) if (!W.status[a.n] && !isMine(a) && W.t >= a.end) markDone(a, 'auto');
  for (const c of W.crew) {
    if (c.target) {
      const [tx, ty] = c.target[0], dx = tx - c.pos[0], dy = ty - c.pos[1], d = Math.hypot(dx, dy), v = 40 * dt;
      if (d <= v) { c.pos = [tx, ty]; c.target.shift(); if (!c.target.length) c.target = null; } else c.pos = [c.pos[0] + dx / d * v, c.pos[1] + dy / d * v];
    }
    const dist = (r) => Math.hypot(r.c[0] - c.pos[0], r.c[1] - c.pos[1]);
    const near = p.G.rooms.reduce((b, r, k) => (dist(r) < dist(p.G.rooms[b]) ? k : b), 0);
    c.at = near; c.co = c.mask ? 1 : W.sensors[near].co * (dist(p.G.rooms[near]) < 40 ? 1 : 0.6);
    c.hr += ((burning && W.out == null ? 100 : 80) + (c.co > 100 ? 10 : 0) - c.hr) * 0.06 * dt + (Math.random() - 0.5) * 0.6;
    c.spo2 += ((c.co > 300 ? 94 : 98) - c.spo2) * 0.05 * dt;
  }
  // "Plan complete" once, and only at the very end, after the inspection
  const inspections = p.A.filter((a) => a.inspect);
  if (!W.doneShown && inspections.length && p.A.every((a) => W.status[a.n]) && W.status[inspections.pop().n]) {
    W.doneShown = true; alertFull('ok', t('PLAN COMPLETADO', 'PLAN COMPLETE'), t('El informe está listo.', 'The report is ready.'), 3500);
  }
}

export function markDone(a, how) {
  if (W.status[a.n]) return;
  W.status[a.n] = how;
  // the commander confirms with their own eyes that the fire is out: it is out from this moment
  if (a.ask && how === 'tap' && (W.out == null || W.out > W.t)) { W.out = W.t; W.outShown = true; log(t('✅ Confirmado: el fuego está apagado', '✅ Confirmed: the fire is out')); }
  const p = W.plan, crew = a.who === 'all' ? W.crew : W.crew.filter((c) => c.id === a.who);
  if (a.mask) crew.forEach((c) => (c.mask = true));
  if (a.move && how !== 'skip') {
    const [id, to] = a.move, c = W.crew.find((x) => x.id === id), from = c.at ?? p.cfg.room;
    c.target = to === 'hub' ? [p.G.rooms[from].door || p.G.rooms[from].hub, p.G.rooms[from].hub] : route(p.G, from, to).slice(1);
  }
  if (a.kills && how !== 'skip' && W.out == null) { W.out = W.t + (p.r.ventWorks ? 30 : 10); log(t('🧯 Apagándose', '🧯 Going out')); }
  log(`${how === 'skip' ? '⏭' : '✓'} ${a.n}. ${a.short} · ${a.who === 'all' ? t('todos', 'everyone') : WHO[a.who].short}${how === 'voice' ? t(' (voz)', ' (voice)') : ''}`);
}

export function stillBurning(a) {
  const p = W.plan; W.status[a.n] = 'still';
  log(t(`🔥 ${a.n}. Sigue ardiendo en ${p.rn}`, `🔥 ${a.n}. Still burning in ${p.rn}`));
  const insp = p.A.find((x) => x.inspect && !W.status[x.n]); if (insp) p.A.splice(p.A.indexOf(insp), 1);
  let n = Math.max(...p.A.map((x) => x.n)), at = W.t;
  const push = (x) => { x.n = ++n; x.start = at; x.end = at + x.dur; at = x.end; p.A.push(x); };
  const co2Two = nf(2 * 148.6 / localVolume(p.H, p.s, p.G), 0); // two 2.7 kg extinguishers, % CO₂ equivalent
  const again = (l) => inLang(l, () => {
    const rn = esc(roomName(p.G.rooms[p.cfg.room].n));
    return {
      short: t('Extintor otra vez', 'Extinguisher again'),
      text: t(`<b>Vuelve a usar el extintor de CO₂ contra la base de la llama en ${rn}.</b><span class="f-why"> El comandante ha visto que sigue ardiendo. Si se acaba el extintor, coge el siguiente: con dos extintores el CO₂ llega al equivalente de un ${co2Two} %, así que nadie sin mascarilla.</span>`,
        `<b>Use the CO₂ extinguisher again on the base of the flame in ${rn}.</b><span class="f-why"> The commander has seen that it is still burning. If the extinguisher runs out, grab the next one: with two extinguishers CO₂ reaches the equivalent of ${co2Two} %, so nobody without a mask.</span>`),
    };
  });
  const check = { es: { short: 'Comprobar otra vez que está apagado', text: a.i18n ? a.i18n.es.text : a.text }, en: { short: 'Check again that the fire is out', text: a.i18n ? a.i18n.en.text : a.text } };
  push({ who: 'ms1', ico: 'ext', ...again(LANG), i18n: { es: again('es'), en: again('en') }, dur: 45, src: [S.flex] });
  push({ who: 'cmd', ico: 'eye', ...check[LANG], i18n: check, dur: 30, src: a.src, ask: true });
  if (insp) push({ ...insp });
  W.out = W.t + 45; W.outShown = false; p.total = Math.max(p.total, at);
  alertFull('warn', t(`EL FUEGO SIGUE ACTIVO EN «${p.rn.toUpperCase()}»`, `FIRE STILL ACTIVE IN “${p.rn.toUpperCase()}”`), t('Extintor otra vez y nueva comprobación.', 'Extinguisher again, then check again.'));
}

/** Reads the current action aloud and puts it in the live region for screen readers. */
export function announce(force) {
  const a = currentAction();
  const text = a ? t(`Acción ${a.n}. ${a.text}`, `Action ${a.n}. ${a.text}`) : t('No tienes acciones pendientes.', 'You have no pending actions.');
  say(text, force);
  const live = document.getElementById('live'); if (live) live.textContent = text.replace(/<[^>]+>/g, '');
}

/** Voice commands, in English or Spanish: done, skip, list, repeat, where, report. */
export function voiceCommand(text, how = 'voice') {
  const f = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), a = currentAction();
  app.heard = text;
  if (/hecho|check|listo|ok|valid|done/.test(f)) { if (a) { markDone(a, how); announce(); } }
  else if (/saltar|siguiente|skip|next/.test(f)) { if (a) { markDone(a, 'skip'); announce(); } }
  else if (/lista|plan|acciones|list|actions/.test(f)) app.listOpen = !app.listOpen;
  else if (/repite|repetir|lee|describe|repeat|read/.test(f)) announce(true);
  else if (/donde|sala|where|room/.test(f)) say(t(`El fuego está en ${W.plan.rn}.`, `The fire is in ${W.plan.rn}.`), true);
  else if (/informe|report/.test(f)) app.screen = 'report';
  app.render();
}
