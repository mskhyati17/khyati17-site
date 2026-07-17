// Quality audit: for each real page HTML file, flag missing SEO/a11y basics.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
function walk(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (['node_modules', '.venv', '.git', 'test-results', '__pycache__', 'scripts'].includes(e)) continue;
    const f = join(d, e); const st = statSync(f);
    if (st.isDirectory()) walk(f, acc);
    else if (extname(f) === '.html') acc.push(f);
  }
  return acc;
}
const htmls = walk(root);
const rows = [];
for (const file of htmls) {
  const rel = file.replace(root, '').replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  // skip pure redirect stubs
  const isRedirect = /location\.(replace|href)|http-equiv=["']refresh["']/i.test(html) && html.length < 2500;
  const issues = [];
  if (!/<title>[^<]+<\/title>/i.test(html)) issues.push('no <title>');
  if (!/<html[^>]*\blang=/i.test(html)) issues.push('no lang attr');
  if (!/<meta[^>]+name=["']description["']/i.test(html) && !isRedirect) issues.push('no meta description');
  if (!/<meta[^>]+name=["']viewport["']/i.test(html) && !isRedirect) issues.push('no viewport');
  // images missing alt
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter(t => !/\balt\s*=/i.test(t)).length;
  if (noAlt) issues.push(noAlt + ' img w/o alt');
  if (issues.length) rows.push({ rel, isRedirect, issues });
}
if (!rows.length) console.log('✅ No quality issues');
else {
  rows.forEach(r => console.log((r.isRedirect?'[stub] ':'') + r.rel + '\n    ' + r.issues.join(', ')));
  console.log('\n' + rows.length + ' files with issues');
}
