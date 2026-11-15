// Builds the static site into dist/ (or into the folder given as first argument),
// The site has no bundler: src/ is served as it is, so building means copying it and checking that it is complete.
//   node scripts/build.mjs            → dist/
//   node scripts/build.mjs <folder>   → <folder>/ (used by the tests)
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('src', out, { recursive: true });

// Fail early if a page the site needs is missing
for (const file of ['index.html', 'panel.html', 'panel-es.html', 'js/protocol/main.js', 'css/protocol.css', 'js/main.js', 'css/styles.css', 'datasets/flex_gotas.csv', 'favicon.svg']) {
  if (!existsSync(join(out, file))) throw new Error(`build: missing ${file}`);
}
console.log(`Built ${out}/`);
