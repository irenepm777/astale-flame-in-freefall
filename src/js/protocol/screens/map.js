// ─────────────────────────────────────────────────────────────────────────────
// map.js - Floor plan of the habitat on the command screen (SVG)
//
// Each habitat has its own plan: the ISS as a row of modules with Dragon docked, Orion as one capsule with areas,
// Moon and Mars bases as domes around a node with the rover at the airlock. The burning room glows red and fills
// with smoke; crew members move along their routes; the user's own route is drawn as a moving dashed line.
// flameShape() makes the flame look like the real one in each context: in 0 g a blue envelope with no tongues,
// faint near the oxygen limit, with yellow soot when there is a lot of oxygen; only with gravity does it rise.
// ─────────────────────────────────────────────────────────────────────────────
import { t } from '../i18n.js';
import { esc } from '../format.js';
import { roomName } from '../scenarios.js';
import { WHO } from '../crew.js';
import { app, world as W } from '../state.js';

function flameShape(p) {
  const s = p.s;
  if (s.g >= 0.1) return { g1: '#fff3c4', g2: '#ffb347', g3: '#ff6a00', shape: 'tongue' };
  if (s.o2 >= 30) return { g1: '#fff3c4', g2: '#ffc061', g3: '#3a6dff', shape: 'ball' };
  if (p.vd.st === 'edge') return { g1: '#cfe6ff', g2: '#3d7dff', g3: '#1d3fa8', shape: 'faint' };
  return { g1: '#dff0ff', g2: '#4f8dff', g3: '#2346c8', shape: 'ball' };
}

export function mapSVG() {
  const p = W.plan, G = p.G, H = p.H, fr = G.rooms[p.cfg.room], fd = flameShape(p), out = W.out != null && W.t > W.out;
  const k = p.vd.st === 'safe' ? 0 : out ? Math.max(0, 1 - (W.t - W.out) / 20) : Math.min(1, 0.45 + W.t / 120); // flame size 0–1
  let g = `<svg viewBox="0 0 400 400" class="f-map" role="img" aria-label="${t(`Plano de ${esc(H.name)}: fuego en ${esc(p.rn)}`, `Map of ${esc(H.name)}: fire in ${esc(p.rn)}`)}">
    <defs><radialGradient id="fl"><stop offset="0" stop-color="${fd.g1}"/><stop offset=".45" stop-color="${fd.g2}"/><stop offset="1" stop-color="${fd.g3}" stop-opacity="0"/></radialGradient>
    <clipPath id="cc"><circle cx="200" cy="200" r="194"/></clipPath><pattern id="bgp" patternUnits="userSpaceOnUse" width="400" height="400"><image href="${H.img}" width="400" height="400" preserveAspectRatio="xMidYMid slice" opacity=".22"/></pattern></defs>
    <circle cx="200" cy="200" r="197" fill="#05070d"/><circle cx="200" cy="200" r="194" fill="url(#bgp)"/><g clip-path="url(#cc)">`;
  const hot = (i) => i === p.cfg.room && k > 0;
  const smk = (i) => Math.min(0.6, W.sensors[i].smoke / 150);
  if (H.kind === 'chain') {
    g += '<rect x="20" y="194" width="350" height="12" class="f-tube"/>';
    G.rooms.forEach((r, i) => (g += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="9" class="f-room ${hot(i) ? 'hot' : ''}" style="--smk:${smk(i)}"/><text x="${r.c[0]}" y="${r.y < 170 ? r.y - 6 : r.y > 200 ? r.y + r.h + 14 : r.y - 6}" text-anchor="middle" class="f-rl">${esc(roomName(r.n).split(' (')[0])}</text>`));
    g += `<rect x="${G.refuge.x}" y="${G.refuge.y}" width="${G.refuge.w}" height="${G.refuge.h}" rx="16" class="f-room safe"/><text x="${G.refuge.c[0]}" y="${G.refuge.y + G.refuge.h + 14}" text-anchor="middle" class="f-rl ok">Dragon</text>`;
  } else if (H.kind === 'radial') {
    g += `<circle cx="200" cy="200" r="34" class="f-room"/><text x="200" y="204" text-anchor="middle" class="f-rl">${esc(roomName('Node'))}</text>`;
    G.rooms.forEach((r, i) => (g += `<line x1="${200 + Math.cos(r.a) * 34}" y1="${200 + Math.sin(r.a) * 34}" x2="${r.door[0]}" y2="${r.door[1]}" class="f-tunnel"/><circle cx="${r.c[0]}" cy="${r.c[1]}" r="${r.r}" class="f-room dome ${hot(i) ? 'hot' : ''}" style="--smk:${smk(i)}"/><text x="${r.c[0]}" y="${r.c[1] - 22}" text-anchor="middle" class="f-rl">${esc(roomName(r.n))}</text>`));
    const e = G.rooms[G.rooms.length - 1];
    g += `<line x1="${e.c[0]}" y1="${e.c[1]}" x2="${G.refuge.c[0]}" y2="${G.refuge.c[1]}" class="f-tunnel"/><rect x="${G.refuge.c[0] - 22}" y="${G.refuge.c[1] - 13}" width="44" height="26" rx="10" class="f-room safe"/><text x="${G.refuge.c[0]}" y="${G.refuge.c[1] + 4}" text-anchor="middle" class="f-rl ok">Rover</text>`;
  } else {
    g += `<path d="M150 70 L250 70 L320 300 Q200 345 80 300 Z" class="f-room capsule ${k > 0 ? 'hot' : ''}" style="--smk:${smk(p.cfg.room) * 0.6}"/>`;
    G.rooms.forEach((r, i) => (g += `<circle cx="${r.c[0]}" cy="${r.c[1]}" r="20" class="f-zone ${hot(i) ? 'hot' : ''}"/><text x="${r.c[0]}" y="${r.c[1] + 34}" text-anchor="middle" class="f-rl">${esc(roomName(r.n))}</text>`));
  }
  // routes: the user's own (crew role) and mission specialist 2 heading for the refuge
  const me = app.role === 'crew' ? W.crew.find((c) => c.id === 'ms1') : null;
  if (me && me.target) g += `<polyline points="${[me.pos, ...me.target].map((q) => q.join(',')).join(' ')}" class="f-route"/>`;
  const ms2 = W.crew.find((c) => c.id === 'ms2'); if (ms2?.target) g += `<polyline points="${[ms2.pos, ...ms2.target].map((q) => q.join(',')).join(' ')}" class="f-route dim"/>`;
  if (k > 0) {
    const [fx, fy] = fr.back, now = performance.now() / 1000, R = (fd.shape === 'faint' ? 14 : 22) * k + 6;
    g += `<g style="opacity:${fd.shape === 'faint' ? 0.7 * k : k}"><circle cx="${fx}" cy="${fy}" r="${R * 2.2}" class="f-pulse"/>`;
    if (fd.shape === 'tongue') g += `<path d="M${fx - R} ${fy + R * 0.6} Q${fx - R * 0.8} ${fy - R} ${fx} ${fy - R * 2.2 - Math.sin(now * 6) * 4} Q${fx + R * 0.8} ${fy - R} ${fx + R} ${fy + R * 0.6} Z" fill="url(#fl)"/>`;
    else g += `<ellipse cx="${fx}" cy="${fy}" rx="${R * (1 + 0.04 * Math.sin(now * 2))}" ry="${R * 0.85}" fill="url(#fl)"/>`;
    g += '</g>';
  } else if (out) g += `<text x="${fr.back[0]}" y="${fr.back[1] + 5}" text-anchor="middle" class="f-outl">✓</text>`;
  for (const c of W.crew) {
    const isMe = app.role === 'crew' && c.id === 'ms1';
    g += `<g transform="translate(${c.pos[0].toFixed(1)} ${c.pos[1].toFixed(1)})"><circle r="${isMe ? 12 : 9}" fill="${c.col}" stroke="${isMe ? '#fff' : '#05070d'}" stroke-width="2.5"/><text y="3.5" text-anchor="middle" class="f-cl">${isMe ? t('TÚ', 'YOU') : WHO[c.id].short}</text>${c.mask ? '<text x="8" y="-8" font-size="11">😷</text>' : ''}</g>`;
  }
  return g + '</g></svg>';
}
