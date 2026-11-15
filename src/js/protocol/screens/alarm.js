// ─────────────────────────────────────────────────────────────────────────────
// alarm.js - Screen 2: full-screen red alarm with siren, and "Who are you?"
//
// The user picks a role (commander, crew, ground control, super administrator). The same screen, calm and without
// siren, is used to switch role in the middle of an incident without restarting it (app.roleSwitch).
// ─────────────────────────────────────────────────────────────────────────────
import { t } from '../i18n.js';
import { esc, nf } from '../format.js';
import { materialName } from '../scenarios.js';
import { ROLES, roleIcon } from '../crew.js';
import { app, world as W } from '../state.js';
import { sound } from '../audio.js';
import { homeLogo, langButtons } from './common.js';

// fire hazard triangle
const FIRE_SIGN = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M32 5L60 55H4z" fill="currentColor" fill-opacity=".12"/><path d="M32 49c-6 0-10-4-10-9 0-6 5-9 6-15 3 3 4 6 4 8 1-3 3-5 3-9 5 4 7 10 7 16 0 5-4 9-10 9z" fill="currentColor" fill-opacity=".9" stroke="none"/></svg>';

export function alarm() {
  const p = W.plan, sw = app.roleSwitch, safe = p.vd.st === 'safe';
  return `<main class="f-alarm ${sw ? 'switch' : ''}">${homeLogo()}<nav class="f-alarm-nav">${sw ? `<button data-act="back">${t('← Volver al mando', '← Back to command')}</button>` : `<button data-act="new-fire">${t('← Cambiar el escenario', '← Change the scenario')}</button>`}${langButtons()}</nav><div class="f-alarm-in">
    <div class="f-alarm-ico">${FIRE_SIGN}</div><h1>${safe ? t('ALARMA DE FUEGO', 'FIRE ALARM') : t('FUEGO A BORDO', 'FIRE ON BOARD')}</h1>${safe ? `<p class="f-alarm-what">${t('Ha saltado el detector, pero con este oxígeno ese material no debería arder: hay que confirmarlo.', 'The detector has gone off, but at this oxygen level that material should not burn: it must be confirmed.')}</p>` : ''}
    <p class="f-alarm-where">${esc(p.rn)} · ${esc(p.H.name)}</p><p class="f-alarm-what">${t('Arde', 'Burning')}: ${esc(materialName(p.cfg))} · ${nf(p.s.o2, 1)} % O₂ · ${nf(p.s.g, 2)} g</p>
    <h2>${sw ? t('¿Con qué rol sigues?', 'Which role do you continue as?') : t('¿Quién eres?', 'Who are you?')}</h2>
    <div class="f-roles">${Object.entries(ROLES).map(([k, r]) => `<button data-role="${k}" class="${sw && k === app.role ? 'on' : ''}" style="--c:${r.col}"><span>${roleIcon(k)}</span>${r.name}</button>`).join('')}</div>
    ${sw ? '' : `<button class="f-mute" data-act="mute">${sound.muted ? t('🔇 Sonido apagado', '🔇 Sound off') : t('🔊 Silenciar alarma', '🔊 Silence alarm')}</button>`}</div></main>`;
}
