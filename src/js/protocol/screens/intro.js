// ─────────────────────────────────────────────────────────────────────────────
// intro.js - Animated intro: why the protocol exists, in NASA's own words
//
// Full-screen overlay before the home page: two quotes from NASA reports on human performance under stress,
// word by word with their clickable source, then the name "ASTALE · Space Fire Response Protocol".
// Shown once per browser tab (sessionStorage), never with a deep link (?d=), ?nointro or an anchor.
// A tap moves to the next slide; Skip, Esc or Enter close it. The Spanish quotes are translations (the page says so).
// ─────────────────────────────────────────────────────────────────────────────
import { t, LANG } from '../i18n.js';
import { NASA_HRP, NASA_TM } from '../sources.js';

const DURATION = [5200, 5200, 3200]; // ms per slide

export function intro() {
  const q = new URLSearchParams(location.search);
  let seen = false; try { seen = sessionStorage.getItem('astale-intro') === '1'; } catch {}
  if (seen || q.has('d') || q.has('nointro') || location.hash) return;
  try { sessionStorage.setItem('astale-intro', '1'); } catch {}

  const words = (text) => text.split(' ').map((w, i) => `<span class="iw" style="--i:${i}">${w}</span>`).join(' ');
  const slides = [
    { q: t('«Cuando el estrés se vuelve extremo, la persona puede bloquearse o entrar en pánico.»', '“When stress becomes extreme, the individual might ‘choke’ or panic.”'),
      src: 'NASA Human Research Program · Evidence Report: Risk of Performance Errors Due to Training Deficiencies (Johnson Space Center, 2016), p. 8', url: NASA_HRP + '#page=12' },
    { q: t('«Bajo estrés, procesos de memoria normalmente fiables pueden fallar.»', '“Under stress, normally reliable memory processes can fail.”'),
      src: 'NASA Ames Research Center · The Challenge of Aviation Emergency and Abnormal Situations (NASA/TM-2005-213462), p. 8', url: NASA_TM + '#page=13' },
  ];
  const el = document.createElement('div');
  el.className = 'f-intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Astale');
  el.innerHTML = slides.map((s) => `<section class="ii"><blockquote>${words(s.q)}</blockquote><a class="isrc" href="${s.url}" target="_blank" rel="noopener">${s.src} ↗</a></section>`).join('')
    + `<section class="ii ii-name"><b>ASTALE</b><span>${t('Protocolo de respuesta a incendios en el espacio', 'Space Fire Response Protocol')}</span><small>${t('Una orden cada vez, con la ciencia de la NASA detrás', 'One order at a time, backed by NASA science')}</small></section>`
    + `<button class="iskip" type="button">${t('Saltar', 'Skip')} ›</button>`
    + (LANG === 'es' ? '<small class="inote">Citas traducidas del inglés; el original está en cada enlace.</small>' : '');
  document.body.append(el);

  const slideEls = [...el.querySelectorAll('.ii')];
  let k = -1, timer = 0, finished = false;
  const end = () => { if (finished) return; finished = true; clearTimeout(timer); el.classList.add('out'); setTimeout(() => el.remove(), 900); };
  const next = () => { if (k >= 0) slideEls[k].classList.remove('on'); k++; if (k >= slideEls.length) return end(); slideEls[k].classList.add('on'); timer = setTimeout(next, DURATION[k]); };
  el.addEventListener('click', (e) => { if (e.target.closest('.isrc')) return; if (e.target.closest('.iskip')) end(); else { clearTimeout(timer); next(); } });
  addEventListener('keydown', (e) => { if (!finished && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); end(); } });
  setTimeout(next, 250);
}
