// Escena animada del Fire Twin: dibuja el escenario configurado (nave, fuera, llama, humo, aire, detectores, tripulación)
// y lo reproduce en el tiempo con los resultados del motor. Canvas 2D, sin librerías.

const TXT = {
  es: { fire: '🔥 FUEGO', play: '▶ Reproducir', pause: '⏸ Pausa', none: 'Sin hacer nada', plan: 'Con el plan', smoke: 'Detector de humo', gas: 'Sensor CO', fan: 'Ventilación',
    st: { calm: 'Todo normal', burn: '🔥 Ardiendo', alarm: '🚨 ¡Alarma!', act: '🧯 Actúa la tripulación', out: '✅ Fuego apagado', burnt: '⬛ Se ha consumido', noburn: '✅ No arde', co: '☠️ CO por encima del límite' },
    off: 'apagada', vol: 'Volumen', speed: 'Velocidad', speeds: ['Rápida', 'Normal', 'Lenta'], noplan: '🚫 SIN PLAN: nadie actúa' },
  en: { fire: '🔥 FIRE', play: '▶ Play', pause: '⏸ Pause', none: 'Doing nothing', plan: 'With the plan', smoke: 'Smoke detector', gas: 'CO sensor', fan: 'Ventilation',
    st: { calm: 'All normal', burn: '🔥 Burning', alarm: '🚨 Alarm!', act: '🧯 Crew acts', out: '✅ Fire out', burnt: '⬛ Burned out', noburn: '✅ Does not burn', co: '☠️ CO above the limit' },
    off: 'off', vol: 'Volume', speed: 'Speed', speeds: ['Fast', 'Normal', 'Slow'], noplan: '🚫 NO PLAN: nobody acts' },
};

// Números pseudoaleatorios fijos (las estrellas y el humo no «bailan» entre fotogramas)
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };


// Foto real de la NASA que corresponde al contexto elegido (para comparar con el dibujo)
const REFS = {
  quiet: ['nasa/9902615.jpg', { es: 'Foto real: vela en microgravedad, sin corriente de aire. La llama es una cúpula azul, tenue y casi sin hollín.', en: 'Real photo: a candle in microgravity with no airflow. The flame is a faint blue dome with almost no soot.' }],
  limit: ['nasa/iss040e086481.jpg', { es: 'Foto real (BASS-II): con poco oxígeno la llama es azul, pequeña y aplanada, a punto de apagarse.', en: 'Real photo (BASS-II): with little oxygen the flame is blue, small and flattened, about to go out.' }],
  rich: ['nasa/iss040e023287.jpg', { es: 'Foto real (BASS-II): con oxígeno de sobra la llama crece y brilla en amarillo por dentro (hollín), con el borde azul.', en: 'Real photo (BASS-II): with plenty of oxygen the flame grows and glows yellow inside (soot), with a blue edge.' }],
  flow: ['nasa/iss040e073120.jpg', { es: 'Foto real (BASS-II): con aire forzado la llama es redondeada, azul y abraza la muestra, sin parpadear.', en: 'Real photo (BASS-II): with forced air the flame is rounded, blue and hugs the sample, without flickering.' }],
  partial: ['nasa/vela-tierra-vs-espacio.jpg', { es: 'Foto real: la misma vela con gravedad (izquierda) y en microgravedad (derecha). En la Luna o Marte la llama queda entre las dos; no hay fotos porque casi no hay ensayos.', en: 'Real photo: the same candle with gravity (left) and in microgravity (right). On the Moon or Mars the flame sits in between; there are no photos because there are almost no tests.' }],
  earth: ['nasa/vela-tierra-vs-espacio.jpg', { es: 'Foto real: con gravedad (izquierda) la llama sube y parpadea; en microgravedad (derecha) es esférica y azul.', en: 'Real photo: with gravity (left) the flame rises and flickers; in microgravity (right) it is spherical and blue.' }],
};
const refKey = (s, r) => s.g >= 1 ? 'earth' : s.g > 0 ? 'partial' : (r.vd.st === 'edge' || s.o2 < 19) ? 'limit' : s.u === 0 ? 'quiet' : s.o2 >= 26 ? 'rich' : 'flow';

export function createScene(host, LANG) {
  const L = TXT[LANG];
  host.innerHTML = `
    <div class="fs-bar">
      <button type="button" class="fs-play">${L.play}</button>
      <input type="range" class="fs-time" min="0" max="1000" value="0" aria-label="t">
      <label class="fs-speed fs-vel">${L.speed} <select><option value="1">${L.speeds[0]}</option><option value="0.5" selected>${L.speeds[1]}</option><option value="0.25">${L.speeds[2]}</option></select></label>
      <span class="fs-mode"><label><input type="radio" name="fsmode" value="none"> ${L.none}</label><label><input type="radio" name="fsmode" value="plan" checked> ${L.plan}</label></span>
    </div>
    <div class="fs-stage"><canvas class="fs-canvas" width="960" height="500" role="img"></canvas></div>
    <figure class="fs-ref"><img alt="" loading="lazy"><figcaption></figcaption></figure>`;
  const cv = host.querySelector('.fs-canvas'), ctx = cv.getContext('2d');
  const btn = host.querySelector('.fs-play'), slider = host.querySelector('.fs-time');
  const W = 960, H = 500;
  let S = null, R = null, P = null, tEnd = 600, t = 0, playing = false, mode = 'plan', last = 0, raf = 0, speed = 0.5;
  const spSel = host.querySelector('.fs-vel select');
  try { const v = localStorage.getItem('astale-speed'); if (['1', '0.5', '0.25'].includes(v)) { spSel.value = v; speed = +v; } } catch {}
  spSel.addEventListener('change', () => { speed = +spSel.value || 0.5; try { localStorage.setItem('astale-speed', spSel.value); } catch {} });

  host.querySelectorAll('input[name=fsmode]').forEach((i) => i.addEventListener('change', () => { mode = i.value; api.onMode && api.onMode(mode); draw(); }));
  slider.addEventListener('input', (e) => { if (e.isTrusted) api.story = null; t = (slider.value / 1000) * tEnd; playing = false; btn.textContent = L.play; draw(); });
  btn.addEventListener('click', () => {
    playing = !playing; btn.textContent = playing ? L.pause : L.play;
    if (playing && t >= tEnd) t = 0;
    last = performance.now();
    if (playing) loop();
  });
  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame((now) => {
      const dt = (now - last) / 1000; last = now;
      if (!Number.isFinite(t)) t = 0; // nunca dejar el tiempo en NaN
      if (playing && Number.isFinite(dt)) { t = Math.min(tEnd, t + dt * (tEnd / 16) * speed); if (t >= tEnd) { playing = false; btn.textContent = L.play; } }
      slider.value = (t / tEnd) * 1000;
      draw(now);
      loop(); // seguimos animando el aire y la llama aunque esté en pausa
    });
  }

  /* ---------------- fondos */
  function stars(n, yMax) { ctx.fillStyle = '#fff'; for (let i = 0; i < n; i++) { ctx.globalAlpha = 0.3 + rnd(i) * 0.7; ctx.fillRect(rnd(i + 1) * W, rnd(i + 2) * yMax, rnd(i + 3) > 0.9 ? 2 : 1, rnd(i + 3) > 0.9 ? 2 : 1); } ctx.globalAlpha = 1; }
  function background(world, now) {
    if (world === 'orbit') {
      ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H); stars(160, H);
      const g = ctx.createRadialGradient(W * 0.5, H * 2.35, H * 1.6, W * 0.5, H * 2.35, H * 1.95);
      g.addColorStop(0, '#1d5fbf'); g.addColorStop(0.86, '#3d8ee8'); g.addColorStop(0.93, '#8fd3ff'); g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W * 0.5, H * 2.35, H * 1.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(rnd(i + 40) * W, H * 0.9 + rnd(i + 50) * 40, 40 + rnd(i) * 70, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (world === 'moon') {
      ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, W, H); stars(140, H * 0.7);
      ctx.fillStyle = '#3d7fd6'; ctx.beginPath(); ctx.arc(W * 0.86, H * 0.17, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(W * 0.86 - 5, H * 0.17 - 6, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, H * 0.78, 0, H); g.addColorStop(0, '#8a8a8f'); g.addColorStop(1, '#4b4b50');
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.8, W, H * 0.2);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.ellipse(rnd(i + 70) * W, H * 0.84 + rnd(i + 80) * H * 0.13, 10 + rnd(i) * 30, 4 + rnd(i) * 6, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (world === 'mars') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#c98b5a'); g.addColorStop(0.75, '#e2b48a'); g.addColorStop(1, '#a4532c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#9c4a26'; ctx.beginPath(); ctx.moveTo(0, H * 0.82); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H * 0.8 - rnd(x) * 22); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,.7)'; ctx.beginPath(); ctx.arc(W * 0.14, H * 0.16, 12, 0, Math.PI * 2); ctx.fill();
    } else if (world === 'reentry') {
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2a0600'); g.addColorStop(0.5, '#ff6a00'); g.addColorStop(1, '#ffd27a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,240,200,.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const y = rnd(i) * H, x = ((rnd(i + 9) * W + (now || 0) * 0.6 * (1 + rnd(i))) % (W + 200)) - 100; ctx.beginPath(); ctx.moveTo(W - x, y); ctx.lineTo(W - x - 80, y + 20); ctx.stroke(); }
    } else if (world === 'sea') {
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.55); g.addColorStop(0, '#5aa3e6'); g.addColorStop(1, '#bfe3ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.55);
      ctx.fillStyle = '#12456e'; ctx.fillRect(0, H * 0.55, W, H * 0.45);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      for (let r = 0; r < 6; r++) { ctx.beginPath(); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, H * 0.6 + r * 32 + Math.sin(x / 40 + (now || 0) / 700 + r) * 4); ctx.stroke(); }
    } else { // tierra / rampa
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6fb2ee'); g.addColorStop(0.8, '#d6ecff'); g.addColorStop(1, '#6d8c4a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#5e7d3e'; ctx.fillRect(0, H * 0.85, W, H * 0.15);
    }
  }

  /* ---------------- la nave por dentro */
  function cabinPath(kind, box) {
    const { x, y, w, h } = box;
    ctx.beginPath();
    if (kind === 'module') { ctx.roundRect(x, y, w, h, h / 2); }
    else if (kind === 'capsule') { ctx.moveTo(x + w * 0.08, y + h * 0.12); ctx.lineTo(x + w * 0.62, y); ctx.lineTo(x + w, y + h * 0.28); ctx.lineTo(x + w, y + h * 0.72); ctx.lineTo(x + w * 0.62, y + h); ctx.lineTo(x + w * 0.08, y + h * 0.88); ctx.quadraticCurveTo(x - w * 0.04, y + h * 0.5, x + w * 0.08, y + h * 0.12); }
    else { ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.45); ctx.bezierCurveTo(x, y - h * 0.12, x + w, y - h * 0.12, x + w, y + h * 0.45); ctx.lineTo(x + w, y + h); ctx.closePath(); }
  }

  /* ================= piezas compartidas por los tres estilos ================= */
  function smokeLayer(o) {
    const { burns, mx, bx, my, mh, fansOn, g, tt, tFlameEnd } = o;
    // Humo: partículas que nacen en la llama, viajan con el aire y suben con la gravedad
    if (burns) {
      const sx = mx + bx, sy = my - mh / 2;
      const drift = fansOn ? 0.5 + S.u * 0.25 : 0, rise = g * 2.2;
      for (let i = 0; i < 90; i++) {
        const born = i * (tEnd / 90) * 0.55;
        if (born > tt || born > tFlameEnd) continue;
        const age = Math.min(tt - born, 200);
        const spread = 6 + age * 0.35;
        const px = sx + drift * age + Math.sin(i * 1.7 + age * 0.05) * spread;
        const py = sy - rise * age + Math.cos(i * 2.3 + age * 0.04) * spread * (g === 0 ? 1 : 0.4);
        ctx.fillStyle = `rgba(${o.tint || '150,150,160'},${Math.max(0, 0.35 - age / 600)})`;
        ctx.beginPath(); ctx.arc(px, py, 4 + age * 0.08, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  function flameLayer(o) {
    const { flame, mx, bx, mh, my, fansOn, g, now, box } = o;
    // Llama: su aspecto depende de la gravedad, del aire y del oxígeno (ver «refPhoto» y las fotos de la NASA)
    if (flame > 0) {
      const front = mx + Math.max(bx, 60), back = Math.max(mx - 10, front - 150), top = my - mh / 2;
      const scale = (0.8 + 0.6 * Math.min(1, S.sizeArea / 2050)) * Math.max(0.75, flame);
      const wind = fansOn ? Math.min(1.4, S.u / 10) : 0;
      const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
      if (g < 1) {
        /* MICROGRAVEDAD y gravedad parcial. Lo que muestran BASS-II, Saffire y la vela de la ISS:
           - no hay lenguas ni parpadeo: sin flotabilidad la llama es laminar y casi quieta;
           - es una envoltura fina que abraza la muestra (por las dos caras), con el borde azul;
           - con aire forzado se alarga corriente abajo; sin aire es casi esférica, tenue y pequeña;
           - con más O₂ crece y tiene más hollín (amarillo dentro); cerca del límite es solo azul, pequeña y aplanada;
           - con gravedad parcial se estira algo hacia arriba y oscila un poco. */
        const nearLimit = R.vd.st === 'edge' || S.o2 < 19;
        const soot = nearLimit ? 0.05 : Math.min(0.9, (S.o2 - 19) / 15 + (wind > 0 ? 0.15 : 0) + g * 0.8);
        const zone0 = Math.max(mx, front - 110), zone1 = front;            // zona que pirroliza (lo de atrás ya es carbón)
        const tip = zone1 + (wind > 0 ? 40 + wind * 110 : 14) * scale * (1 + 0.06 * Math.sin(now / 520) + 0.03 * Math.sin(now / 190));    // la llama se alarga corriente abajo
        const tail = zone0 - (wind > 0 ? 6 : 14) * scale;                  // borde de ataque, redondeado
        const breathe = 1 + 0.025 * Math.sin(now / 700) + (g > 0 ? 0.05 * Math.sin(now / 160) : 0);
        const half = (mh / 2 + (nearLimit ? 7 : wind > 0 ? 13 : 22) * scale) * breathe; // separación de la llama
        const up = g * 130 * scale;                                       // gravedad parcial: se estira hacia arriba
        const cy0 = my, dim = (nearLimit ? 0.55 : 1) * (nearLimit ? 0.72 + 0.28 * Math.sin(now / 230) : 0.93 + 0.07 * Math.sin(now / 410));
        const quiet = wind === 0;
        const ecx = (zone0 + zone1) / 2, erx = (zone1 - zone0) / 2 + 26 * scale, ery = half + 6 * scale;
        // Microgravedad: no hay lenguas, pero la llama no está quieta. El borde ondula despacio con ondas que viajan
        // corriente abajo (más hacia la punta), y con gravedad parcial tiembla algo más (vídeos de BASS-II y SoFIE).
        const amp = (2.6 + wind * 3.4 + g * 7) * scale, spd = 260 - Math.min(120, wind * 60);
        const bez = (a, b, c2, d, u) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c2 + u ** 3 * d;
        const env = (ph = 0) => {
          const now2 = now + ph; // ph: desfase para una segunda capa
          ctx.beginPath();
          if (quiet) { // sin aire: casi esférica, con un contorno que respira y se deforma muy poco
            for (let k = 0; k <= 48; k++) {
              const th = k / 48 * Math.PI * 2, rr = 1 + 0.035 * Math.sin(3 * th + now2 / 520) + 0.025 * Math.sin(5 * th - now2 / 330) + (g > 0 ? 0.04 * Math.sin(2 * th + now2 / 140) : 0);
              const x = ecx + Math.cos(th) * erx * rr, y = cy0 - up * 0.5 + Math.sin(th) * (ery + up * 0.5) * rr - (g > 0 && Math.sin(th) < 0 ? up * 0.1 * Math.sin(now2 / 160) : 0);
              k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath(); return;
          }
          const ax = [tail, tail, zone0 + (tip - zone0) * 0.3, tip], ay = [cy0, cy0 - half * 1.2, cy0 - half * 1.05 - up, cy0 - up * 0.6];
          const bx2 = [tip, zone0 + (tip - zone0) * 0.4, tail, tail], by2 = [cy0 - up * 0.6, cy0 + half * 1.0 - up * 0.2, cy0 + half * 1.2, cy0];
          const N = 40;
          for (let k = 0; k <= N; k++) { const u = k / N, e = Math.sin(Math.PI * u) * (0.4 + 0.6 * u), w = (Math.sin(u * 9 - now2 / spd) + 0.35 * Math.sin(u * 17 - now2 / (spd * 0.6))) * amp * e;
            const x = bez(...ax, u), y = bez(...ay, u) - w; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          for (let k = 1; k <= N; k++) { const u = k / N, v = 1 - u, e = Math.sin(Math.PI * v) * (0.4 + 0.6 * v), w = (Math.sin(v * 9 - now2 / spd + 1.3) + 0.35 * Math.sin(v * 17 - now2 / (spd * 0.6))) * amp * e;
            ctx.lineTo(bez(...bx2, u), bez(...by2, u) + w); }
          ctx.closePath();
        };
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // resplandor suave (las llamas de microgravedad son tenues)
        const gx = quiet ? ecx : (tail + tip) / 2, glow = ctx.createRadialGradient(gx, cy0, 4, gx, cy0, Math.max(erx * 1.6, (tip - tail) * 0.8));
        const rgba = (c, a) => 'rgba(' + c + ',' + a.toFixed(3) + ')';
        glow.addColorStop(0, rgba('90,130,255', 0.25 * dim)); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.fillRect(gx - 320, cy0 - 320, 640, 640);
        ctx.globalCompositeOperation = 'source-over'; // la llama tiñe la muestra, no la quema en blanco
        // cuerpo de la llama: azul intenso en el borde de ataque que se desvanece corriente abajo (o desde el centro si no hay aire)
        ctx.save(); env(); ctx.clip();
        const bg = quiet ? ctx.createRadialGradient(ecx, cy0, Math.max(4, erx * 0.3), ecx, cy0, erx * 1.05)
                         : ctx.createLinearGradient(tail, 0, tip, 0);
        if (quiet) { bg.addColorStop(0, rgba('60,90,220', 0.12 * dim)); bg.addColorStop(0.75, rgba('90,140,255', 0.4 * dim)); bg.addColorStop(1, rgba('150,190,255', 0.75 * dim)); }
        else { bg.addColorStop(0, rgba('170,200,255', 0.85 * dim)); bg.addColorStop(0.12, rgba('90,140,255', 0.6 * dim)); bg.addColorStop(0.7, rgba('70,110,255', 0.25 * dim)); bg.addColorStop(1, 'rgba(70,110,255,0)'); }
        ctx.fillStyle = bg; ctx.fillRect(Math.min(tail, ecx - erx) - 5, cy0 - half * 3 - up, (Math.max(tip, ecx + erx) - Math.min(tail, ecx - erx)) + 10, half * 6 + up);
        // hollín amarillo dentro (solo con oxígeno de sobra)
        if (soot > 0.1) {
          const sg = quiet ? ctx.createRadialGradient(ecx, cy0, 2, ecx, cy0, erx * 0.7) : ctx.createLinearGradient(tail, 0, tip, 0);
          const sh = 0.8 + 0.2 * Math.sin(now / 95) * Math.sin(now / 157);
          if (quiet) { sg.addColorStop(0, rgba('255,170,60', 0.6 * soot * sh)); sg.addColorStop(1, 'rgba(255,170,60,0)'); }
          else { sg.addColorStop(0, 'rgba(255,170,60,0)'); sg.addColorStop(0.25, rgba('255,175,60', 0.6 * soot * sh)); sg.addColorStop(0.75, rgba('255,120,30', 0.45 * soot * (1.6 - sh))); sg.addColorStop(1, 'rgba(255,90,20,0)'); }
          ctx.fillStyle = sg; ctx.fillRect(Math.min(tail, ecx - erx) - 5, cy0 - half * 3 - up, (Math.max(tip, ecx + erx) - Math.min(tail, ecx - erx)) + 10, half * 6 + up);
        }
        ctx.restore();
        // borde fino y brillante: la zona de reacción azul
        ctx.shadowColor = 'rgba(110,160,255,.9)'; ctx.shadowBlur = 14;
        env(); ctx.strokeStyle = rgba('140,180,255', 0.6 * dim); ctx.lineWidth = 2; ctx.stroke();
        env(380); ctx.strokeStyle = rgba('180,210,255', 0.28 * dim); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        // el carbón brilla un poco donde arde
        ctx.fillStyle = `rgba(255,90,30,${0.35 * dim})`; ctx.fillRect(zone0, my - mh / 2, zone1 - zone0, mh);
      } else {
      const soot = 1;
      const outer = mix([70, 110, 255], [255, 70, 0], soot), mid = mix([150, 190, 255], [255, 175, 20], soot), core = mix([235, 245, 255], [255, 245, 190], soot);
      // halo
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gx = (back + front) / 2, gy = top - 10, glow = ctx.createRadialGradient(gx, gy, 4, gx, gy, 240 * scale);
      glow.addColorStop(0, `rgba(${outer},.55)`); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(gx - 260, gy - 260, 520, 520);
      // lenguas de fuego: 3 capas (exterior, media, núcleo) que parpadean
      const tongue = (x, w, hgt, lean, col, a) => {
        ctx.fillStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.moveTo(x - w / 2, top + 6);
        ctx.quadraticCurveTo(x - w * 0.55 + lean * 0.3, top - hgt * 0.55, x + lean, top - hgt);
        ctx.quadraticCurveTo(x + w * 0.55 + lean * 0.3, top - hgt * 0.55, x + w / 2, top + 6); ctx.closePath(); ctx.fill();
      };
      const n = 7;
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < n; i++) {
          const k = i / (n - 1), x = back + (front - back) * k;
          const fl = 0.75 + 0.25 * Math.sin(now / (70 + i * 13) + i * 2.1) + 0.12 * Math.sin(now / 37 + i);
          const tall = (g > 0 ? 130 : 85) * scale * (0.55 + 0.45 * Math.sin(Math.PI * k)) * fl;
          const w = (g > 0 ? 50 : 66) * scale * (1 - layer * 0.28);
          const lean = (wind * 34 + (g === 0 ? 10 : 0)) * scale + Math.sin(now / 120 + i) * 4;
          if (layer === 0) tongue(x, w * 1.35, tall * 1.25, lean, outer, 0.55);
          else if (layer === 1) tongue(x, w, tall * 0.9, lean * 0.9, mid, 0.8);
          else tongue(x, w * 0.75, tall * 0.5, lean * 0.7, core, 0.95);
        }
      }
      // chispas
      for (let i = 0; i < 16; i++) {
        const k = ((now / 1400) + rnd(i + 900)) % 1;
        const sx2 = back + (front - back) * rnd(i + 910) + (wind * 60 + 10) * k + Math.sin(i + now / 300) * 6;
        const sy2 = top - (g > 0 ? 120 : 50) * k * scale - rnd(i) * 10;
        ctx.fillStyle = `rgba(${mid},${0.9 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx2, sy2, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      } // fin de la llama con gravedad (1 g o más)
      // etiqueta que señala el fuego
      const lx = (back + front) / 2, ly = Math.max(box.y + 40, top - (g > 0 ? 175 : 115) * scale - 22), pulse = 0.75 + 0.25 * Math.sin(now / 220);
      ctx.strokeStyle = `rgba(255,120,60,${pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly + 14); ctx.lineTo(lx, top - 30 * scale); ctx.stroke();
      ctx.font = '800 22px system-ui, sans-serif'; const lw = ctx.measureText(L.fire).width + 24;
      ctx.fillStyle = `rgba(200,40,20,${0.85 * pulse + 0.1})`; ctx.beginPath(); ctx.roundRect(lx - lw / 2, ly - 16, lw, 32, 16); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(L.fire, lx, ly + 8); ctx.textAlign = 'left';
    }
  }
  function crewLayer(o) {
    const { plan, r, tt, seated, box, g, phase, now } = o;
    const masked = plan && r.tAct != null && tt >= r.tAct;
    // Dos tripulantes: el comandante (franja azul) y el tripulante 2 (franja naranja). Guardamos dónde está su cabeza para los bocadillos.
    const heads = [];
    const crewX = seated ? [0.5, 0.68] : [0.6, 0.79];
    crewX.forEach((fx, who) => {
      if (seated) {
        // Sentado en su asiento, recostado de espaldas al escudo térmico, rodillas en alto, traje naranja y arneses
        const floor = box.y + box.h - 18, sx0 = box.x + box.w * fx, shake = phase === 'reentry' ? Math.sin(now / 35 + who) * 1.5 : 0;
        ctx.save(); ctx.translate(sx0 + shake, floor - 22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const seg = (pts, wdt, col) => { ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
        seg([[-50, -70], [-6, 10], [44, 10], [70, -8]], 12, '#3a4258');
        seg([[10, 12], [10, 22]], 8, '#4b546c'); seg([[-10, 22], [40, 22]], 6, '#4b546c');
        seg([[-30, -50], [2, 0]], 24, '#f08a2c');
        seg([[2, 0], [34, -24], [60, -6]], 14, '#f08a2c');
        seg([[-26, -44], [-8, -16], [16, -12]], 8, '#d9701c');
        seg([[60, -6], [70, -4]], 10, '#2b3550');
        ctx.fillStyle = '#e9ecf3'; ctx.beginPath(); ctx.arc(-38, -68, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = masked ? '#ffb02e' : '#2b3550'; ctx.beginPath(); ctx.ellipse(-30, -66, 7, masked ? 11 : 7, 0.5, 0, Math.PI * 2); ctx.fill();
        seg([[-36, -56], [-2, -6]], 4, '#151a28'); seg([[-20, -62], [-14, -2]], 4, '#151a28'); seg([[-10, 2], [14, 2]], 5, '#151a28');
        ctx.restore();
        heads.push([sx0 - 38, floor - 22 - 86]);
      } else {
        // Flotan en 0 g (cada uno a su ritmo); de pie con gravedad
        const cx = box.x + box.w * fx, cy = g > 0 ? box.y + box.h - 18 - 58 : box.y + box.h * (0.5 + who * 0.06) + Math.sin(now / 900 + who * 2) * 6;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(g === 0 ? Math.sin(now / 1500 + who) * 0.25 : 0);
        ctx.fillStyle = '#e9ecf3'; ctx.beginPath(); ctx.roundRect(-14, -8, 28, 44, 10); ctx.fill();
        ctx.fillRect(-12, 34, 9, 24); ctx.fillRect(3, 34, 9, 24);
        ctx.fillStyle = who === 0 ? '#3d7bff' : '#f08a2c'; ctx.fillRect(-14, 4, 28, 6); // franja: azul comandante, naranja tripulante 2
        ctx.fillStyle = '#e9ecf3'; ctx.beginPath(); ctx.arc(0, -22, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = masked ? '#ffb02e' : '#2b3550'; ctx.beginPath(); ctx.roundRect(-10, -28, 20, masked ? 16 : 10, 5); ctx.fill();
        if (who === 1 && plan && !r.ventWorks && r.tAct != null && tt >= r.tAct && tt < r.tOut + 4) { ctx.fillStyle = '#d32f2f'; ctx.fillRect(-26, 6, 12, 26); } // extintor en la mano
        ctx.restore();
        heads.push([cx, cy - 40]);
      }
    });
    return heads;
  }
  function bubbleLayer(heads, look) {
    ctx.save();
    // Bocadillo de cada tripulante con su orden de este momento
    if (api.orders && mode === 'plan') {
      ctx.font = '600 15px system-ui, sans-serif';
      [api.orders.cdr, api.orders.ms].forEach((txt, who) => {
        if (!txt || !heads[who]) return;
        const [hx, hy] = heads[who];
        const lines = wrap(txt, 230).slice(0, 4);
        const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22, bh = 12 + lines.length * 19;
        const bx2 = Math.min(W - bw - 8, Math.max(8, hx - bw / 2 + (who ? 40 : -40))), by2 = Math.max(110, hy - bh - 26 - who * 4);
        ctx.fillStyle = who ? 'rgba(255,240,225,.96)' : 'rgba(228,238,255,.96)';
        if (look === 'v2') { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 5; }
        ctx.beginPath(); ctx.roundRect(bx2, by2, bw, bh, look === 'v3' ? 3 : look === 'v2' ? 14 : 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(Math.min(Math.max(hx - 8, bx2 + 12), bx2 + bw - 24), by2 + bh); ctx.lineTo(hx, hy - 6); ctx.lineTo(Math.min(Math.max(hx + 10, bx2 + 28), bx2 + bw - 8), by2 + bh); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.fillStyle = who ? '#7a3a00' : '#0c2d6b';
        lines.forEach((l, i) => ctx.fillText(l, bx2 + 11, by2 + 22 + i * 19));
      });
    }

    ctx.restore();
  }
  function captionsLayer(tt) {
    // Subtítulos de la historia (modo demo, para el vídeo)
    if (api.story) {
      let cap = null; for (const c of api.story) if (c.t <= tt) cap = c;
      if (cap) {
        ctx.font = '700 26px system-ui, sans-serif';
        const lines = wrap(cap.text, W - 140);
        const bh = 18 + lines.length * 34, by = H - 62 - bh;
        ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.beginPath(); ctx.roundRect(50, by, W - 100, bh, 14); ctx.fill();
        ctx.strokeStyle = 'rgba(255,154,74,.9)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        lines.forEach((ln, i) => ctx.fillText(ln, W / 2, by + 40 + i * 34));
        ctx.textAlign = 'left';
      }
    }
  }

  // Estado del momento actual (lo mismo que calcula v1, para v2 y v3)
  function calc() {
    const r = R, tt = t, g = S.g, phase = P.phase;
    const world = phase === 'reentry' ? 'reentry' : phase === 'splash' ? 'sea' : g === 0 ? 'orbit' : g < 0.2 ? 'moon' : g < 0.5 ? 'mars' : 'earth';
    const plan = mode === 'plan' && r.tOut != null, tStop = plan ? r.tOut : null, burns = r.vd.st !== 'safe';
    const vMid = Math.sqrt(r.v[0] * r.v[1]), len = S.sizeLen, tBurnEnd = len / vMid;
    const tFlameEnd = Math.min(tBurnEnd, tStop ?? Infinity);
    const burned = burns ? Math.min(len, vMid * Math.min(tt, tFlameEnd)) : 0;
    let flame = 0;
    if (burns && tt < tFlameEnd) flame = Math.min(1, 0.25 + tt / 25);
    else if (burns && tt < tFlameEnd + 8) flame = Math.max(0, 1 - (tt - tFlameEnd) / 8) * 0.8;
    const co = burns ? (plan ? r.curves.planMid(tt) : r.curves.mid(tt)) : 0;
    const fansOn = S.u > 0 && !(plan && r.tAct != null && tt >= r.tAct);
    const seated = phase === 'reentry' || phase === 'splash';
    const extOn = !seated && plan && !r.ventWorks && r.tAct != null && tt >= r.tAct && tt < r.tOut + 4;
    const masked = plan && r.tAct != null && tt >= r.tAct;
    const status = !burns ? L.st.noburn : co > 425 ? L.st.co : (tt >= tFlameEnd + 8) ? (plan ? L.st.out : L.st.burnt)
      : (plan && r.tAct != null && tt >= r.tAct) ? L.st.act : ((r.tDet != null && tt >= r.tDet) ? L.st.alarm : L.st.burn);
    return { r, tt, g, phase, world, plan, burns, len, tFlameEnd, burned, flame, co, fansOn, seated, extOn, masked, status };
  }
  const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  function cabinBox(g, world, maxH) {
    const f = Math.min(1, Math.max(0, Math.log(S.V / 9) / Math.log(388 / 9)));
    const kind = S.V >= 100 ? 'module' : S.V <= 15 ? 'capsule' : (g > 0 && g < 1 ? 'dome' : 'module');
    const w = 560 + 300 * f, h = Math.min(maxH || 999, kind === 'dome' ? 300 : 230 + 60 * f);
    const ground = world === 'moon' || world === 'mars' || world === 'earth';
    return { kind, box: { x: (W - w) / 2, y: ground ? H * 0.82 - h : world === 'sea' ? H * 0.58 - h * 0.62 : (H - h) / 2 - 8, w, h } };
  }
  function noPlanBanner() {
    if (mode !== 'none') return;
    ctx.font = '800 20px system-ui, sans-serif'; const tw = ctx.measureText(L.noplan).width;
    ctx.fillStyle = 'rgba(200,30,30,.88)'; ctx.beginPath(); ctx.roundRect(W - tw - 44, 14, tw + 28, 40, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(L.noplan, W - tw - 30, 41);
  }
  const condText = () => `${P.name} · ${S.g} g · O₂ ${S.o2} % · ${S.p} atm · ${L.fan} ${S.u ? S.u + ' cm/s' : L.off} · ${L.vol} ${S.V} m³`;

  function glassHud(co, tt, status) {
    // panel de cristal: tiempo, indicador de CO y estado
    ctx.save(); ctx.fillStyle = 'rgba(12,18,34,.72)'; ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(16, 16, 380, 104, 16); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#9fb0d6'; ctx.font = '700 12px system-ui, sans-serif'; ctx.fillText('T +', 32, 40);
    ctx.fillStyle = '#fff'; ctx.font = '700 34px system-ui, sans-serif'; ctx.fillText(mmss(tt), 32, 74);
    ctx.fillStyle = '#e8ebf4'; ctx.font = '600 17px system-ui, sans-serif'; ctx.fillText(status, 32, 104);
    // indicador circular de CO con la marca del límite de 1 h
    const gx = 330, gy = 66, gr = 34, maxC = 425 * 1.6, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, frac = Math.min(1, co / maxC);
    ctx.lineCap = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = '#26304a'; ctx.beginPath(); ctx.arc(gx, gy, gr, a0, a1); ctx.stroke();
    ctx.strokeStyle = co > 425 ? '#ff6060' : co > 50 ? '#ffc04d' : '#5fe39a'; ctx.beginPath(); ctx.arc(gx, gy, gr, a0, a0 + (a1 - a0) * frac); ctx.stroke();
    const al = a0 + (a1 - a0) * (425 / maxC); ctx.strokeStyle = '#ff6060'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx + Math.cos(al) * (gr - 8), gy + Math.sin(al) * (gr - 8)); ctx.lineTo(gx + Math.cos(al) * (gr + 8), gy + Math.sin(al) * (gr + 8)); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.fillStyle = '#fff'; ctx.font = '800 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.round(co), gx, gy + 4);
    ctx.fillStyle = '#9fb0d6'; ctx.font = '700 10px system-ui, sans-serif'; ctx.fillText('CO ppm', gx, gy + 18); ctx.textAlign = 'left';
    noPlanBanner();
    ctx.save(); ctx.fillStyle = 'rgba(12,18,34,.72)'; ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.beginPath(); ctx.roundRect(16, H - 52, W - 32, 36, 12); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#d6def0'; ctx.font = '600 16px system-ui, sans-serif'; ctx.fillText(condText(), 30, H - 28);
  }

  /* ================= la escena (versión cuidada) ================= */
  function astronautV2(cx, cy, who, masked, rot, extOn, now) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.lineCap = 'round';
    const sw = Math.sin(now / 800 + who * 2);
    // mochila
    ctx.fillStyle = '#aeb5c4'; ctx.beginPath(); ctx.roundRect(-20, -10, 40, 42, 9); ctx.fill();
    // brazos y piernas (con un balanceo suave)
    const limb = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
    limb([[-8, 32], [-11 - sw * 2, 50], [-9 - sw * 3, 64]], 11, '#dfe3ec'); limb([[8, 32], [11 + sw * 2, 50], [10 + sw * 3, 64]], 11, '#dfe3ec');
    ctx.fillStyle = '#3a4258'; ctx.beginPath(); ctx.roundRect(-16 - sw * 3, 60, 14, 9, 4); ctx.fill(); ctx.beginPath(); ctx.roundRect(3 + sw * 3, 60, 14, 9, 4); ctx.fill();
    limb([[-14, -2], [-26, 14 + sw * 3], [-22, 28 + sw * 2]], 9, '#e6e9f0');
    limb([[14, -2], [26, 14 - sw * 3], [24, 28 - sw * 2]], 9, '#e6e9f0');
    // torso con volumen
    const tg = ctx.createLinearGradient(-16, 0, 16, 0); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#c6ccd9');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.roundRect(-16, -8, 32, 44, 12); ctx.fill();
    ctx.fillStyle = who === 0 ? '#3d7bff' : '#f08a2c'; ctx.beginPath(); ctx.roundRect(-16, 6, 32, 6, 2); ctx.fill();
    ctx.fillStyle = '#2b3550'; ctx.beginPath(); ctx.roundRect(-8, 15, 16, 11, 3); ctx.fill();
    ['#4ade80', '#fbbf24', '#f87171'].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-4 + k * 4, 20.5, 1.5, 0, Math.PI * 2); ctx.fill(); });
    // casco con visera dorada y reflejo
    const hg = ctx.createRadialGradient(-5, -30, 3, 0, -24, 19); hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#c9cfdb');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -24, 18, 0, Math.PI * 2); ctx.fill();
    const vg = ctx.createLinearGradient(-12, -32, 12, -14); vg.addColorStop(0, '#ffe29a'); vg.addColorStop(0.5, '#e09a2d'); vg.addColorStop(1, '#7a4310');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(0, -24, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-3, -27, 7, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    if (masked) { // mascarilla de oxígeno (PBA) con su tubo
      ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(0, -17, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, -13); ctx.quadraticCurveTo(22, -4, 14, 10); ctx.stroke();
    }
    if (extOn) { ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.roundRect(-34, 8, 12, 28, 4); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(-31, 4, 6, 5); }
    ctx.restore();
    return [cx, cy - 46];
  }
  function drawV2(now) {
    const c = calc(); const { r, tt, g, phase, world, plan, burns, len, tFlameEnd, burned, flame, co, fansOn, seated, extOn, masked, status } = c;
    background(world, now);
    // luz de ambiente: nebulosa suave en el espacio
    if (world === 'orbit' || world === 'moon') {
      const n = ctx.createRadialGradient(W * 0.18, H * 0.2, 10, W * 0.18, H * 0.2, W * 0.55);
      n.addColorStop(0, 'rgba(130,90,220,.22)'); n.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = n; ctx.fillRect(0, 0, W, H);
    }
    const { kind, box } = cabinBox(g, world);
    const outer = { x: box.x - 18, y: box.y - 18, w: box.w + 36, h: box.h + 36 };
    // casco metálico con sombra y costillas
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 14;
    cabinPath(kind, outer);
    const hg = ctx.createLinearGradient(0, outer.y, 0, outer.y + outer.h);
    hg.addColorStop(0, '#f4f6fa'); hg.addColorStop(0.4, '#c3c8d3'); hg.addColorStop(0.6, '#9ba2b1'); hg.addColorStop(1, '#565d6c');
    ctx.fillStyle = hg; ctx.fill(); ctx.restore();
    ctx.save(); cabinPath(kind, outer); ctx.clip();
    ctx.strokeStyle = 'rgba(40,46,62,.35)'; ctx.lineWidth = 2;
    for (let k = 1; k < 9; k++) { const x = outer.x + outer.w * k / 9; ctx.beginPath(); ctx.moveTo(x, outer.y); ctx.lineTo(x, outer.y + outer.h); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(outer.x, outer.y + 6, outer.w, 3);
    ctx.restore();
    // interior con profundidad
    cabinPath(kind, box);
    const ig = ctx.createLinearGradient(0, box.y, 0, box.y + box.h); ig.addColorStop(0, '#2b3452'); ig.addColorStop(0.5, '#171d30'); ig.addColorStop(1, '#0c101c');
    ctx.fillStyle = ig; ctx.fill();
    ctx.save(); cabinPath(kind, box); ctx.clip();
    const inset = { x: box.x + box.w * 0.13, y: box.y + box.h * 0.2, w: box.w * 0.74, h: box.h * 0.6 };
    ctx.strokeStyle = 'rgba(150,170,220,.16)'; ctx.lineWidth = 1.5;
    [[box.x, box.y, inset.x, inset.y], [box.x + box.w, box.y, inset.x + inset.w, inset.y], [box.x, box.y + box.h, inset.x, inset.y + inset.h], [box.x + box.w, box.y + box.h, inset.x + inset.w, inset.y + inset.h]]
      .forEach(([a, b, c2, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); });
    const wg = ctx.createLinearGradient(0, inset.y, 0, inset.y + inset.h); wg.addColorStop(0, '#222a42'); wg.addColorStop(1, '#151a2b');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.roundRect(inset.x, inset.y, inset.w, inset.h, 16); ctx.fill();
    // racks con pilotos
    for (let k = 0; k < 6; k++) {
      const rx = inset.x + 14 + k * (inset.w - 28) / 6, rw = (inset.w - 28) / 6 - 10;
      const rg = ctx.createLinearGradient(rx, 0, rx + rw, 0); rg.addColorStop(0, '#2c3552'); rg.addColorStop(1, '#222a43');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.roundRect(rx, inset.y + 12, rw, inset.h - 24, 6); ctx.fill();
      for (let j = 0; j < 4; j++) { ctx.fillStyle = ['#4ade80', '#60a5fa', '#fbbf24', '#4ade80'][(j + k) % 4]; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 500 + j + k); ctx.beginPath(); ctx.arc(rx + 8 + j * 7, inset.y + 22, 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(120,140,190,.18)'; ctx.lineWidth = 1; for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(rx + 4, inset.y + 12 + j * (inset.h - 24) / 4); ctx.lineTo(rx + rw - 4, inset.y + 12 + j * (inset.h - 24) / 4); ctx.stroke(); }
    }
    // pasamanos amarillos (como en la ISS)
    ctx.strokeStyle = 'rgba(240,200,90,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(inset.x + 20, inset.y + inset.h + 14); ctx.lineTo(inset.x + inset.w - 20, inset.y + inset.h + 14); ctx.stroke();
    // luces del techo
    for (let k = 0; k < 4; k++) {
      const lx = box.x + box.w * (0.2 + k * 0.2), ly = box.y + 8;
      ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.roundRect(lx - 22, ly, 44, 5, 2); ctx.fill();
      const lg = ctx.createRadialGradient(lx, ly, 2, lx, ly + 40, 140); lg.addColorStop(0, 'rgba(210,225,255,.16)'); lg.addColorStop(1, 'rgba(210,225,255,0)');
      ctx.fillStyle = lg; ctx.fillRect(lx - 150, ly, 300, 200);
    }
    if (g > 0) { const fg = ctx.createLinearGradient(0, box.y + box.h - 22, 0, box.y + box.h); fg.addColorStop(0, '#2a3248'); fg.addColorStop(1, '#141a28'); ctx.fillStyle = fg; ctx.fillRect(box.x, box.y + box.h - 22, box.w, 22); }
    // la muestra que arde, sujeta a su soporte, con textura de tejido y carbón con brasa
    const mx = box.x + box.w * 0.16, my = box.y + box.h * (g > 0 ? 0.62 : 0.5);
    const mw = 70 + 130 * Math.min(1, len / 1000), mh = 26 + 30 * Math.min(1, S.sizeArea / 4100);
    ctx.fillStyle = '#3a4258'; ctx.fillRect(mx - 10, my - 3, 10, 6); ctx.fillRect(mx + mw, my - 3, 10, 6);
    const base = { sibal: ['#efe2c0', '#c9b58a'], pmma_s: ['rgba(200,230,255,.75)', 'rgba(140,190,240,.55)'], pmma_r: ['rgba(200,230,255,.75)', 'rgba(140,190,240,.55)'], nomex: ['#e6c04a', '#b08a1c'], silicone: ['#b9c1d2', '#8a93a7'] }[S.mat] || ['#ccc', '#999'];
    const mg = ctx.createLinearGradient(0, my - mh / 2, 0, my + mh / 2); mg.addColorStop(0, base[0]); mg.addColorStop(1, base[1]);
    ctx.fillStyle = mg; ctx.beginPath(); ctx.roundRect(mx, my - mh / 2, mw, mh, 4); ctx.fill();
    if (S.mat === 'sibal' || S.mat === 'nomex') { ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1; for (let x = mx + 4; x < mx + mw; x += 5) { ctx.beginPath(); ctx.moveTo(x, my - mh / 2); ctx.lineTo(x, my + mh / 2); ctx.stroke(); } }
    const bx = mw * (burned / len);
    if (bx > 0) {
      const cg = ctx.createLinearGradient(mx, 0, mx + bx, 0); cg.addColorStop(0, '#0d0a09'); cg.addColorStop(0.85, '#241612'); cg.addColorStop(1, flame > 0 ? '#ff5a1f' : '#3a2418');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.roundRect(mx, my - mh / 2, bx, mh, 4); ctx.fill();
    }
    // corriente de aire: estelas suaves
    if (fansOn) {
      const sp = 0.02 + S.u * 0.012;
      for (let i = 0; i < 22; i++) {
        const yy = box.y + box.h * (0.16 + 0.68 * rnd(i + 200)), xx = box.x + (((now * sp * (0.7 + rnd(i) * 0.6)) + rnd(i + 300) * box.w) % box.w);
        const sg = ctx.createLinearGradient(xx - 40, 0, xx, 0); sg.addColorStop(0, 'rgba(150,210,255,0)'); sg.addColorStop(1, 'rgba(150,210,255,.4)');
        ctx.strokeStyle = sg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xx - 40, yy); ctx.lineTo(xx, yy); ctx.stroke();
      }
    }
    const fanV2 = (x, y) => { ctx.save(); ctx.translate(x, y);
      const fg2 = ctx.createRadialGradient(0, 0, 2, 0, 0, 20); fg2.addColorStop(0, '#46557c'); fg2.addColorStop(1, '#1e2538'); ctx.fillStyle = fg2; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7f93bd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(fansOn ? now / 120 : 0); ctx.fillStyle = '#a9bbe0'; for (let k = 0; k < 5; k++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(8, 0, 8, 3, 0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore(); };
    fanV2(box.x + 32, box.y + box.h * 0.3); fanV2(box.x + box.w - 36, box.y + box.h * 0.3);
    smokeLayer({ burns, mx, bx, my, mh, fansOn, g, tt, tFlameEnd, tint: '175,178,192' });
    flameLayer({ flame, mx, bx, mh, my, fansOn, g, now, box });
    if (extOn) {
      const ax = box.x + box.w * 0.79 - 30, ay = box.y + box.h * 0.56, tx = mx + bx, ty = my - mh / 2;
      for (let i = 0; i < 60; i++) { const k = ((now / 600 + rnd(i)) % 1); ctx.fillStyle = `rgba(240,248,255,${0.55 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(ax + (tx - ax) * k + (rnd(i + 5) - 0.5) * 36 * k, ay + (ty - ay) * k + (rnd(i + 6) - 0.5) * 36 * k, 3 + 8 * k, 0, Math.PI * 2); ctx.fill(); }
    }
    const haze = Math.min(0.5, co / 900);
    if (haze > 0.01) { ctx.fillStyle = co > 425 ? `rgba(150,60,50,${haze})` : `rgba(120,120,130,${haze})`; ctx.fillRect(box.x, box.y, box.w, box.h); }
    // detectores: cápsulas con piloto que brilla
    const det = (x, y, on, label) => { ctx.fillStyle = '#0b0f1c'; ctx.beginPath(); ctx.roundRect(x - 30, y - 15, 60, 30, 15); ctx.fill();
      ctx.strokeStyle = on ? '#ff4d4d' : 'rgba(61,220,132,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = on ? '#ff4d4d' : '#3ddc84'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = on ? 22 + 8 * Math.sin(now / 120) : 8; ctx.beginPath(); ctx.arc(x - 14, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#dfe5f3'; ctx.font = '700 14px system-ui, sans-serif'; ctx.fillText(label, x - 2, y + 5); };
    det(box.x + box.w - 40, box.y + box.h * 0.3 + 38, burns && r.tSmoke != null && tt >= r.tSmoke, '💨');
    det(box.x + box.w * 0.5, box.y + 56, burns && r.tGas != null && tt >= r.tGas, 'CO');
    // tripulación
    let heads;
    if (seated) heads = crewLayer({ plan, r, tt, seated, box, g, phase, now });
    else heads = [0.6, 0.79].map((fx, who) => {
      const cx = box.x + box.w * fx, cy = g > 0 ? box.y + box.h - 22 - 68 : box.y + box.h * (0.5 + who * 0.06) + Math.sin(now / 900 + who * 2) * 6;
      return astronautV2(cx, cy, who, masked, g === 0 ? Math.sin(now / 1500 + who) * 0.22 : 0, extOn && who === 1, now);
    });
    // viñeta interior
    const vg2 = ctx.createRadialGradient(box.x + box.w / 2, box.y + box.h / 2, box.h * 0.3, box.x + box.w / 2, box.y + box.h / 2, box.w * 0.6);
    vg2.addColorStop(0, 'rgba(0,0,0,0)'); vg2.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg2; ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
    // brillo del borde
    cabinPath(kind, box); const eg = ctx.createLinearGradient(0, box.y, 0, box.y + box.h); eg.addColorStop(0, 'rgba(255,255,255,.55)'); eg.addColorStop(1, 'rgba(255,255,255,.08)');
    ctx.strokeStyle = eg; ctx.lineWidth = 2.5; ctx.stroke();
    // antena
    const anX = box.x + box.w * 0.88, anY = outer.y - 2;
    ctx.strokeStyle = '#dfe5f3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(anX, anY + 6); ctx.lineTo(anX, anY - 22); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(anX, anY - 24, 4.5, 0, Math.PI * 2); ctx.fill();
    if (api.orders && mode === 'plan' && now - api.orders.at < 3500) for (let k = 0; k < 3; k++) { const ph = (Math.max(0, now - api.orders.at) / 900 + k / 3) % 1; /* max(0,…): si now va un pelo por detrás de orders.at, ph sería negativo y arc() daría error de radio negativo */
      ctx.strokeStyle = 'rgba(140,210,255,' + (0.85 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(anX, anY - 24, 8 + ph * 46, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke(); }
    bubbleLayer(heads, 'v2');
    // viñeta general
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    glassHud(co, tt, status);
    captionsLayer(tt);
  }

  function draw(now = performance.now()) {
    if (!S) return;
    if (api.onTime) api.onTime(t);
    ctx.save(); drawV2(now); ctx.restore(); // un solo diseño: el dibujo (Fer, 14-11: fuera el realista y el 3D)
  }
  function wrap(text, maxW) {
    const words = text.split(' '), out = []; let cur = '';
    for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { out.push(cur); cur = w; } else cur = tst; }
    if (cur) out.push(cur); return out;
  }

  const api = {
    story: null, // [{t, text}] subtítulos del modo historia
    get tEnd() { return tEnd; }, // para grabar el vídeo fotograma a fotograma
    get t() { return t; },
    orders: null, // {cdr, ms, ground, at}: orden de cada uno en este momento (la pone la tarjeta de acción)
    get mode() { return mode; },
    onMode: null, // avisa al Fire Twin cuando se cambia entre «Sin hacer nada» y «Con el plan»
    play() { t = 0; mode = 'plan'; api.onMode && api.onMode(mode); host.querySelector('input[name=fsmode][value=plan]').checked = true; playing = true; btn.textContent = L.pause; last = performance.now(); loop(); },
    onTime: null, // la tarjeta de acción escucha el tiempo para iluminar el momento actual
    update(s, r, preset, end) {
      const fresh = !S || S.preset !== s.preset || S.mat !== s.mat;
      S = s; R = r; P = preset; tEnd = end;
      const [img, cap] = REFS[refKey(s, r)]; const fig = host.querySelector('.fs-ref');
      if (fig.dataset.img !== img) { fig.querySelector('img').src = 'assets/img/' + img; fig.dataset.img = img; }
      fig.querySelector('figcaption').textContent = cap[LANG];
      if (fresh) t = 0;
      t = Math.min(t, tEnd);
      slider.value = (t / tEnd) * 1000;
      draw();
      if (!raf) loop();
    },
  };
  window.__astaleScene = api; // acceso para grabar el vídeo (scripts de prueba)
  return api;
}
