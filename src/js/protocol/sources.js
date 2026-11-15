// ─────────────────────────────────────────────────────────────────────────────
// sources.js - The NASA sources cited by the protocol
//
// Every order of the response plan says what it is based on. S holds the short links used in those
// "Based on: …" lines; NASA_HRP and NASA_TM are the two reports quoted in the animated intro.
//   · psi.nasa.gov  → microgravity combustion experiments of the PSI database (measured data)
//   · ntrs.nasa.gov → NASA technical reports (literature)
// ─────────────────────────────────────────────────────────────────────────────

export const PSI_URL = (id) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`;
const psiLink = (id, label) => `<a href="${PSI_URL(id)}" target="_blank" rel="noopener">${label}</a>`;

export const S = {
  bass: psiLink('PSI-25', 'BASS-II'),
  bass1: psiLink('PSI-26', 'BASS'),
  flex: psiLink('PSI-69', 'FLEX'),
  saffire2: psiLink('PSI-99', 'Saffire-II'),
  saffire: psiLink('PSI-98', 'Saffire'),
  bre: psiLink('PSI-20', 'BRE'),
  same: psiLink('PSI-102', 'SAME'),
  zayac: 'Zayac 2024',
  urban: 'Saffire VI (Urban 2024)',
};

// Quoted in the intro. The #page= anchors point to the PDF page (not the printed page number).
// NASA Human Research Program, Evidence Report "Risk of Performance Errors Due to Training Deficiencies" (JSC, 2016)
export const NASA_HRP = 'https://ntrs.nasa.gov/api/citations/20160003868/downloads/20160003868.pdf';
// NASA Ames, "The Challenge of Aviation Emergency and Abnormal Situations" (NASA/TM-2005-213462)
export const NASA_TM = 'https://ntrs.nasa.gov/api/citations/20060023295/downloads/20060023295.pdf';
