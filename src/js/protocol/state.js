// ─────────────────────────────────────────────────────────────────────────────
// state.js - The two state objects every screen reads
//
//   app    what the user is looking at: screen, chosen scenario, role, open panels, report tab…
//          app.render() redraws the page (main.js sets it), so any module can ask for a redraw.
//   world  the simulated incident: clock, plan, status of each action, crew, room sensors, CO history, log and alerts.
//          Crew, vital signs and sensors are simulated; the fire numbers come from the Fire Twin engine.
// ─────────────────────────────────────────────────────────────────────────────

export const app = {
  screen: 'home', // home | alarm | command | report | about
  cfg: { hab: null, zone: null, mat: null },
  role: null, // cmd | crew | gnd | admin
  roleSwitch: false, // choosing a new role in the middle of an incident (the alarm screen without siren)
  listOpen: false, // full plan table on the command screen
  reportTab: 'report', // report | twin | model
  camPan: 0, // thermal camera turn, -1 … 1 (±60°)
  heard: '', // last voice command heard
  render: () => {},
};

export const world = {
  t: 0, speed: 1, plan: null, status: {}, crew: [], sensors: [], co: [],
  out: null, // second at which the fire goes out (null = still burning)
  coAlert: false, outShown: false, doneShown: false, shown: {},
  log: [], alerts: [],
};

/** True once the simulated fire is out. */
export const isOut = () => world.out != null && world.t > world.out;
