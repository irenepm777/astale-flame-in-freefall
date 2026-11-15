# Space Fire Response Protocol (v2)

The home page of **https://astale.com**. Code in `src/js/protocol/`, styles in `src/css/protocol.css`, page `src/index.html`.
The previous version, the Panel (v1), is still in the repository at `panel.html` and is described in the [README](../README.md).

## Why a second version

The challenge asks how NASA's microgravity combustion experiments can make inhabited spacecraft safer. The Panel (v1) answers that for engineers and researchers, in tabs. v2 goes to the end of the chain: the person who has to act during a fire.

NASA's own research on human performance explains why that person needs something different from a dashboard:

- *"When stress becomes extreme, the individual might 'choke' or panic."* NASA Human Research Program, Evidence Report *Risk of Performance Errors Due to Training Deficiencies* (Johnson Space Center, 2016), p. 8 ([PDF, page 12](https://ntrs.nasa.gov/api/citations/20160003868/downloads/20160003868.pdf#page=12)).
- *"Under stress, normally reliable memory processes can fail."* NASA Ames, *The Challenge of Aviation Emergency and Abnormal Situations* (NASA/TM-2005-213462), p. 8 ([PDF, page 13](https://ntrs.nasa.gov/api/citations/20060023295/downloads/20060023295.pdf#page=13)).

So v2 gives **one order at a time**, in plain language, to the right person, with the physical reason and the NASA experiment behind it. These two quotes open the site as an animated intro.

## The flow

| Screen | What happens | Module |
|---|---|---|
| Intro | The two NASA quotes word by word with their clickable source, then "ASTALE · Space Fire Response Protocol". Once per browser tab; tap, Skip, Esc or Enter to move on. | `screens/intro.js` |
| 1 · Home | "What would happen if a fire broke out *now*?" Step 1: where (ISS, Orion in cruise, Orion with exploration atmosphere, Moon base, Mars base). Step 2: which area (galley, sleeping area, laboratory, equipment and cables, storage, I don't know), then what is burning (everything in the area, or one of the five materials NASA has tested). Each step appears when the previous one is done; the choices not taken are darkened. | `screens/home.js` |
| 2 · Alarm | Full-screen red alarm with siren. "Who are you?": commander, crew, ground control or super administrator (sees every action). | `screens/alarm.js` |
| 3 · Command | Your action now, in a white box with its pictogram, the reason below it and its source; a countdown ring; DONE / Skip. In the centre the floor plan of that habitat with the fire and the crew moving, and a thermal camera. On the right the full plan, the CO in the burning room and the crew. Full-screen alerts when the air turns toxic, when the fire is out and when the plan is complete. | `screens/command.js`, `screens/map.js`, `thermal-camera.js` |
| 4 · Report | Three tabs. **Report**: incident dashboard (12 indicators in green, amber or red) and the four points of the challenge for this scenario (the NASA experiments behind the plan ranked 0–100, what the data and the model say, design recommendations for this habitat, what helps on Earth), the incident log and the team. **Fire Twin** and **Model and data**: the v1 Panel embedded with the same scenario. | `screens/report.js`, `screens/dashboard.js` |
| About | The project and the six team members (`#about`). | `screens/about.js` |

Everything is in English and Spanish in the same page: the ES / EN switch changes the language in place, even in the middle of an incident. The room names, the plan and the alerts change; the incident log stays as it was written.

## How the plan is built

`plan.js` → `buildPlan({ hab, zone, mat, room })`:

1. Runs the Fire Twin engine (`simulate()` in `fire-twin/engine.js`) with the habitat's preset (oxygen, pressure, gravity, free volume), the material and a Saffire-size fire. With **everything in the area**, it uses the material that makes the air dangerous soonest and a large fire (41 × 100 cm), and gathers the advice for every material present.
2. Writes each order as `<b>Imperative sentence.</b>` followed by one sentence with the reason and a number **calculated for this scenario**, and the NASA source it is based on.
3. Assigns each action to a person (commander, flight engineer, mission specialists, ground control, or everyone), times them so each person does one thing after another, and marks which action puts the fire out.

The science behind the orders:

| Order | The number it shows | Where it comes from |
|---|---|---|
| Mask on | Time until CO passes 425 ppm (NASA 1-hour limit) in this volume; CO₂ the extinguisher will leave | Saffire VI CO load (Urban et al. 2024) scaled by volume; extinguisher below |
| Raise the alarm | When the gas sensor alarms; why smoke does not reach ceiling detectors in 0 g | Fire Twin detection time; SAME (PSI-102) |
| Cut power / fans | In 0 g below 30 % O₂, still air smothers the flame (~30 s, estimate); with partial gravity hot air rises by itself at 50·√g cm/s (assumption) | BASS-II (PSI-25); BRE (PSI-20); Zayac 2024 |
| Move fabric away | Spread rate along fabric and time to burn a 50 or 100 cm piece | Saffire-II (PSI-99), corrected with the FLEX fit for this oxygen and pressure |
| Stay clear of the acrylic | Measured oxygen limit vs the oxygen here | BASS (PSI-26), BASS-II |
| Use the extinguisher | A 2.7 kg CO₂ extinguisher (the ISS PFE: 61 mol ≈ 1.49 m³ of gas) gives a CO₂ partial pressure of 1.486 / V atm, and dilutes oxygen to o2 · pV / (pV + 1.486), compared with the BASS-II limit. On the ISS V = station volume / modules. | FLEX (PSI-69) for CO₂ dilution |
| Measure the gases | CO, and HCl and HCN when plastics or cables burn | CSA-CP practice on the ISS; Saffire VI |
| Watch for re-ignition | 10 minutes, because of cool flames | FLEX |
| Check it is out → Inspect and report | The check is not ticked with DONE: the commander answers "looks out" or "still looks active". "Still active" adds another extinguisher, another check, and moves the inspection to the end. | — |

The plan changes with the material: silicone means an electrical source (cut power first), acrylic drips burning droplets, fabric spreads at 0.6–2.6 mm/s, Nomex should not burn (find the cause). It changes with the habitat too: in Orion there is nowhere to go, so the suits are the refuge; on the Moon and Mars with 34 % O₂ the order is to prepare to evacuate to the rover; on Mars the radio takes 3–22 minutes, so the crew decides alone.

**Incident code and class** (`classify()`): fuel type (`S-TEX` fabric, `S-POL` plastic, `S-ELA` rubber or cable, `S-MIX` several), flame regime (`μG-ENV` blue envelope in 0 g, `μG-LIM` near the oxygen limit, `μG-HOL` sooty ball with high oxygen, `GP-EXT` partial gravity, `G1-CON` normal gravity) and oxygen, e.g. `S-TEX · μG-ENV · O₂ 21`. NASA publishes no official code of this kind; Astale builds it from the categories of the experiments and says so. The class (0–3) comes from how fast CO reaches the limit.

## What is simulated and what is not

- **From NASA data**: whether it burns, oxygen limits, spread rate, CO growth and detection time (all through the Fire Twin engine and its sources, see `fire-twin/sources.js` and `ASSUME` in `fire-twin/engine.js`).
- **Simulated**: crew positions and walking routes, pulse and SpO₂, room sensors (they follow the Fire Twin CO curve), and the thermal camera image.
- **Estimates**: anything on the Moon or Mars (no flame tests exist at those gravity levels). The command screen and the report flag them with ⚠️ and say which NASA test is missing.

## Accessibility and control

- Voice commands in English or Spanish (Web Speech): *done, skip, list, repeat, where, report*.
- Audio description: the current order is read aloud (speech synthesis); a live region repeats it for screen readers.
- Keyboard: Enter = done, S = skip, L = plan table, Esc = close.
- Buttons never move or shrink on hover or press (a moving button can lose the tap); the command screen is redrawn every 0.5 s with `morph()` so buttons keep their hover and press states.

## Module map (`src/js/protocol/`)

| Module | Responsibility |
|---|---|
| `main.js` | Entry point: render, clicks, keyboard, deep link, simulation clock |
| `state.js` | `app` (what the user sees) and `world` (the simulated incident) |
| `i18n.js` | `t(es, en)`, current language, `?lang=` |
| `format.js` | Escaping, numbers, durations, mission clock |
| `sources.js` | NASA links cited by the orders and the intro |
| `scenarios.js` | Habitats with their floor plans, areas, materials, room names (English inside, Spanish for display) |
| `crew.js` | Crew members, roles and role badges |
| `pictograms.js` | One line drawing per kind of order |
| `plan.js` | `buildPlan()` and `classify()` |
| `incident.js` | Incident simulation, alerts, actions done or skipped, "still burning", voice commands |
| `audio.js` | Siren, beeps, speech synthesis and recognition |
| `thermal-camera.js` | Thermal camera canvas |
| `screens/` | `home`, `intro`, `alarm`, `command` (+ `map`, `dashboard`), `report`, `about`, and `common` pieces |

## Deep links for demos

```
/?d=<habitat>,<area or material>[,<role>[,<room>]]&t=<seconds>&s=alarm|report&rt=twin|model&lang=en|es
```

Habitats: `iss`, `orion`, `orion_eva`, `moon`, `mars`. Areas: `galley`, `sleeping`, `lab`, `equipment`, `storage`, `unknown` (everything in the area burns). Materials: `sibal`, `pmma_s`, `pmma_r`, `nomex`, `silicone`. Roles: `cmd`, `crew`, `gnd`, `admin`.
Examples: `/?d=iss,galley,cmd` · `/?d=moon,sibal,crew&t=60` · `/?d=orion,lab,cmd&s=report&rt=twin`. A deep link skips the intro.

## Tests

`npm test` also runs `tests/smoke/protocol.mjs`: every habitat × area in both languages, on the command screen and in the report, plus one incident played by clicking. See [`tests/README.md`](../tests/README.md).
