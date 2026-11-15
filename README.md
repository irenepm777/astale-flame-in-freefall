# Astale

**Fire-safety dashboard for spacecraft, built on NASA microgravity combustion data.**
Entry for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) · challenge *Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data* · live at **https://astale.com**

Astale turns NASA's combustion experiments into answers a crew can act on:

1. **Does it burn here?** Depends on the material, the oxygen level, the pressure and gravity.
2. **How much time is there?** From the alarm until the cabin air becomes dangerous.
3. **What should we do?** Who does what, and when, for the commander, the second crew member and ground control.

## Two versions

The repository holds two versions of Astale. Both run on the same NASA data and the same Fire Twin engine.

| | **v2 · Space Fire Response Protocol** (current) | **v1 · Panel** (previous version) |
|---|---|---|
| Where | `index.html` → https://astale.com (English and Spanish in the same page) | `panel.html` and `panel-es.html` |
| Code | `src/js/protocol/`, `src/css/protocol.css` | `src/js/main.js`, `src/js/panel/`, `src/css/styles.css` |
| What it is | A crew tool for the worst minute of a mission: choose where the fire is and what is burning, the alarm goes off, and each person gets one order at a time, with the reason and the NASA experiment behind it. It ends in an incident report. | A dashboard that answers the four points of the challenge in tabs, with the Fire Twin, the predictive model, search and the gap map. |
| Documentation | [`docs/PROTOCOL.md`](docs/PROTOCOL.md) | the rest of this README and [`docs/MODEL.md`](docs/MODEL.md) |

v2 reuses v1 instead of copying it: the response plan is calculated with the Fire Twin engine (`fire-twin/engine.js`), the report ranks the PSI investigations with our curated layer (`data/`), and the report's *Fire Twin* and *Model and data* tabs show the v1 Panel embedded (`panel.html?embed=twin|model`).

Why v2: in an emergency nobody reads a dashboard. NASA's own research says that under extreme stress people may "choke" or panic and that normally reliable memory processes can fail ([NASA HRP Evidence Report, 2016](https://ntrs.nasa.gov/citations/20160003868); [NASA/TM-2005-213462](https://ntrs.nasa.gov/citations/20060023295)). So v2 gives one clear order at a time.

## What is inside (v1 Panel)

| Part | What it does |
|---|---|
| **Panel** | Answers the four points of the challenge in order: relevant investigations ranked by mission, data ready for predictive models, new-generation equipment design, and applications on Earth. |
| **Fire Twin** | Digital twin of a fire in a spacecraft (ISS, Orion, lunar and Mars habitats, re-entry, splashdown). Animated scene, burn verdict, CO curve and a who-does-what action card. Every number is traced to NASA data or flagged as an assumption. |
| **Our model** | Predictive model trained in the browser on 257 FLEX droplets burned on the ISS (NASA PSI-69): XGBoost + CatBoost + random forest + linear ensemble. See [`docs/MODEL.md`](docs/MODEL.md). |
| **Ask Astale** | Question box that answers by calculating with the same engine, with sources. No external AI service is needed at runtime. |

**Model results** (5-fold cross-validation, fixed seed): burning rate R² 0.70 with mean error ±0.049 mm²/s; flame goes out by itself 84 % accuracy against a 69 % baseline, AUC 0.89. We also report what does *not* work: with so little data a plain linear model is almost as good. Details and limits are in [`docs/MODEL.md`](docs/MODEL.md).

## Run it

Requirements: Node.js 20 or newer.

```bash
npm install
npm run build          # copies src/ into dist/
python3 -m http.server -d dist 8000      # or any static server, then open http://localhost:8000 (v2) or /panel.html (v1)
```

`npm run dev` builds and starts Netlify's local server (includes the accounts function). `npm test` runs the browser smoke tests of both versions (first time: `npx playwright install chromium`).

| Script | Purpose |
|---|---|
| `npm run build` | Builds the static site into `dist/` |
| `npm run dev` | Local server with Netlify functions |
| `npm test` | Smoke tests in a real browser: v1 against a stored baseline, v2 on every scenario in both languages |
| `npm run deploy` | Publishes to Netlify (needs `NETLIFY_AUTH_TOKEN`) |
| `npm run data:psi` | Downloads the 24 PSI combustion investigations and regenerates `src/js/data/psi.js` |
| `npm run data:export` | Regenerates the model-ready CSV files in `src/datasets/` |
| `npm run bridge` | Optional local bridge so the Ask box can use the visitor's own Claude subscription |

## Project structure

```
src/                 the website, served as is (no bundler)
  index.html           v2 · Space Fire Response Protocol (home page, English and Spanish)
  panel.html panel-es.html   v1 · Panel, English and Spanish pages
  js/
    protocol/          v2: scenarios, response plan, incident simulation and the screens (home, alarm, command, report)
    main.js            v1 entry point: mounts Panel, Fire Twin and accounts
    panel/             Panel tabs, search, gap map and the in-browser model block
    fire-twin/         calculation engine, interface, animated scene, ground control
    ml/                gradient boosting, forest, ensemble and cross-validation, no libraries
    ask/               calculated answers to free-text questions
    data/              NASA PSI catalogue and our curated layer (es/en)
    account/           user accounts client
    core/              small shared pieces (redraw without losing hover, guided tour)
  datasets/            model-ready CSV files (NASA PSI, CC0)
  assets/img/          NASA images; habitats/, zones/, materials/ and team/ are used by v2
  css/                 styles.css (v1) and protocol.css (v2)
netlify/functions/   serverless function for user accounts
scripts/             build, deploy and data scripts
data/                calibration data used to fit the models
docs/                architecture, protocol guide, model documentation, image credits
tests/               browser smoke tests (v1 with its baseline, v2 by scenario)
```

How the pieces fit together is explained in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Data and credits

- Experiments and tables: [NASA Physical Sciences Informatics (PSI)](https://psi.nasa.gov) and [NASA Technical Reports Server (NTRS)](https://ntrs.nasa.gov), CC0.
- Images: NASA, credited in [`docs/IMAGE-CREDITS.md`](docs/IMAGE-CREDITS.md).
- Moon and Mars results are **extrapolations** between 0 g and 1 g data: there are no flame tests at those gravity levels, and the interface says so.

## Use of AI

Parts of the code and documentation were written with the help of AI assistants (Claude, by Anthropic) and reviewed by the team. The "Super-Intelligence" shown in the product is our own set of models, trained in the browser on NASA data; no external AI service is called at runtime. The optional local bridge (`npm run bridge`) lets a visitor use their own Claude subscription for the Ask box and is off by default.

## Team

Team Astale, Seville. Original prototype by Fernando and José Luis Endrino; Space Fire Response Protocol (v2) by Fernando; code structure, refactoring, tests and documentation by Irene Pascual Moreno. Alternative dashboard prototypes by Álvaro and Iván are kept in the team's original repository.

## Planned

User profiles with different views (hobbyist, researcher with sources, organisation with administrator, roles and permissions).
