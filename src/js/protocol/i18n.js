// ─────────────────────────────────────────────────────────────────────────────
// i18n.js - Language of the Fire Response Protocol: English or Spanish
//
// The protocol is one page that switches language in place, even in the middle of an incident.
// Every text is written in both languages with t(es, en), like the rest of the project.
// The choice is shared with the Panel (same localStorage key, 'astale-pub-lang').
//   ?lang=es | ?lang=en   forces a language (and remembers it)
//   otherwise             the saved choice, or the browser language
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'astale-pub-lang';

function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'es' || q === 'en') { try { localStorage.setItem(KEY, q); } catch {} return q; }
  try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'es') return v; } catch {}
  return (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

export let LANG = initialLang();

/** Picks the text for the current language. */
export const t = (es, en) => (LANG === 'en' ? en : es);

/** Runs f() as if the page were in language l (used to build each action in both languages at once). */
export function inLang(l, f) {
  const prev = LANG; LANG = l;
  try { return f(); } finally { LANG = prev; }
}

function applyLang() {
  document.documentElement.lang = LANG;
  document.title = t('Astale · Protocolo de respuesta a incendios en el espacio', 'Astale · Space Fire Response Protocol');
}
applyLang();

/** Changes the language and remembers it. Returns false if l is not a supported language. */
export function setLang(l) {
  if (l !== 'es' && l !== 'en') return false;
  LANG = l;
  try { localStorage.setItem(KEY, l); } catch {}
  applyLang();
  return true;
}

/** Speech language for the browser's speech synthesis and recognition. */
export const speechLang = () => t('es-ES', 'en-US');
