// ─────────────────────────────────────────────────────────────────────────────
// links.js · Direcciones que usa el Panel
// ─────────────────────────────────────────────────────────────────────────────
// Puente local (solo funciona en el ordenador del equipo que tenga Super-Intelligence.cmd abierto)
export const BRIDGE = 'http://127.0.0.1:8531';
// Ficha de un experimento en la base de datos PSI de la NASA, y un informe en NTRS
export const PSI_URL = (id) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`;
export const NTRS = (id) => `https://ntrs.nasa.gov/citations/${id}`;
