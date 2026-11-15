// ─────────────────────────────────────────────────────────────────────────────
// pictograms.js - One line drawing per kind of order, in the style of a safety sign
//
// Continuous 3.5 stroke, round ends, no people. They sit inside the white order box and take its text colour.
// Each action of the plan has an `ico` field with one of these keys.
// ─────────────────────────────────────────────────────────────────────────────

const PICTOGRAMS = {
  // oxygen mask: cup, strap and hose to the bottle
  mask: '<path d="M16 24c0-6 7-12 16-12s16 6 16 12v8c0 8-7 14-16 14s-16-6-16-14z"/><path d="M16 26H6M48 26h10"/><circle cx="32" cy="32" r="5"/><path d="M32 46v4c0 4 4 6 8 6h4"/><rect x="44" y="48" width="12" height="14" rx="3"/><path d="M47 48v-3h6v3"/>',
  // alarm: push button with waves
  alarm: '<circle cx="32" cy="36" r="12"/><circle cx="32" cy="36" r="5"/><path d="M32 12v6M14 20l4 4M50 20l-4 4"/><path d="M10 36H6M58 36h-4"/><path d="M20 54h24"/>',
  // cut power: plug pulled out of the socket
  power: '<path d="M14 26h12v12H14z"/><path d="M8 29h6M8 35h6"/><path d="M26 32h4"/><path d="M38 24h8a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6h-8z"/><path d="M52 32h6"/><path d="M33 18l-3 8M36 46l-3-6"/>',
  // fans off: blades with a bar across
  fan: '<circle cx="32" cy="32" r="4"/><path d="M32 28c-2-8 2-14 8-13 4 1 3 8-4 13M36 32c8-2 14 2 13 8-1 4-8 3-13-4M32 36c2 8-2 14-8 13-4-1-3-8 4-13M28 32c-8 2-14-2-13-8 1-4 8-3 13 4"/><circle cx="32" cy="32" r="25"/><path d="M14 14l36 36"/>',
  // leave: hatch frame and arrow out
  away: '<rect x="8" y="12" width="26" height="40" rx="6"/><path d="M28 32h28M46 22l10 10-10 10"/>',
  // move fabric and bags away: bag with arrow
  bags: '<path d="M12 26h26l-3 26H15z"/><path d="M19 26v-5a6 6 0 0 1 12 0v5"/><path d="M42 38h16M52 32l6 6-6 6"/>',
  // dripping acrylic: block with drops
  drops: '<rect x="14" y="10" width="36" height="16" rx="3"/><path d="M24 26v6M40 26v4"/><path d="M24 36c-3 4-3 7 0 8 3-1 3-4 0-8zM40 34c-3 4-3 7 0 8 3-1 3-4 0-8zM32 46c-3 4-3 7 0 8 3-1 3-4 0-8z"/>',
  // find the cause: magnifier with a spark
  search: '<circle cx="27" cy="27" r="15"/><path d="M38 38l16 16"/><path d="M27 18l-4 9h8l-4 9"/>',
  // extinguisher with discharge
  ext: '<rect x="20" y="22" width="16" height="34" rx="6"/><path d="M24 22v-6h8v6"/><path d="M32 16h8l6-4"/><path d="M46 12l10-4M46 12l11 2M46 12l9 7"/><path d="M20 34h16"/>',
  // suit: helmet with visor
  suit: '<circle cx="32" cy="28" r="20"/><path d="M18 26c0-8 6-13 14-13s14 5 14 13c0 7-6 11-14 11s-14-4-14-11z"/><path d="M22 22c2-3 5-4 8-4"/><path d="M16 44h32l4 12H12z"/>',
  // refuge: hatch with arrow in
  refuge: '<circle cx="40" cy="32" r="18"/><circle cx="40" cy="32" r="11"/><path d="M4 32h26M22 24l8 8-8 8"/>',
  // close hatches: hatch with lock
  hatch: '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="14"/><path d="M32 18v28M18 32h28"/><circle cx="32" cy="32" r="3"/>',
  // ground control: screen with antenna
  ground: '<rect x="8" y="20" width="36" height="26" rx="3"/><path d="M14 38l7-7 6 5 10-10"/><path d="M20 54h12M26 46v8"/><path d="M50 26a8 8 0 0 1 0 12M54 20a16 16 0 0 1 0 24"/>',
  // measure gases: meter with needle
  gas: '<rect x="16" y="8" width="32" height="48" rx="6"/><path d="M22 30a10 10 0 0 1 20 0"/><path d="M32 30l6-6"/><path d="M22 40h20M22 47h12"/>',
  // watch for 10 minutes: clock
  watch: '<circle cx="32" cy="34" r="22"/><path d="M32 22v12l8 6"/><path d="M26 8h12M32 8v4"/>',
  // check with your eyes
  eye: '<path d="M6 32c7-11 16-16 26-16s19 5 26 16c-7 11-16 16-26 16S13 43 6 32z"/><circle cx="32" cy="32" r="8"/><circle cx="32" cy="32" r="2"/>',
  // inspect and send the report: sheet with a tick
  report: '<path d="M14 8h26l10 10v38H14z"/><path d="M40 8v10h10"/><path d="M20 32l5 5 9-10"/><path d="M20 46h20"/>',
  // do not raise the oxygen: O₂ with a crossed-out arrow
  o2: '<circle cx="22" cy="38" r="15"/><text x="22" y="43" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">O₂</text><path d="M50 52V14M42 22l8-8 8 8"/><path d="M40 46l20-20" stroke-width="4.5"/>',
};

export const pictogram = (k) => (PICTOGRAMS[k] ? `<svg class="f-picto" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PICTOGRAMS[k]}</svg>` : '');
