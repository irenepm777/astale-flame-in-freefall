// ─────────────────────────────────────────────────────────────────────────────
// format.js - Small formatting helpers shared by every screen of the protocol
//
//   esc(text)        escapes text before it goes into HTML
//   nf(x, decimals)  number with the decimal separator of the current language (0.5 / 0,5)
//   duration(s)      seconds as "45 s" or "3:20 min" ("—" if there is no value)
//   clock(s)         mission clock since the fire started: "T+3:20"
// ─────────────────────────────────────────────────────────────────────────────
import { LANG } from './i18n.js';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const nf = (x, d = 0) => (LANG === 'en' ? Number(x).toFixed(d) : Number(x).toFixed(d).replace('.', ','));

export const duration = (s) => (s == null ? '—' : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min`);

export const clock = (s) => `T+${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
