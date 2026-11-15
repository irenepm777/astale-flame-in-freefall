// ─────────────────────────────────────────────────────────────────────────────
// about.js - "About Astale": what the project is and who made it (also at #about)
// ─────────────────────────────────────────────────────────────────────────────
import { t } from '../i18n.js';
import { langButtons, dataLine, TEAM, teamPhoto } from './common.js';

const LINKEDIN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect width="24" height="24" rx="4" fill="#0a66c2"/><path fill="#fff" d="M7 9.5h2.6V18H7zM8.3 5.6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.2 9.5h2.5v1.2c.4-.7 1.3-1.4 2.6-1.4 2.7 0 3.2 1.8 3.2 4.1V18h-2.6v-4c0-1 0-2.2-1.4-2.2s-1.6 1-1.6 2.1V18h-2.6z"/></svg>';

export function about() {
  return `<main class="f-about">
    <header class="f-brand"><a href="./" class="f-logo" title="astale.com"><b>ASTALE</b></a> · ${t('Seguridad contra incendios en naves', 'Fire safety for spacecraft')}<button class="f-x f-linkbtn" data-act="home">${t('← Volver', '← Back')}</button>${langButtons()}</header>
    <h1>${t('Acerca de Astale', 'About Astale')}</h1>
    <p class="f-about-lead">${t('Astale es nuestra respuesta al reto <b>«Flame in Freefall»</b> del NASA Space Apps Challenge 2026: si hay un fuego en una nave o en una base, dice a cada persona qué hacer en cada momento, con los ensayos de combustión en microgravedad de la NASA detrás de cada orden.', 'Astale is our answer to the <b>"Flame in Freefall"</b> challenge of the NASA Space Apps Challenge 2026: if a fire breaks out in a spacecraft or a base, it tells each person what to do at each moment, with NASA microgravity combustion experiments behind every order.')}</p>
    <h2>${t('El equipo', 'The team')}</h2>
    <div class="f-about-team">${TEAM.map(([n, k, li]) => `<figure><img src="${teamPhoto(k)}" alt="${n}" loading="lazy"><figcaption><b>${n}</b>${li ? `<a href="${li}" target="_blank" rel="noopener" class="f-li">${LINKEDIN} LinkedIn</a>` : ''}</figcaption></figure>`).join('')}</div>
    <p class="f-foot dim">${dataLine()}</p>
  </main>`;
}
