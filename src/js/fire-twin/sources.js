// ─────────────────────────────────────────────────────────────────────────────
// sources.js - Las fuentes que citamos (experimentos de PSI e informes de la NASA)
//
// Cada número del Fire Twin lleva su fuente. Aquí está la lista: clave corta → título y enlace.
// La interfaz las convierte en enlaces (por ejemplo src('bass2') → «BASS-II» con su enlace).
//   · psi.nasa.gov  → experimentos de combustión de la base de datos PSI (datos medidos)
//   · ntrs.nasa.gov → informes técnicos y artículos de la NASA (literatura)
// Si añadimos un número nuevo al twin, añadimos aquí su fuente.
// ─────────────────────────────────────────────────────────────────────────────

export const SRC = {
  bass2: { t: 'BASS-II', u: 'https://psi.nasa.gov/physci/repo/investigations/PSI-25' },
  flex: { t: 'FLEX', u: 'https://psi.nasa.gov/physci/repo/investigations/PSI-69' },
  saffire2: { t: 'Saffire-II', u: 'https://psi.nasa.gov/physci/repo/investigations/PSI-99' },
  saffire6: { t: 'Urban et al. 2024 (Saffire VI)', u: 'https://ntrs.nasa.gov/citations/20240002981' },
  saffireCO: { t: 'Saffire, ICES 2024', u: 'https://ntrs.nasa.gov/api/citations/20240007488/downloads/Saffire%20ICES%202024%20Saffire%20presentation072124small.pdf' },
  bre: { t: 'BRE', u: 'https://psi.nasa.gov/physci/repo/investigations/PSI-20' },
  tien: { t: "Sacksteder y T'ien 1993", u: 'https://ntrs.nasa.gov/citations/19930040901' },
  zayac: { t: 'Zayac et al. 2024', u: 'https://ntrs.nasa.gov/citations/20240008623' },
  meyer: { t: 'Meyer 2016', u: 'https://ntrs.nasa.gov/citations/20170007283' },
  urban16: { t: 'Urban et al. 2016', u: 'https://ntrs.nasa.gov/citations/20170002629' },
  hirsch: { t: 'Hirsch et al. 2009', u: 'https://ntrs.nasa.gov/citations/20090012334' },
  mcallister: { t: 'McAllister et al. 2007', u: 'https://ntrs.nasa.gov/citations/20080013149' },
  abney: { t: 'Abney et al. 2026', u: 'https://ntrs.nasa.gov/citations/20260003925' },
  takahashi: { t: 'Takahashi et al. 2001', u: 'https://ntrs.nasa.gov/citations/20010074098' },
  fort23: { t: 'Fortenberry et al. 2023', u: 'https://ntrs.nasa.gov/citations/20230013826' },
  briggs: { t: 'Briggs et al. 2019 (CPM)', u: 'https://ntrs.nasa.gov/citations/20210012108' },
  niehaus: { t: 'Niehaus et al. 2026', u: 'https://ntrs.nasa.gov/citations/20260001600' },
};
