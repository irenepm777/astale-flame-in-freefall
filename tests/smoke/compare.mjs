// Compares two smoke-test results (baseline vs current) value by value.
// Usage: node tests/smoke/compare.mjs <baseline.json> <current.json> [--rename=old>new ...]
//   --rename: treat "old" in the baseline as "new" (used when files or paths were renamed on purpose)
// Exit code 0 = identical, 1 = differences or new browser errors.
import fs from 'node:fs';

const args = process.argv.slice(2);
const [fileA, fileB] = args.filter((a) => !a.startsWith('--'));
const renames = args.filter((a) => a.startsWith('--rename=')).map((a) => a.slice(9).split('>'));
const a = JSON.parse(fs.readFileSync(fileA, 'utf8'));
const b = JSON.parse(fs.readFileSync(fileB, 'utf8'));
// Ignores whitespace and the highlight class " now" (it depends on animation timing)
const norm = (s) => (typeof s === 'string' ? s.replace(/ now"/g, '"').replace(/\s+/g, ' ') : s);
const applyRenames = (s) => (typeof s === 'string' ? renames.reduce((acc, [from, to]) => acc.split(from).join(to), s) : s);
let diffs = 0, compared = 0;

function walk(x, y, where = '') {
  if (Array.isArray(x)) {
    if (!Array.isArray(y) || x.length !== y.length) { console.log('LEN', where); diffs++; return; }
    x.forEach((v, i) => walk(v, y[i], `${where}[${i}]`));
  } else if (x && typeof x === 'object') {
    for (const k of Object.keys(x)) if (k !== 'errores') walk(x[k], y?.[k], `${where}/${k}`);
  } else {
    compared++;
    if (norm(applyRenames(x)) !== norm(y)) {
      diffs++;
      const s1 = String(norm(applyRenames(x))), s2 = String(norm(y));
      let i = 0; while (i < s1.length && s1[i] === s2[i]) i++;
      console.log('DIFF', where, JSON.stringify(s1.slice(Math.max(0, i - 50), i + 70)), '|||', JSON.stringify(s2.slice(Math.max(0, i - 50), i + 70)));
    }
  }
}
walk(a, b);
const newErrors = (b.errores || []).filter((e) => !(a.errores || []).includes(e));
console.log('new browser errors:', newErrors);
console.log(diffs ? `${diffs} differences out of ${compared}` : `OK: identical in ${compared} values`);
process.exit(diffs || newErrors.length ? 1 : 0);
