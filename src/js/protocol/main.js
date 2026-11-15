// ─────────────────────────────────────────────────────────────────────────────
// main.js - Entry point of the Space Fire Response Protocol (v2, the home page of astale.com)
//
// Four screens, one after another:
//   1 home     choose where, which area and what is burning → SIMULATE FIRE (the room is picked from the area)
//   2 alarm    full-screen alarm with siren → choose a role
//   3 command  one order at a time for that role, with its reason and NASA source, live map, thermal camera and CO
//   4 report   incident dashboard and the four points of the challenge for this scenario, plus the v1 Panel's
//              Fire Twin and model embedded in two more tabs
//   + about    the project and the team (#about)
// Everything is calculated with the Fire Twin engine (simulate: BASS-II, Saffire, FLEX). Crew, vital signs and
// sensors are simulated.
//
// Deep link for demos and videos (skips the intro):
//   ?d=<habitat>,<zone|material>[,<role>[,<room index>]]&t=<seconds>&s=alarm|report&rt=twin|model
//   e.g. ?d=iss,galley,cmd  ·  ?d=moon,sibal,crew&t=60  ·  ?d=orion,lab,cmd&s=report&rt=twin
// ─────────────────────────────────────────────────────────────────────────────
import { morph, pressFeedback } from '../core/morph.js';
import { t, setLang } from './i18n.js';
import { HABITATS, ZONES, MATERIALS, pickRoom } from './scenarios.js';
import { ROLES } from './crew.js';
import { app, world as W, isOut } from './state.js';
import { sirenOn, sirenOff, toggleMute, toggleAudio, toggleVoice, stopVoice, relangVoice, say } from './audio.js';
import { newIncident, relang, tick, markDone, stillBurning, currentAction, announce, voiceCommand, alertFull } from './incident.js';
import { startThermalCamera } from './thermal-camera.js';
import { home, reveal } from './screens/home.js';
import { intro } from './screens/intro.js';
import { about } from './screens/about.js';
import { alarm } from './screens/alarm.js';
import { command, alertOverlay } from './screens/command.js';
import { report } from './screens/report.js';
import { scrollTop } from './screens/common.js';

pressFeedback();

const SCREENS = { home, alarm, command, report, about };

function render() {
  const body = (SCREENS[app.screen] || home)();
  morph(document.getElementById('app'), body + (app.screen === 'command' ? alertOverlay() : ''));
  document.body.dataset.screen = app.screen;
  const burning = W.plan && W.plan.vd.st !== 'safe' && !isOut();
  document.body.classList.toggle('fire', (app.screen === 'alarm' && !app.roleSwitch) || (app.screen === 'command' && burning));
}
app.render = render;

function startIncident(cfg, room) {
  app.roleSwitch = false;
  newIncident({ ...cfg, room: room ?? pickRoom(cfg.hab, cfg.zone) });
  app.screen = 'alarm';
}

/* ------------------------------------------------------------------ clicks */
const ACTIONS = {
  simulate: () => { startIncident(app.cfg); sirenOn(); },
  mute: () => toggleMute(),
  still: () => { const a = currentAction(); if (a && a.ask) { stillBurning(a); announce(); } },
  check: () => { const a = currentAction(); if (a) { markDone(a, 'tap'); announce(); } },
  skip: () => { const a = currentAction(); if (a) { markDone(a, 'skip'); announce(); } },
  list: () => { app.listOpen = !app.listOpen; },
  report: () => { app.screen = 'report'; app.reportTab = 'report'; app.listOpen = false; },
  back: () => { app.screen = 'command'; app.roleSwitch = false; },
  role: () => { app.screen = 'alarm'; app.roleSwitch = true; app.listOpen = false; },
  about: () => { app.screen = 'about'; setTimeout(scrollTop, 0); try { history.replaceState(null, '', '#about'); } catch {} },
  home: () => { app.screen = 'home'; try { history.replaceState(null, '', location.pathname + location.search); } catch {} },
  'new-fire': () => { app.screen = 'home'; sirenOff(); W.alerts = []; stopVoice(); },
  speed: () => { W.speed = W.speed === 1 ? 4 : W.speed === 4 ? 10 : 1; },
  audio: () => toggleAudio(() => announce(true)),
  voice: () => { if (!toggleVoice((text) => voiceCommand(text))) alertFull('warn', t('SIN VOZ EN ESTE NAVEGADOR', 'NO VOICE IN THIS BROWSER'), t('Usa Chrome o Edge, o los botones.', 'Use Chrome or Edge, or the buttons.'), 3000); },
  dismiss: () => { W.alerts.shift(); },
};

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-rtab]');
  if (tab) { app.reportTab = tab.dataset.rtab; render(); scrollTop(); return; }
  const el = e.target.closest('[data-act],[data-hab],[data-zone],[data-mat],[data-role],[data-lang]');
  if (!el || el.disabled) return;
  const d = el.dataset;
  if (d.lang) { if (setLang(d.lang)) { relang(); relangVoice(); } render(); return; }
  if (d.hab) { app.cfg.hab = d.hab; render(); reveal('#f-step2', 'center'); return; }
  if (d.zone) { app.cfg.zone = d.zone; app.cfg.mat = null; render(); reveal('#f-mats', 'nearest'); return; }
  if (d.mat) { app.cfg.mat = d.mat; render(); reveal('#f-launch', 'end'); return; }
  if (d.role) {
    app.role = d.role; sirenOff(); app.screen = 'command';
    if (!app.roleSwitch) W.t = 0; // a new incident starts its clock when the first role is chosen
    app.roleSwitch = false; render(); setTimeout(() => announce(), 300); return;
  }
  ACTIONS[d.act]?.();
  render();
});

/* ------------------------------------------------------------------ keyboard: Enter = done, S = skip, L = list, Esc = close */
document.addEventListener('keydown', (e) => {
  if (app.screen !== 'command') return;
  const k = e.key.toLowerCase();
  if (k === 'enter' || k === 's') {
    const a = currentAction();
    if (a && !(a.ask && k === 's')) { markDone(a, k === 's' ? 'skip' : 'tap'); announce(); render(); }
  } else if (k === 'l') { app.listOpen = !app.listOpen; render(); }
  else if (k === 'escape') { app.listOpen = false; W.alerts = []; render(); }
});

/* ------------------------------------------------------------------ thermal camera: slider and drag to turn it */
document.addEventListener('input', (e) => { if (e.target.id === 'f-pan') { app.camPan = (+e.target.value || 0) / 100; render(); } });
let drag = null;
document.addEventListener('pointerdown', (e) => { if (e.target.id !== 'f-therm') return; drag = { x: e.clientX, pan: app.camPan, w: e.target.clientWidth || 300 }; try { e.target.setPointerCapture(e.pointerId); } catch {} });
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  app.camPan = Math.max(-1, Math.min(1, drag.pan - (e.clientX - drag.x) / drag.w * 1.6));
  const slider = document.getElementById('f-pan'); if (slider) slider.value = Math.round(app.camPan * 100);
});
document.addEventListener('pointerup', () => { if (drag) { drag = null; render(); } });

/* ------------------------------------------------------------------ deep link */
(() => {
  const q = new URLSearchParams(location.search), d = q.get('d'); if (!d) return;
  const [hab, what, role, room] = d.split(',');
  if (!HABITATS[hab] || !(ZONES[what] || MATERIALS[what])) return;
  // a zone burns with everything in it; a material burns alone; 'mix' = "I don't know"
  app.cfg = ZONES[what] ? { hab, zone: what, mat: 'mix' } : what === 'mix' ? { hab, zone: 'unknown', mat: 'mix' } : { hab, zone: null, mat: what };
  startIncident(app.cfg, room != null ? +room : undefined);
  if (q.get('s') === 'alarm' || !ROLES[role]) return;
  app.role = role; app.screen = 'command';
  const secs = +q.get('t') || 0; for (let i = 0; i < secs * 2; i++) tick(0.5);
  W.alerts = [];
  if (q.get('s') === 'report') { app.screen = 'report'; if (['twin', 'model'].includes(q.get('rt'))) app.reportTab = q.get('rt'); }
})();
if (location.hash === '#about' && app.screen === 'home') app.screen = 'about';

render();
if (app.screen === 'home') intro();
startThermalCamera();

// Simulation clock: every 0.5 s (×1, ×4 or ×10), and the command screen is redrawn
let last = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min(1, (now - last) / 1000) * W.speed; last = now;
  tick(dt);
  if (app.screen === 'command' && !app.listOpen) render();
}, 500);

// Hooks for tests and video recording
window.__protocol = { app, world: W, say };
