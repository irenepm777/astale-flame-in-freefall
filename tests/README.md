# Tests

`npm test` builds the site into a temporary folder, opens it in a real browser (Playwright) and checks that
the Fire Twin (35 scenarios), the Panel tabs, the in-browser model and the Ask answer produce exactly the
same rendered text as the stored baseline (`fixtures/baseline.json`, 338 values) and no new browser errors.

- `smoke/run.mjs` — runs the browser session and writes the result as JSON.
- `smoke/compare.mjs` — compares two results value by value.
- `fixtures/baseline.json` — reference result (338 values). It was first recorded on the original prototype (commit `24870d0` of the team repository) and regenerated once after the move to `src/`, once the new layout was proven identical to it apart from the renamed paths (`img/` → `assets/img/`, `datos/` → `datasets/`, `ml.js` → `ml/index.js`).

First time: `npm i -D playwright && npx playwright install chromium`.
If a change is *meant* to alter the output, regenerate the baseline on purpose and say so in the commit message.
