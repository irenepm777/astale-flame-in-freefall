// `npm test`: builds the site into a temporary folder, runs the smoke test and compares it with the stored baseline.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const site = mkdtempSync(join(tmpdir(), 'astale-site-'));
const result = join(site, 'result.json');
const run = (...args) => execFileSync('node', args, { stdio: 'inherit' });

run('scripts/build.mjs', site);
run('tests/smoke/run.mjs', site, result, process.env.SMOKE_ENTRY || '/panel.html');
run('tests/smoke/compare.mjs', 'tests/fixtures/baseline.json', result);
