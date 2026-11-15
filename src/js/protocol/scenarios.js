// ─────────────────────────────────────────────────────────────────────────────
// scenarios.js - Where the fire is and what is burning
//
//   HABITATS   the five places the user can choose, each with its own floor plan:
//                kind 'chain'  = modules in a row joined by hatches (ISS)
//                kind 'cabin'  = a single cabin with areas inside it (Orion)
//                kind 'radial' = domes around a central node (Moon and Mars bases)
//              The keys are the Fire Twin presets (fire-twin/data.js), so oxygen, pressure, gravity and volume come from there.
//   ZONES      the area that is on fire (galley, sleeping area…). Each zone lists the materials it usually holds
//              (our reasoned assumption) and the room names that match it on each spacecraft.
//   MATERIALS  the five materials NASA has tested in microgravity (BASS-II, Saffire-II), plus 'mix' = everything in the zone.
//
// Room names are kept in English internally (pickRoom matches them); roomName() translates them for display.
// ─────────────────────────────────────────────────────────────────────────────
import { t, LANG } from './i18n.js';

const IMG = 'assets/img/';

const ROOM_ES = {
  'Destiny (lab)': 'Destiny (laboratorio)', Seats: 'Asientos', 'Control panel': 'Panel de mando', Pantry: 'Despensa', 'Hygiene (WHS)': 'Higiene (WHS)',
  'Side hatch': 'Escotilla lateral', 'Cargo bay': 'Bodega de carga', Laboratory: 'Laboratorio', 'Sleeping quarters': 'Dormitorios',
  'Galley & living': 'Cocina y estar', 'Life support': 'Soporte vital', Airlock: 'Esclusa', Greenhouse: 'Invernadero', Node: 'Nudo',
};
export const roomName = (n) => (LANG === 'es' ? ROOM_ES[n] || n : n);

const ORION_AREAS = ['Seats', 'Control panel', 'Pantry', 'Hygiene (WHS)', 'Side hatch', 'Cargo bay'];

export const HABITATS = {
  iss: {
    get name() { return t('Estación Espacial (ISS)', 'Space Station (ISS)'); }, get sub() { return t('Órbita · 0 g · 388 m³', 'Orbit · 0 g · 388 m³'); },
    img: IMG + 'habitats/iss007e11800.jpg', col: '#4f8dff', kind: 'chain', get ground() { return t('Houston y Moscú', 'Houston and Moscow'); }, delay: 0,
    get refugeName() { return t('Dragon / Soyuz (naves de rescate)', 'Dragon / Soyuz (rescue ships)'); },
    rooms: [
      { n: 'Zvezda', x: 22, y: 172, w: 62, h: 56 }, { n: 'Zarya', x: 88, y: 176, w: 52, h: 48 }, { n: 'Unity', x: 144, y: 178, w: 40, h: 44 },
      { n: 'Destiny (lab)', x: 188, y: 172, w: 86, h: 56 }, { n: 'Harmony', x: 278, y: 176, w: 46, h: 48 },
      { n: 'Columbus', x: 280, y: 106, w: 42, h: 66, hub: 5 }, { n: 'Kibo', x: 280, y: 228, w: 42, h: 76, hub: 5 },
    ],
    refuge: { n: 'Dragon', x: 328, y: 182, w: 40, h: 36 },
  },
  orion: {
    get name() { return t('Orion (crucero)', 'Orion (cruise)'); }, get sub() { return t('Rumbo a la Luna · 0 g · 9 m³', 'Bound for the Moon · 0 g · 9 m³'); },
    img: IMG + 'habitats/art002e016299.jpg', pos: '8% 40%', col: '#2dd4bf', kind: 'cabin', ground: 'Houston', delay: 1.3,
    get refugeName() { return t('el lado opuesto de la cabina, con los trajes', 'the opposite side of the cabin, with the suits'); }, zones: ORION_AREAS,
  },
  orion_eva: {
    get name() { return t('Orion · atmósfera de exploración', 'Orion · exploration atmosphere'); }, get sub() { return t('Antes de un paseo · 26,5 % O₂ · 0,69 atm · 9 m³', 'Before a spacewalk · 26.5 % O₂ · 0.69 atm · 9 m³'); },
    img: IMG + 'habitats/orion-interior.jpg', col: '#a78bfa', kind: 'cabin', ground: 'Houston', delay: 1.3,
    get refugeName() { return t('el lado opuesto de la cabina, con los trajes', 'the opposite side of the cabin, with the suits'); }, zones: ORION_AREAS,
  },
  moon: {
    get name() { return t('Base en la Luna', 'Moon base'); }, get sub() { return t('0,16 g · 34 % O₂ · 0,56 atm · 30 m³', '0.16 g · 34 % O₂ · 0.56 atm · 30 m³'); },
    img: IMG + 'habitats/7036668.jpg', col: '#cbd5e1', kind: 'radial', ground: 'Houston', delay: 1.3,
    get refugeName() { return t('el rover presurizado, por la esclusa', 'the pressurized rover, through the airlock'); },
    domes: ['Laboratory', 'Sleeping quarters', 'Galley & living', 'Life support', 'Airlock'],
  },
  mars: {
    get name() { return t('Base en Marte', 'Mars base'); }, get sub() { return t('0,38 g · 34 % O₂ · 0,56 atm · 30 m³', '0.38 g · 34 % O₂ · 0.56 atm · 30 m³'); },
    img: IMG + 'habitats/PIA24264.jpg', col: '#f97316', kind: 'radial', ground: 'Houston', delay: 600, // Mars: radio takes 3–22 min
    get refugeName() { return t('el rover presurizado, por la esclusa', 'the pressurized rover, through the airlock'); },
    domes: ['Laboratory', 'Greenhouse', 'Sleeping quarters', 'Life support', 'Airlock'],
  },
};

/** The five materials with NASA microgravity data, in the order used when "everything" is burning. */
export const ALL_MATERIALS = ['sibal', 'pmma_s', 'pmma_r', 'nomex', 'silicone'];

export const MATERIALS = {
  sibal: { get name() { return t('Tela de cabina', 'Cabin fabric'); }, get sub() { return t('algodón + fibra de vidrio (SIBAL)', 'cotton + fiberglass (SIBAL)'); }, img: IMG + 'materials/fabric.svg' },
  pmma_s: { get name() { return t('Placa de acrílico', 'Acrylic sheet'); }, get sub() { return t('ventanas, tapas (PMMA)', 'windows, covers (PMMA)'); }, img: IMG + 'materials/acrylic-sheet.svg' },
  pmma_r: { get name() { return t('Varilla de acrílico', 'Acrylic rod'); }, get sub() { return t('soportes, piezas (PMMA)', 'brackets, parts (PMMA)'); }, img: IMG + 'materials/acrylic-rod.svg' },
  nomex: { name: 'Nomex', get sub() { return t('trajes, bolsas', 'suits, bags'); }, img: IMG + 'materials/nomex.svg' },
  silicone: { get name() { return t('Silicona', 'Silicone'); }, get sub() { return t('juntas y cables', 'seals and cables'); }, img: IMG + 'materials/silicone.svg' },
  mix: { get name() { return t('Varios elementos', 'Several items'); }, get sub() { return t('arden a la vez tela, plástico, Nomex y cables', 'fabric, plastic, Nomex and cables burning at once'); }, img: IMG + 'materials/mixed.svg' },
};

// rooms: start of the room names that belong to the zone, in order of preference (see pickRoom)
export const ZONES = {
  galley: {
    get name() { return t('Cocina', 'Galley'); }, get sub() { return t('comida, bolsas, calentador', 'food, bags, food warmer'); }, img: IMG + 'zones/galley.svg',
    mats: ['sibal', 'nomex', 'silicone', 'pmma_s'], get mixName() { return t('lo que hay en la cocina', 'everything in the galley'); }, rooms: ['Galley', 'Pantry', 'Zvezda'],
  },
  sleeping: {
    get name() { return t('Zona de descanso', 'Sleeping area'); }, get sub() { return t('sacos de dormir, ropa, portátil', 'sleeping bags, clothes, laptop'); }, img: IMG + 'zones/sleeping.svg',
    mats: ['sibal', 'nomex', 'silicone'], get mixName() { return t('lo que hay en la zona de descanso', 'everything in the sleeping area'); }, rooms: ['Sleeping', 'Harmony', 'Seats'],
  },
  lab: {
    get name() { return t('Laboratorio', 'Laboratory'); }, get sub() { return t('experimentos, cajas de guantes', 'experiments, glove boxes'); }, img: IMG + 'zones/laboratory.svg',
    mats: ['pmma_s', 'pmma_r', 'silicone'], get mixName() { return t('lo que hay en el laboratorio', 'everything in the laboratory'); }, rooms: ['Laboratory', 'Destiny', 'Kibo', 'Columbus', 'Control panel'],
  },
  equipment: {
    get name() { return t('Equipos y cables', 'Equipment and cables'); }, get sub() { return t('paneles, soporte vital, baterías', 'panels, life support, batteries'); }, img: IMG + 'zones/equipment.svg',
    mats: ['silicone', 'pmma_r'], get mixName() { return t('cables, juntas y piezas de equipos', 'cables, seals and equipment parts'); }, rooms: ['Life support', 'Control panel', 'Unity', 'Zarya'],
  },
  storage: {
    get name() { return t('Almacén', 'Storage'); }, get sub() { return t('bolsas de carga, repuestos', 'cargo bags, spare parts'); }, img: IMG + 'zones/storage.svg',
    mats: ['nomex', 'sibal', 'pmma_s'], get mixName() { return t('lo que hay en el almacén', 'everything in storage'); }, rooms: ['Cargo bay', 'Zarya', 'Airlock', 'Greenhouse'],
  },
  unknown: {
    get name() { return t('No lo sé', "I don't know"); }, get sub() { return t('puede haber de todo', 'could be anything'); }, img: IMG + 'materials/mixed.svg', svg: true,
    mats: ALL_MATERIALS, get mixName() { return t('varios elementos', 'several items'); }, rooms: [],
  },
};

/** Name of what is burning: one material, or "everything in the <zone>". */
export const materialName = (c) => (c.mat === 'mix' ? ZONES[c.zone]?.mixName || t('varios elementos', 'several items') : MATERIALS[c.mat].name);

/** Floor plan of a habitat: rooms with centre, door, corridor point (hub) and the back wall where the fire sits. */
export function geometry(key) {
  const H = HABITATS[key], G = { rooms: [], refuge: null };
  if (H.kind === 'chain') {
    H.rooms.forEach((r, i) => G.rooms.push({ ...r, id: i, c: [r.x + r.w / 2, r.y + r.h / 2], hub: r.hub != null ? [H.rooms[r.hub].x + H.rooms[r.hub].w / 2, 200] : [r.x + r.w / 2, 200],
      back: r.y < 170 ? [r.x + r.w / 2, r.y + 12] : r.y > 200 ? [r.x + r.w / 2, r.y + r.h - 12] : [r.x + r.w * 0.8, r.y + 14] }));
    const f = H.refuge; G.refuge = { ...f, c: [f.x + f.w / 2, f.y + f.h / 2], hub: [f.x + 4, 200] };
  } else if (H.kind === 'radial') {
    H.domes.forEach((n, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / H.domes.length, cx = 200 + Math.cos(a) * 118, cy = 200 + Math.sin(a) * 118;
      G.rooms.push({ n, id: i, a, r: 46, c: [cx, cy], door: [200 + Math.cos(a) * 72, 200 + Math.sin(a) * 72], hub: [200, 200], back: [200 + Math.cos(a) * 140, 200 + Math.sin(a) * 140] });
    });
    const e = G.rooms[G.rooms.length - 1]; // the rover docks at the last dome (the airlock)
    G.refuge = { n: 'Rover', c: [e.c[0] + Math.cos(e.a) * 62, e.c[1] + Math.sin(e.a) * 62], via: e };
  } else { // Orion: areas inside one capsule
    const pts = [[200, 110], [140, 160], [120, 230], [200, 290], [280, 230], [260, 160]];
    H.zones.forEach((n, i) => G.rooms.push({ n, id: i, c: pts[i], hub: [200, 200], back: [pts[i][0] + (pts[i][0] - 200) * 0.25, pts[i][1] + (pts[i][1] - 200) * 0.25] }));
  }
  return G;
}

/** Points to walk from room `from` to room `to` (or to 'refuge'). */
export function route(G, from, to) {
  const a = G.rooms[from], b = to === 'refuge' ? G.refuge : G.rooms[to];
  const pts = [a.c]; if (a.door) pts.push(a.door); pts.push(a.hub);
  if (to === 'refuge' && b.via) { pts.push(b.via.door, b.via.c, b.c); return pts; }
  pts.push(b.hub); if (b.door) pts.push(b.door); pts.push(b.c);
  return pts;
}

/** The room that burns: the first room of this habitat that matches the zone; if none does, a random one. */
export function pickRoom(hab, zone) {
  const rooms = geometry(hab).rooms, hints = ZONES[zone]?.rooms || [];
  for (const h of hints) { const i = rooms.findIndex((r) => r.n.startsWith(h)); if (i >= 0) return i; }
  return Math.floor(Math.random() * rooms.length);
}
