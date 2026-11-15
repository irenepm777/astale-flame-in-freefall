// Redibujar sin destruir los elementos: los botones conservan el foco, :hover, :active y sus animaciones.
// Las pantallas de mando se repintan cada medio segundo; con innerHTML los botones se recreaban y se perdía
// el efecto del ratón y hasta algún toque. morph() compara el HTML nuevo con lo que hay y solo cambia lo distinto,
// así los botones son los mismos elementos y conservan :hover, :active, el foco y sus animaciones.
export function morph(el, html) {
  const t = document.createElement(el.tagName);
  t.innerHTML = html;
  sync(el, t);
}
function sync(a, b) {
  const ac = [...a.childNodes], bc = [...b.childNodes];
  for (let i = 0; i < bc.length; i++) {
    const x = ac[i], y = bc[i];
    if (!x) { a.appendChild(y); continue; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
    if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    const pressed = x.classList.contains('is-pressed');
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) {
      let v = at.value;
      if (at.name === 'class' && pressed) v += ' is-pressed';
      if (x.getAttribute(at.name) !== v) x.setAttribute(at.name, v);
    }
    if (pressed && !y.hasAttribute('class')) x.setAttribute('class', 'is-pressed');
    sync(x, y);
    if (x.tagName === 'INPUT') { x.checked = y.hasAttribute('checked'); if (x !== document.activeElement) x.value = y.getAttribute('value') ?? x.value; }
    if (x.tagName === 'SELECT' && x !== document.activeElement) { const o = y.querySelector('option[selected]'); if (o) x.value = o.value; }
  }
  while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
}

// Al pulsar: un destello inmediato (en las tablets :active a veces no se ve) y una vibración corta si el aparato la tiene
export function pressFeedback(root = document) {
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button:not(:disabled), [role="button"], [data-act], [data-go], a.btn, .f-links a, .iv-links a');
    if (!b) return;
    b.classList.add('is-pressed');
    try { navigator.vibrate?.(12); } catch {}
    setTimeout(() => b.classList.remove('is-pressed'), 260);
  }, { passive: true });
}
