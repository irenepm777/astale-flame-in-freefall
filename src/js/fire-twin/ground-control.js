// ─────────────────────────────────────────────────────────────────────────────
// ground-control.js - El control en tierra dibujado (SVG) que aparece a la derecha de la escena
//
// Dos piezas:
//   · controlTierraHTML       La persona del control en tierra, su bocadillo con lo que dice y la barra de enlace de radio.
//   · pantallaControlTierra   Lo que se ve en su pantalla grande: cambia según la nave (ISS en órbita, Orion rumbo a la
//                             Luna, reentrada, cápsula tras amerizar, base lunar, Marte), con el retraso de la señal.
// Son dibujos puros: reciben el idioma y devuelven HTML/SVG; no calculan nada.
// ─────────────────────────────────────────────────────────────────────────────

// rolesT = ['Comandante', 'Tripulante 2', 'Control en tierra'] (en el idioma elegido)
export function controlTierraHTML(EN, rolesT) {
  return `<div class="ft-gc">
    <div class="ft-gc-bubble"><div class="ft-gc-head"><b>📡 ${rolesT[2]}</b><span class="ft-when"></span></div><p class="ft-gc-say"></p></div>
    <svg class="ft-gc-svg" viewBox="0 0 320 250" role="img" aria-label="${rolesT[2]}">
      <defs>
        <linearGradient id="gcRoom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1426"/><stop offset="1" stop-color="#151f38"/></linearGradient>
        <linearGradient id="gcDesk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3554"/><stop offset="1" stop-color="#121829"/></linearGradient>
        <linearGradient id="gcShirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2c3d6e"/><stop offset="1" stop-color="#1d2a50"/></linearGradient>
        <radialGradient id="gcFace" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#f1c8a0"/><stop offset="1" stop-color="#c9926a"/></radialGradient>
        <radialGradient id="gcGlow" cx=".5" cy="0" r="1"><stop offset="0" stop-color="rgba(120,180,255,.28)"/><stop offset="1" stop-color="rgba(120,180,255,0)"/></radialGradient>
        <clipPath id="gcClip"><rect x="20" y="14" width="280" height="104" rx="5"/></clipPath>
      </defs>
      <rect width="320" height="250" rx="12" fill="url(#gcRoom)"/>
      <rect x="0" y="0" width="320" height="140" fill="url(#gcGlow)"/>
      <rect x="14" y="8" width="292" height="116" rx="9" fill="#04070d" stroke="#3a4f80" stroke-width="2"/>
      <g clip-path="url(#gcClip)" class="ft-gc-screen"></g>
      <circle class="ft-gc-live" cx="270" cy="24" r="3.5" fill="#ff4d4d"/><text x="278" y="27.5" fill="#ffb3b3" font-size="8.5" font-weight="700" font-family="system-ui">LIVE</text>
      <path d="M0 202 L320 202 L320 250 L0 250 Z" fill="url(#gcDesk)"/><rect x="0" y="200" width="320" height="3" fill="#4a5a86"/>
      <g transform="translate(20 146) skewY(-4)"><rect width="84" height="52" rx="5" fill="#0b1426" stroke="#4fc3f7" stroke-width="1.6"/>
        <path d="M8 40 l12 -8 l10 5 l14 -14 l12 6 l18 -16" stroke="#4fc3f7" stroke-width="2" fill="none"/><text x="8" y="13" fill="#8fd3ff" font-size="8" font-family="system-ui" font-weight="700">O₂ · CO</text></g>
      <g transform="translate(216 142) skewY(4)"><rect width="84" height="52" rx="5" fill="#0b1426" stroke="#4ade80" stroke-width="1.6"/>
        <rect x="10" y="34" width="9" height="10" rx="1" fill="#4ade80"/><rect x="25" y="26" width="9" height="18" rx="1" fill="#4ade80"/><rect x="40" y="20" width="9" height="24" rx="1" fill="#fbbf24"/><rect x="55" y="13" width="9" height="31" rx="1" fill="#f87171"/></g>
      <g fill="#ff5a5a"><circle cx="40" cy="226" r="2.5"/><circle cx="52" cy="226" r="2.5" fill="#4ade80"/><circle cx="64" cy="226" r="2.5" fill="#fbbf24"/></g>
      <rect x="250" y="220" width="46" height="10" rx="3" fill="#0b1426" stroke="#33456e"/>
      <path d="M106 204 Q110 170 160 166 Q210 170 214 204 Z" fill="url(#gcShirt)"/>
      <path d="M146 168 L160 182 L174 168" fill="none" stroke="#e8ecf6" stroke-width="3"/>
      <rect x="151" y="150" width="18" height="18" rx="4" fill="#c9926a"/>
      <ellipse cx="160" cy="137" rx="23" ry="25" fill="url(#gcFace)"/>
      <path d="M136 132 Q138 108 160 108 Q184 108 184 132 Q176 118 160 120 Q146 120 136 132 Z" fill="#3b2a1e"/>
      <ellipse cx="151.5" cy="139" rx="2.4" ry="2.8" fill="#1d1d24"/><ellipse cx="168.5" cy="139" rx="2.4" ry="2.8" fill="#1d1d24"/>
      <path d="M147 132 q4 -3 8 0 M165 132 q4 -3 8 0" stroke="#3b2a1e" stroke-width="1.6" fill="none"/>
      <path class="ft-gc-mouth" d="M153 150 q7 5 14 0" stroke="#8a3d2a" stroke-width="2.4" fill="#8a3d2a"/>
      <path d="M132 136 a28 28 0 0 1 56 0" stroke="#aab3cc" stroke-width="5" fill="none"/><rect x="126" y="128" width="12" height="20" rx="5" fill="#8e98b4"/><rect x="182" y="128" width="12" height="20" rx="5" fill="#8e98b4"/>
      <path d="M132 146 q3 13 18 11" stroke="#aab3cc" stroke-width="3" fill="none"/><circle cx="151" cy="157" r="3.4" fill="#2b2b2b"/>
      <ellipse cx="160" cy="137" rx="23" ry="25" fill="rgba(140,190,255,.12)"/>
      <g class="ft-gc-waves" fill="none" stroke="#78c8ff" stroke-width="2.5"><path d="M200 118 q8 8 0 16"/><path d="M208 112 q14 14 0 28"/><path d="M216 106 q20 20 0 40"/></g>
    </svg>
    <div class="ft-link"><span>🛰️</span><i></i><span>📡</span><em class="ft-gc-linktxt">${EN ? 'radio link · ship ⇄ ground' : 'enlace de radio · nave ⇄ tierra'}</em></div>
  </div>`;
}

// Lo que ve el control en tierra en su pantalla grande, según la nave y la fase
export function pantallaControlTierra(key, EN) {
  const t = (es, en) => (EN ? en : es);
  const lab = (txt, sub) => `<text x="28" y="30" fill="#cfe0ff" font-size="11" font-weight="800" font-family="system-ui" letter-spacing=".06em">${txt}</text>` + (sub ? `<text x="28" y="44" fill="#ffd27a" font-size="9.5" font-weight="700" font-family="system-ui">${sub}</text>` : '');
  const fire = (x, y) => `<circle class="ft-gc-fire" cx="${x}" cy="${y}" r="5" fill="#ff7a2a"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#ff7a2a" stroke-width="1.5" class="ft-gc-ring"/>`;
  const stars = Array.from({ length: 26 }, (_, i) => `<circle cx="${20 + ((i * 97) % 280)}" cy="${16 + ((i * 53) % 100)}" r="${i % 5 ? 0.7 : 1.2}" fill="#fff" opacity="${0.35 + (i % 3) * 0.2}"/>`).join('');
  const capsule = (x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-10 6 L-5 -8 L5 -8 L10 6 Z" fill="#dfe5f3"/><rect x="-11" y="6" width="22" height="4" rx="1" fill="#8e98b4"/>${fire(1, -1)}</g>`;
  const dome = (x, y, w) => `<g transform="translate(${x} ${y})"><path d="M${-w} 0 A${w} ${w * 0.75} 0 0 1 ${w} 0 Z" fill="#cfd6ea"/><rect x="${-w - 4}" y="-2" width="${w * 2 + 8}" height="5" rx="2" fill="#8e98b4"/><rect x="${-w * 0.3}" y="${-w * 0.35}" width="${w * 0.6}" height="${w * 0.35}" rx="2" fill="#4a5f94"/>${fire(w * 0.45, -w * 0.25)}</g>`;
  if (key === 'moon') return `<rect x="20" y="14" width="280" height="104" fill="#03050b"/>${stars}
    <circle cx="255" cy="40" r="11" fill="#3d7fd6"/><path d="M248 36 q6 -3 10 2" stroke="#e8f2ff" stroke-width="2" fill="none" opacity=".7"/>
    <path d="M20 96 Q100 84 170 90 T300 88 L300 118 L20 118 Z" fill="#8c8c92"/><ellipse cx="80" cy="104" rx="14" ry="3" fill="#6d6d73"/><ellipse cx="240" cy="108" rx="10" ry="2.5" fill="#6d6d73"/>
    ${dome(160, 92, 30)}${lab(t('BASE LUNAR · HÁBITAT', 'LUNAR BASE · HABITAT'), t('Retraso de la señal: ~1,3 s', 'Signal delay: ~1.3 s'))}`;
  if (key === 'mars') return `<defs><linearGradient id="gcMars" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1d14"/><stop offset="1" stop-color="#c47a4f"/></linearGradient></defs>
    <rect x="20" y="14" width="280" height="104" fill="url(#gcMars)"/><circle cx="60" cy="38" r="6" fill="#ffe6c8" opacity=".8"/>
    <path d="M20 94 L60 86 L95 92 L140 82 L190 90 L240 80 L300 90 L300 118 L20 118 Z" fill="#8a3d1f"/>
    ${dome(170, 94, 30)}${lab(t('HÁBITAT EN MARTE', 'MARS HABITAT'), t('Retraso de la señal: 3–22 min · la tripulación decide sola', 'Signal delay: 3–22 min · the crew decides alone'))}`;
  if (key === 'reentry') return `<defs><linearGradient id="gcRe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a0a06"/><stop offset="1" stop-color="#7a2a08"/></linearGradient></defs>
    <rect x="20" y="14" width="280" height="104" fill="url(#gcRe)"/><path d="M20 118 Q160 70 300 118 Z" fill="#1d5fbf"/><path d="M20 118 Q160 70 300 118" stroke="#8fd3ff" stroke-width="2" fill="none"/>
    <path d="M90 34 L180 70" stroke="#ffb347" stroke-width="7" stroke-linecap="round" opacity=".55"/><path d="M110 40 L180 70" stroke="#fff1c4" stroke-width="2.5" stroke-linecap="round"/>
    ${capsule(186, 72, 120)}${lab(t('ORION · REENTRADA', 'ORION · RE-ENTRY'), t('Bloqueo de radio posible durante el plasma', 'Possible radio blackout during plasma'))}`;
  if (key === 'splash') return `<defs><linearGradient id="gcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f93d6"/><stop offset="1" stop-color="#bfe0ff"/></linearGradient></defs>
    <rect x="20" y="14" width="280" height="64" fill="url(#gcSky)"/><rect x="20" y="78" width="280" height="40" fill="#14507e"/>
    <path d="M20 84 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#7fc2f0" stroke-width="1.5" fill="none"/>
    <g transform="translate(230 70)"><path d="M-34 8 L30 8 L22 18 L-28 18 Z" fill="#3a4258"/><rect x="-10" y="-6" width="18" height="14" fill="#c9cfdb"/></g>
    ${capsule(120, 76, 0)}${lab(t('CÁPSULA · TRAS AMERIZAR', 'CAPSULE · AFTER SPLASHDOWN'), t('Barco de rescate en camino', 'Recovery ship on its way'))}`;
  if (key === 'orion' || key === 'orion_eva') return `<rect x="20" y="14" width="280" height="104" fill="#03050b"/>${stars}
    <circle cx="52" cy="88" r="24" fill="#2a6fd0"/><path d="M36 80 q12 -8 26 0" stroke="#bfe3ff" stroke-width="2" fill="none" opacity=".6"/>
    <circle cx="270" cy="40" r="12" fill="#b9b9bf"/><circle cx="266" cy="37" r="2.5" fill="#8e8e94"/>
    <path d="M74 80 C130 30 200 22 258 40" stroke="#7aa7ff" stroke-width="1.8" fill="none" stroke-dasharray="5 5"/>
    ${capsule(168, 40, 70)}${lab(t('ORION · RUMBO A LA LUNA', 'ORION · BOUND FOR THE MOON'), key === 'orion_eva' ? t('Atmósfera de exploración: 26,5 % O₂', 'Exploration atmosphere: 26.5 % O₂') : '')}`;
  // ISS en órbita
  return `<rect x="20" y="14" width="280" height="104" fill="#03050b"/>${stars}
    <defs><radialGradient id="gcEarth" cx=".5" cy=".2" r=".9"><stop offset="0" stop-color="#3d8ee8"/><stop offset="1" stop-color="#123c7a"/></radialGradient></defs>
    <circle cx="160" cy="236" r="140" fill="url(#gcEarth)"/><circle cx="160" cy="236" r="141" fill="none" stroke="#8fd3ff" stroke-width="2" opacity=".7"/>
    <ellipse cx="160" cy="150" rx="150" ry="70" fill="none" stroke="#7aa7ff" stroke-width="1.5" stroke-dasharray="5 5"/>
    <g transform="translate(206 84)"><rect x="-22" y="-2" width="44" height="4" fill="#cfd6ea"/><rect x="-30" y="-9" width="10" height="18" fill="#4a6bd8"/><rect x="20" y="-9" width="10" height="18" fill="#4a6bd8"/><rect x="-6" y="-6" width="12" height="12" rx="2" fill="#dfe5f3"/>${fire(3, 0)}</g>
    ${lab(t('ISS · EN ÓRBITA', 'ISS · IN ORBIT'), t('Retraso de la señal: casi nulo', 'Signal delay: almost none'))}`;
}
