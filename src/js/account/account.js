// Cuentas en astale.com: entrar, guardar escenarios, registrar lo que se hace y recuperarlo al volver.
// Habla con /api/account/* (netlify/functions/account.mts)
// Sin cuenta, todo funciona igual; solo no se guarda
const API = '/api/account/';

export function mountAccount(slot, LANG) {
  if (!slot) return;
  const EN = LANG === 'en', t = (es, en) => (EN ? en : es);
  const esc = (x) => String(x ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
  const fmtT = (ms) => new Date(ms).toLocaleString(LANG, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  let me = null, data = null, queue = [], timer = 0;
  const call = async (path, opt = {}) => { const r = await fetch(API + path, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...opt }); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; };
  const ERR = { bad_email: t('Ese email no parece válido.', 'That email does not look valid.'), short_password: t('La contraseña necesita al menos 8 caracteres.', 'The password needs at least 8 characters.'), exists: t('Ya hay una cuenta con ese email: entra con ella.', 'There is already an account with that email: sign in.'), wrong: t('Email o contraseña incorrectos.', 'Wrong email or password.'), too_many: t('Demasiados intentos. Prueba dentro de 15 minutos.', 'Too many attempts. Try again in 15 minutes.') };

  /* ---------- registro de actividad (en lotes, cada pocos segundos) */
  const DESC = {
    scenario: (d) => t(`Escenario: ${d.name || d.preset} · ${d.mat || ''} · ${d.o2} % O₂`, `Scenario: ${d.name || d.preset} · ${d.mat || ''} · ${d.o2} % O₂`),
    story: () => t('Vio la historia de Orion', 'Watched the Orion story'), ask: (d) => t(`Preguntó: «${d.q}»`, `Asked: "${d.q}"`),
    predict: (d) => t(`Predicción del modelo: ${d.o2} % O₂, ${d.p} atm`, `Model prediction: ${d.o2} % O₂, ${d.p} atm`), tab: (d) => t(`Abrió la pestaña ${d.tab}`, `Opened the ${d.tab} tab`),
    save: (d) => t(`Guardó «${d.name}»`, `Saved "${d.name}"`), login: () => t('Entró', 'Signed in'), register: () => t('Creó su cuenta', 'Created the account'),
  };
  function track(type, detail) {
    if (!me) return;
    queue.push({ type, detail, at: Date.now() });
    clearTimeout(timer); timer = setTimeout(flush, 2500);
  }
  async function flush() { if (!queue.length || !me) return; const ev = queue.splice(0); const r = await call('event', { method: 'POST', body: JSON.stringify({ events: ev }) }); if (r.ok && data) { data.counters = r.j.counters; data.events.push(...ev); drawSpace(); } }
  addEventListener('pagehide', () => { if (queue.length && me) navigator.sendBeacon?.(API + 'event', new Blob([JSON.stringify({ events: queue.splice(0) })], { type: 'application/json' })); });
  let lastScenario = '', scTimer = 0;
  document.addEventListener('astale:event', (e) => {
    const d = e.detail || {};
    if (d.type === 'scenario') { const k = JSON.stringify(d.s); if (k === lastScenario) return; lastScenario = k; clearTimeout(scTimer); scTimer = setTimeout(() => track('scenario', d.s), 1500); return; }
    if (d.type === 'predict') { clearTimeout(d.__t); clearTimeout(window.__astPredT); window.__astPredT = setTimeout(() => track('predict', d.x), 2000); return; }
    track(d.type, d.q ? { q: String(d.q).slice(0, 200) } : d.detail);
  });
  document.addEventListener('pn-tab', (e) => track('tab', { tab: e.detail }));

  /* ---------- interfaz: botón, ventana para entrar y «Mi espacio» */
  slot.innerHTML = `<button type="button" class="ac-btn">👤 <span>${t('Entrar', 'Sign in')}</span></button>`;
  const btn = slot.querySelector('.ac-btn');
  const modal = document.createElement('div'); modal.className = 'ac-modal'; modal.hidden = true;
  modal.innerHTML = `<div class="ac-box" role="dialog">
    <button type="button" class="ac-x" aria-label="×">✕</button>
    <div class="ac-tabs"><button type="button" data-m="login" class="on">${t('Entrar', 'Sign in')}</button><button type="button" data-m="register">${t('Crear cuenta', 'Create account')}</button></div>
    <p class="ac-why">${t('Con una cuenta, Astale guarda tus escenarios y lo que vas haciendo, y al volver lo encuentras todo como lo dejaste.', 'With an account, Astale saves your scenarios and what you do, and when you come back everything is as you left it.')}</p>
    <form class="ac-form" autocomplete="on">
      <label class="ac-name" hidden>${t('Nombre', 'Name')}<input name="name" autocomplete="name" maxlength="60"></label>
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>${t('Contraseña', 'Password')}<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
      <p class="ac-err" hidden></p>
      <button type="submit" class="ac-go">${t('Entrar', 'Sign in')}</button>
      <p class="ac-priv">${t('Solo guardamos tu email, tu nombre, tus escenarios y lo que haces en el panel. La contraseña va cifrada. Nada se comparte con nadie.', 'We only store your email, name, scenarios and what you do on the dashboard. The password is hashed. Nothing is shared with anyone.')}</p>
    </form></div>`;
  const space = document.createElement('aside'); space.className = 'ac-space'; space.hidden = true;
  document.body.append(modal, space);
  let mode = 'login';
  const setMode = (m) => { mode = m; modal.querySelectorAll('.ac-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); modal.querySelector('.ac-name').hidden = m !== 'register'; modal.querySelector('.ac-go').textContent = m === 'register' ? t('Crear cuenta', 'Create account') : t('Entrar', 'Sign in'); modal.querySelector('[name=password]').autocomplete = m === 'register' ? 'new-password' : 'current-password'; };
  modal.querySelector('.ac-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
  modal.querySelector('.ac-x').addEventListener('click', () => (modal.hidden = true));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
  modal.querySelector('.ac-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), err = modal.querySelector('.ac-err');
    err.hidden = true;
    const r = await call(mode, { method: 'POST', body: JSON.stringify({ email: f.get('email'), password: f.get('password'), name: f.get('name') }) });
    if (!r.ok) { err.textContent = ERR[r.j.error] || t('No se ha podido. Inténtalo otra vez.', 'It did not work. Try again.'); err.hidden = false; return; }
    modal.hidden = true; e.target.reset();
    await loadMe(true);
  });
  btn.addEventListener('click', () => { if (me) { space.hidden = !space.hidden; if (!space.hidden) drawSpace(); } else { setMode('login'); modal.hidden = false; setTimeout(() => modal.querySelector('[name=email]').focus(), 30); } });
  window.__astaleAccount = { open: () => btn.click(), signedIn: () => !!me, save: saveCurrent };

  async function saveCurrent() {
    if (!me) { setMode('register'); modal.hidden = false; return; }
    const tw = window.__astaleTwin; if (!tw) return;
    const st = tw.get();
    const name = prompt(t('Nombre para este escenario:', 'Name for this scenario:'), st.label || '') ; if (name === null) return;
    const r = await call('scenario', { method: 'POST', body: JSON.stringify({ name: name || st.label, state: st }) });
    if (r.ok && data) { data.scenarios = r.j.scenarios; drawSpace(); toast(t('Escenario guardado ✓', 'Scenario saved ✓')); }
  }
  function toast(msg, act) {
    const el = document.createElement('div'); el.className = 'ac-toast'; el.innerHTML = `<span>${msg}</span>` + (act ? `<button type="button">${act[0]}</button>` : '');
    if (act) el.querySelector('button').addEventListener('click', () => { act[1](); el.remove(); });
    document.body.append(el); setTimeout(() => el.classList.add('out'), act ? 9000 : 3000); setTimeout(() => el.remove(), act ? 9600 : 3600);
  }
  function drawSpace() {
    if (!data) return;
    const c = data.counters || {}, ev = (data.events || []).slice(-40).reverse();
    space.innerHTML = `<div class="ac-sh"><b>👤 ${esc(data.profile.name)}</b><small>${esc(data.profile.email)}</small><button type="button" class="ac-x2">✕</button></div>
      <div class="ac-stats">${[[c.scenario || 0, t('escenarios probados', 'scenarios tried')], [(data.scenarios || []).length, t('guardados', 'saved')], [c.ask || 0, t('preguntas', 'questions')], [c.predict || 0, t('predicciones', 'predictions')], [data.visits || 1, t('visitas', 'visits')]]
        .map(([n, l]) => `<div><b>${n}</b><small>${l}</small></div>`).join('')}</div>
      <h4>💾 ${t('Mis escenarios', 'My scenarios')} <button type="button" class="ac-save">+ ${t('Guardar el actual', 'Save current')}</button></h4>
      <ul class="ac-list">${(data.scenarios || []).length ? data.scenarios.map((s) => `<li><button type="button" class="ac-load" data-id="${s.id}"><b>${esc(s.name)}</b><small>${fmtT(s.at)} · ${esc(s.state.preset)} · ${s.state.o2} % O₂</small></button><button type="button" class="ac-del" data-id="${s.id}" title="${t('Borrar', 'Delete')}">🗑</button></li>`).join('')
        : `<li class="ac-empty">${t('Aún no has guardado ninguno. En el Fire Twin, pulsa «💾 Guardar».', 'None saved yet. In the Fire Twin, press "💾 Save".')}</li>`}</ul>
      <h4>🕑 ${t('Lo que has hecho', 'What you have done')}</h4>
      <ol class="ac-log">${ev.map((e) => `<li><time>${fmtT(e.at)}</time> ${esc((DESC[e.type] || (() => e.type))(e.detail || {}))}</li>`).join('')}</ol>
      <button type="button" class="ac-out">${t('Salir', 'Sign out')}</button> <button type="button" class="ac-out ac-kill">${t('Borrar mi cuenta', 'Delete my account')}</button>`;
    space.querySelector('.ac-x2').onclick = () => (space.hidden = true);
    space.querySelector('.ac-save').onclick = saveCurrent;
    space.querySelector('.ac-out').onclick = async () => { await flush(); await call('logout', { method: 'POST' }); me = null; data = null; space.hidden = true; paintBtn(); };
    space.querySelector('.ac-kill').onclick = async () => { if (!confirm(t('¿Borrar tu cuenta y todo lo guardado? No se puede deshacer.', 'Delete your account and everything saved? This cannot be undone.'))) return; await call('me', { method: 'DELETE' }); me = null; data = null; space.hidden = true; paintBtn(); };
    space.querySelectorAll('.ac-load').forEach((b) => (b.onclick = () => { const s = data.scenarios.find((x) => x.id === b.dataset.id); if (s && window.__astaleTwin) { window.__astaleTwin.set(s.state); window.__panelTab?.('pn-twin'); space.hidden = true; toast(t(`Cargado «${esc(s.name)}»`, `Loaded "${esc(s.name)}"`)); } }));
    space.querySelectorAll('.ac-del').forEach((b) => (b.onclick = async () => { const r = await call('scenario?id=' + b.dataset.id, { method: 'DELETE' }); if (r.ok) { data.scenarios = r.j.scenarios; drawSpace(); } }));
  }
  const paintBtn = () => { btn.querySelector('span').textContent = me ? me.name : t('Entrar', 'Sign in'); btn.classList.toggle('in', !!me); };
  async function loadMe(fresh) {
    const r = await call('data');
    if (!r.ok) { me = null; data = null; paintBtn(); return; }
    data = r.j; me = data.profile; paintBtn();
    // Al volver: recuperar el último escenario y decirlo
    if (data.last && window.__astaleTwin) {
      const restore = () => { window.__astaleTwin.set(data.last); window.__panelTab?.('pn-twin'); };
      if (fresh) toast(t(`Hola, ${esc(me.name)}. Tu último escenario está guardado.`, `Hi, ${esc(me.name)}. Your last scenario is saved.`), [t('Abrirlo', 'Open it'), restore]);
      else { window.__astaleTwin.set(data.last); toast(t(`Bienvenido de nuevo, ${esc(me.name)}: he recuperado tu último escenario.`, `Welcome back, ${esc(me.name)}: your last scenario is restored.`), [t('Ver mi espacio', 'My space'), () => { space.hidden = false; drawSpace(); }]); }
    } else if (fresh) toast(t(`Hola, ${esc(me.name)}. A partir de ahora se guarda lo que hagas.`, `Hi, ${esc(me.name)}. From now on, what you do is saved.`));
  }
  loadMe(false);
}
