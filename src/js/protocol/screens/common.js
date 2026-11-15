// ─────────────────────────────────────────────────────────────────────────────
// common.js - Pieces shared by several screens: logo, language switch, data credit line and the team
// ─────────────────────────────────────────────────────────────────────────────
import { t, LANG } from '../i18n.js';

/** ASTALE logo, top left on every screen: always goes back to the home page. */
export const homeLogo = () => '<a href="./" class="f-logo f-logo-bar" title="astale.com">ASTALE</a>';

export const langButtons = () => `<span class="f-lang" role="group" aria-label="Idioma / Language"><button data-lang="es" class="${LANG === 'es' ? 'on' : ''}" aria-pressed="${LANG === 'es'}">ES</button><button data-lang="en" class="${LANG === 'en' ? 'on' : ''}" aria-pressed="${LANG === 'en'}">EN</button></span>`;

export const dataLine = () => `${t('Datos', 'Data')}: NASA Physical Sciences Informatics (BASS-II, Saffire, FLEX, BRE) · NASA Space Apps 2026 «Flame in Freefall» · ${t('Equipo Astale', 'Team Astale')}`;

// [name, photo file in assets/img/team/, LinkedIn profile if we have it]
export const TEAM = [
  ['Fernando Constantino', 'fernando', 'https://www.linkedin.com/in/fernandoconstantino/'],
  ['José Luis Endrino', 'joseluis'],
  ['Álvaro Morillo', 'alvaro'],
  ['José María Mallén', 'josemaria'],
  ['Iván Molina', 'ivan'],
  ['Irene Pascual', 'irene', 'https://www.linkedin.com/in/irene-pascual-moreno-266581308/'],
];
export const teamPhoto = (k) => `assets/img/team/${k}.jpg`;

/** Round photos with names, at the end of the report. */
export const teamStrip = (title) => `<section class="f-team"><h3>${title}</h3><div>${TEAM.map(([n, k]) => `<figure><img src="${teamPhoto(k)}" alt="${n}" loading="lazy"><figcaption>${n}</figcaption></figure>`).join('')}</div></section>`;

/** Scrolls the page container (the body scrolls, not the window) back to the top. */
export const scrollTop = () => (document.body.scrollHeight > document.body.clientHeight + 2 ? document.body : document.scrollingElement).scrollTo({ top: 0 });
