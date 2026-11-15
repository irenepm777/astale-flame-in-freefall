// ─────────────────────────────────────────────────────────────────────────────
// crew.js - Who takes part in the response, and the roles a user can play
//
//   CREW   the four crew members of the simulation plus ground control. Each action of the plan names one of them
//          (or 'all' = every crew member).
//   ROLES  what the user chooses on the alarm screen: commander, crew, ground control, or super administrator
//          (sees and can tick every action). roleIcon() draws their badge.
// ─────────────────────────────────────────────────────────────────────────────
import { t } from './i18n.js';

export const CREW = [
  { id: 'cmd', get name() { return t('Comandante', 'Commander'); }, short: 'CMD', col: '#ff9a4a' },
  { id: 'eng', get name() { return t('Ingeniera de vuelo', 'Flight engineer'); }, get short() { return t('ING', 'FE'); }, col: '#6f9cff' },
  { id: 'ms1', get name() { return t('Especialista 1', 'Mission specialist 1'); }, get short() { return t('ES1', 'MS1'); }, col: '#4ade80' },
  { id: 'ms2', get name() { return t('Especialista 2', 'Mission specialist 2'); }, get short() { return t('ES2', 'MS2'); }, col: '#f472b6' },
  { id: 'gnd', get name() { return t('Control en tierra', 'Ground control'); }, get short() { return t('TIERRA', 'GROUND'); }, col: '#facc15', ground: true },
];
export const WHO = Object.fromEntries(CREW.map((c) => [c.id, c]));

export const ROLES = {
  cmd: { get name() { return t('Comandante', 'Commander'); }, col: '#ff9a4a' },
  crew: { get name() { return t('Tripulación', 'Crew'); }, col: '#4ade80' },
  gnd: { get name() { return t('Control en tierra', 'Ground control'); }, col: '#facc15' },
  admin: { get name() { return t('SuperAdministrador', 'Super Administrator'); }, col: '#a78bfa' },
};

/** Which actions belong to a role: the commander does the commander's and everyone's, the crew role plays mission specialist 1. */
export const roleOwns = (role, a) =>
  role === 'admin' ? true
    : role === 'cmd' ? a.who === 'cmd' || a.who === 'all'
      : role === 'crew' ? a.who === 'ms1' || a.who === 'all'
        : role === 'gnd' ? a.who === 'gnd' : false;

// Line badges in the style of a mission patch, drawn in currentColor so they take the colour of the role.
const ROLE_ICONS = {
  // command star crossed by an orbit, inside a ring
  cmd: '<circle cx="32" cy="32" r="28"/><ellipse cx="32" cy="34" rx="25" ry="9" transform="rotate(-20 32 34)" stroke-width="2.2" opacity=".7"/><path d="M32 13l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L32 41.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="currentColor" fill-opacity=".18"/>',
  // helmet with visor and reflection
  crew: '<g transform="translate(32 34) scale(1.18) translate(-32 -36)"><path d="M14 40a18 20 0 1 1 36 0v6a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z"/><path d="M20 30a12 9 0 0 1 24 0v5a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5z" fill="currentColor" fill-opacity=".18"/><path d="M25 29q3-5 9-5" stroke-width="2.2" opacity=".8"/><path d="M22 52v5h20v-5"/></g>',
  // ground station dish transmitting
  gnd: '<g transform="translate(32 34) scale(1.3) translate(-33 -36)"><path d="M12 28a20 20 0 0 0 28 18z" fill="currentColor" fill-opacity=".18"/><path d="M26 37l8-8"/><circle cx="35" cy="28" r="2.5" fill="currentColor"/><path d="M26 44l-6 14h20l-6-10"/><path d="M42 18a10 10 0 0 1 6 6M45 11a18 18 0 0 1 10 10" stroke-width="2.4"/></g>',
  // full access: shield with a 2 × 2 grid (every view)
  admin: '<path d="M32 6l22 8v16c0 14-9.5 23-22 28C19.5 53 10 44 10 30V14z" fill="currentColor" fill-opacity=".12"/><rect x="22" y="21" width="8.5" height="8.5" rx="1.5"/><rect x="33.5" y="21" width="8.5" height="8.5" rx="1.5"/><rect x="22" y="32.5" width="8.5" height="8.5" rx="1.5"/><rect x="33.5" y="32.5" width="8.5" height="8.5" rx="1.5" fill="currentColor"/>',
};
export const roleIcon = (k, size = 64) => `<svg class="r-ico" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ROLE_ICONS[k]}</svg>`;
