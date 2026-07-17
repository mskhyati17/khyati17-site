// Runs every scripts/test_*.mjs sequentially, capturing pass/fail per file.
// Writes a summary to scripts/test_results_summary.json and prints a table.
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.startsWith('test_') && f.endsWith('.mjs')).sort();

const results = [];
for (const f of files) {
  const start = Date.now();
  const r = spawnSync(process.execPath, [join(dir, f)], { encoding: 'utf8', timeout: 60000 });
  const ms = Date.now() - start;
  const ok = r.status === 0;
  results.push({ file: f, ok, ms, status: r.status, error: ok ? null : (r.stderr || r.stdout || '').slice(-2000) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}  (${ms}ms)`);
}

const failed = results.filter(r => !r.ok);
writeFileSync(join(dir, 'test_results_summary.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed.`);
if (failed.length) {
  console.log('\nFailed files:');
  for (const f of failed) console.log(' - ' + f.file);
}
process.exit(failed.length ? 1 : 0);
