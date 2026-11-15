// ─────────────────────────────────────────────────────────────────────────────
// thermal-camera.js - Simulated thermal camera of the burning room (command screen)
//
// Dense smoke is drawn as a warm haze (a real thermal camera sees through smoke, but without detail), so the room
// itself is never drawn. In microgravity the fire is a round ball (no rising current to stretch it); with partial
// gravity (Moon, Mars) it stretches upwards. When the fire goes out the flame fades in 1–2 s and only a small hot
// residue remains, cooling down. Everything comes from the simulation state (world.t, world.out, gravity).
// The image is computed at 160 × 80 and scaled up smoothly; ~20 frames per second, independent of the page redraw.
// ─────────────────────────────────────────────────────────────────────────────
import { t } from './i18n.js';
import { app, world as W } from './state.js';

// "Ironbow" palette of thermal cameras: black → purple → red → orange → yellow → white
const IRON = (() => {
  const stops = [[0, 0, 0, 0], [0.18, 40, 0, 90], [0.38, 140, 0, 140], [0.55, 220, 40, 60], [0.72, 255, 130, 0], [0.88, 255, 220, 40], [1, 255, 255, 230]];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255; let k = 0; while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
    const [a, b] = [stops[k], stops[k + 1]], f = (v - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f;
  }
  return lut;
})();

const TW = 160, TH = 80;
let off, offCtx, img, last = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (now - last < 50) return; last = now;
  const cv = document.getElementById('f-therm'); if (!cv || app.screen !== 'command' || !W.plan) return;
  const p = W.plan, burning = p.vd.st !== 'safe', out = W.out != null && W.t > W.out, sec = now / 1000;
  const grow = Math.min(1, W.t / 60);
  const dtOut = out ? W.t - W.out : 0;
  const flame = !burning ? 0 : out ? (0.35 + 0.65 * Math.min(1, W.out / 60)) * Math.exp(-dtOut / 0.8) : 0.35 + 0.65 * grow; // flame intensity 0–1
  const residue = burning && out ? 0.3 * Math.exp(-dtOut / 90) : 0, I = flame + residue;
  const smoke = !burning ? 0.05 : out ? Math.max(0.15, Math.min(1, W.out / 40) * Math.exp(-(W.t - W.out) / 180)) : Math.min(1, 0.25 + W.t / 40);
  const g = p.s.g || 0, stretch = 1 + 0.7 * Math.min(1, g * 2);
  const shift = app.camPan * TW * 0.9, cx = TW * 0.5 - shift, cy = TH * (0.55 + 0.04 * (stretch - 1)), r0 = (7 + 9 * grow) * (0.6 + 0.4 * Math.min(1, I * 1.4));
  const d = img.data;
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    // smoke: warm haze moving slowly
    const xs = x + shift, n = 0.5 + 0.25 * Math.sin(xs * 0.11 + sec * 0.6 + Math.sin(y * 0.09 + sec * 0.35) * 2.2) + 0.25 * Math.sin(y * 0.15 - sec * 0.45 + Math.sin(xs * 0.07 - sec * 0.2) * 2);
    let v = 0.1 + 0.05 * n + smoke * (0.16 + 0.14 * n) * (0.6 + 0.4 * Math.exp(-(((x - cx) / 70) ** 2 + ((y - cy) / 45) ** 2)));
    if (residue > 0.01) { const dd = Math.hypot(x - cx, y - cy); v += residue * Math.exp(-((dd / (r0 * 0.5)) ** 2) * 1.5); }
    if (flame > 0.01) {
      const dx = x - cx; let dy = y - cy;
      if (dy < 0) dy /= stretch;
      const dist = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      const r = r0 * (1 + 0.07 * Math.sin(3 * th + sec * 0.9) + 0.05 * Math.sin(5 * th - sec * 1.4) + 0.03 * Math.sin(sec * 2.3)); // edge that ripples slowly
      v += flame * (0.95 * Math.exp(-((dist / r) ** 2) * 1.5) + 0.25 * Math.exp(-(((dist - r * 1.2) / (r * 0.45)) ** 2))); // core + flame envelope
    }
    const k = Math.max(0, Math.min(255, Math.round(v * 255))) * 3, o = (y * TW + x) * 4;
    d[o] = IRON[k]; d[o + 1] = IRON[k + 1]; d[o + 2] = IRON[k + 2]; d[o + 3] = 255;
  }
  offCtx.putImageData(img, 0, 0);
  const c = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
  c.imageSmoothingEnabled = true; c.drawImage(off, 0, 0, Wc, Hc);

  // camera overlay: max temperature, crosshair on the hotspot, colour scale
  const tmax = 22 + (burning ? flame * 640 + residue * 380 : 0) + smoke * 18;
  c.font = '700 13px system-ui, sans-serif'; c.textBaseline = 'top';
  const pill = (txt, x, y, col) => { const w = c.measureText(txt).width + 12; c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x, y, w, 19); c.fillStyle = col; c.fillText(txt, x + 6, y + 3); return w; };
  if (Math.floor(sec * 2) % 2) { c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(14, 15, 5, 0, Math.PI * 2); c.fill(); }
  pill('IR · CAM-03', 24, 6, '#fff');
  if (burning && out) { c.font = '800 14px system-ui, sans-serif'; const ot = t('✓ SIN LLAMA', '✓ NO FLAME'); pill(ot, Wc / 2 - c.measureText(ot).width / 2 - 6, 6, '#5ef0a0'); c.font = '700 13px system-ui, sans-serif'; }
  const mt = `MAX ${Math.round(tmax)} °C`; c.font = '800 14px system-ui, sans-serif';
  pill(mt, Wc - c.measureText(mt).width - 20, 6, tmax > 200 ? '#ffd23f' : tmax > 60 ? '#ffb347' : '#9fe6b0');
  const inView = cx > -r0 && cx < TW + r0;
  if (I > 0.12 && !inView) { // hotspot outside the frame: arrow pointing to it
    const left = cx < 0, y0 = cy / TH * Hc; c.fillStyle = 'rgba(255,210,63,.95)'; c.beginPath();
    if (left) { c.moveTo(8, y0); c.lineTo(26, y0 - 14); c.lineTo(26, y0 + 14); } else { c.moveTo(Wc - 8, y0); c.lineTo(Wc - 26, y0 - 14); c.lineTo(Wc - 26, y0 + 14); }
    c.fill(); c.font = '800 12px system-ui, sans-serif'; const lab = t('FOCO', 'HOTSPOT'), lw = c.measureText(lab).width;
    pill(lab, left ? 30 : Wc - lw - 42, y0 - 9, '#ffd23f');
  }
  if (I > 0.12 && inView) { // crosshair
    const px = cx / TW * Wc, py = cy / TH * Hc, rr = r0 / TW * Wc * 1.7;
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(px - rr - 8, py); c.lineTo(px - rr + 6, py); c.moveTo(px + rr - 6, py); c.lineTo(px + rr + 8, py);
    c.moveTo(px, py - rr - 8); c.lineTo(px, py - rr + 6); c.moveTo(px, py + rr - 6); c.lineTo(px, py + rr + 8); c.stroke();
    c.font = '700 12px system-ui, sans-serif'; pill(out ? t('RESTO CALIENTE', 'HOT RESIDUE') : t('FOCO', 'HOTSPOT'), px + rr + 10, py - 9, out ? '#ffb347' : '#fff');
  }
  if (smoke > 0.3) { c.font = '700 11px system-ui, sans-serif'; pill(t('HUMO DENSO · SOLO VISIÓN TÉRMICA', 'DENSE SMOKE · THERMAL VIEW ONLY'), 8, Hc - 26, '#ddd'); }
  const gx = Wc - 130, gy = Hc - 22, gr = c.createLinearGradient(gx, 0, gx + 110, 0);
  [0, 0.18, 0.38, 0.55, 0.72, 0.88, 1].forEach((s) => { const k = Math.round(s * 255) * 3; gr.addColorStop(s, `rgb(${IRON[k]},${IRON[k + 1]},${IRON[k + 2]})`); });
  c.fillStyle = gr; c.fillRect(gx, gy, 110, 8); c.fillStyle = '#fff'; c.font = '600 10px system-ui, sans-serif';
  c.fillText('20°', gx - 2, gy - 12); c.textAlign = 'right'; c.fillText('700°C', gx + 112, gy - 12); c.textAlign = 'left';
}

/** Starts the camera loop; it draws into <canvas id="f-therm"> whenever the command screen shows one. */
export function startThermalCamera() {
  off = document.createElement('canvas'); off.width = TW; off.height = TH;
  offCtx = off.getContext('2d'); img = offCtx.createImageData(TW, TH);
  requestAnimationFrame(frame);
}
