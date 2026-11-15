// Tutorial guiado (overlay con «foco»): oscurece la página, ilumina un elemento cada vez y explica qué hacer.
// startTour(steps, { lang, onEnd }) · step = { el: Element | () => Element, title, text }
export function startTour(steps, { lang = 'es', onEnd } = {}) {
  const EN = lang === 'en';
  let i = 0, raf = 0;
  const wrap = document.createElement('div');
  wrap.className = 'tour';
  wrap.innerHTML = `<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-live="polite">
    <div class="tour-step"></div><h3></h3><p></p>
    <div class="tour-btns"><button type="button" class="tour-skip">${EN ? 'Skip tutorial' : 'Saltar tutorial'}</button>
      <span class="tour-dots"></span>
      <button type="button" class="tour-prev">← ${EN ? 'Back' : 'Atrás'}</button><button type="button" class="tour-next"></button></div></div>`;
  document.body.append(wrap);
  const hole = wrap.querySelector('.tour-hole'), card = wrap.querySelector('.tour-card');
  const elOf = (s) => (typeof s.el === 'function' ? s.el() : s.el);

  function place() {
    const el = elOf(steps[i]);
    if (!el) return;
    const r = el.getBoundingClientRect(), pad = 8;
    const top = Math.max(6, r.top - pad), left = Math.max(6, r.left - pad);
    const bottom = Math.min(innerHeight - 6, r.bottom + pad), right = Math.min(innerWidth - 6, r.right + pad);
    Object.assign(hole.style, { top: top + 'px', left: left + 'px', width: Math.max(0, right - left) + 'px', height: Math.max(0, bottom - top) + 'px' });
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 18;
    let x, y;
    if (innerWidth - right > cw + gap + 10) { x = right + gap; y = top; }               // a la derecha
    else if (left > cw + gap + 10) { x = left - gap - cw; y = top; }                    // a la izquierda
    else if (innerHeight - bottom > ch + gap) { x = left; y = bottom + gap; }           // debajo
    else { x = left; y = Math.max(10, top - gap - ch); }                                // encima
    card.style.left = Math.min(innerWidth - cw - 10, Math.max(10, x)) + 'px';
    card.style.top = Math.min(innerHeight - ch - 10, Math.max(10, y)) + 'px';
  }
  function loop() { place(); raf = requestAnimationFrame(loop); }
  function go(k) {
    i = k;
    const s = steps[i], el = elOf(s);
    el?.scrollIntoView({ behavior: 'smooth', block: el.getBoundingClientRect().height > innerHeight * 0.8 ? 'start' : 'center' });
    wrap.querySelector('.tour-step').textContent = (EN ? 'Step ' : 'Paso ') + (i + 1) + ' / ' + steps.length;
    wrap.querySelector('h3').textContent = s.title;
    wrap.querySelector('p').innerHTML = s.text;
    wrap.querySelector('.tour-prev').hidden = i === 0;
    wrap.querySelector('.tour-next').textContent = i === steps.length - 1 ? (EN ? 'Got it, let me try ✓' : 'Entendido, a probar ✓') : (EN ? 'Next →' : 'Siguiente →');
    wrap.querySelector('.tour-dots').innerHTML = steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  }
  function end() { cancelAnimationFrame(raf); wrap.remove(); removeEventListener('keydown', key); onEnd && onEnd(); }
  const key = (e) => { if (e.key === 'Escape') end(); else if (e.key === 'ArrowRight' || e.key === 'Enter') next(); else if (e.key === 'ArrowLeft' && i) go(i - 1); };
  const next = () => (i < steps.length - 1 ? go(i + 1) : end());
  wrap.querySelector('.tour-next').addEventListener('click', next);
  wrap.querySelector('.tour-prev').addEventListener('click', () => i && go(i - 1));
  wrap.querySelector('.tour-skip').addEventListener('click', end);
  addEventListener('keydown', key);
  go(0); loop();
  return { end };
}
