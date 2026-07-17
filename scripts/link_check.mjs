// Static broken-link checker: parse every HTML file, extract href/src attributes
// pointing to local files, and verify the target exists on disk.
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));

function walk(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (['node_modules', '.venv', '.git', 'test-results', '__pycache__'].includes(e)) continue;
    const f = join(d, e);
    const st = statSync(f);
    if (st.isDirectory()) walk(f, acc);
    else if (extname(f) === '.html') acc.push(f);
  }
  return acc;
}
const htmls = walk(root);
const attrRe = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
const problems = [];
for (const file of htmls) {
  const html = readFileSync(file, 'utf8');
  let m;
  const seen = new Set();
  while ((m = attrRe.exec(html))) {
    let link = m[1].trim();
    if (seen.has(link)) continue; seen.add(link);
    // skip externals, anchors, data/js, mailto, tel
    if (/^(https?:|\/\/|#|data:|javascript:|mailto:|tel:|blob:)/i.test(link)) continue;
    if (link === '' ) continue;
    // strip query/hash
    const clean = link.split('#')[0].split('?')[0];
    if (!clean) continue;
    let target;
    if (clean.startsWith('/')) target = join(root, clean);
    else target = resolve(dirname(file), clean);
    // directory link -> index.html
    let ok = existsSync(target);
    if (ok && statSync(target).isDirectory()) ok = existsSync(join(target, 'index.html'));
    if (!ok) problems.push({ file: file.replace(root, '').replace(/\\/g,'/'), link });
  }
}
if (!problems.length) console.log('✅ No broken local links');
else {
  const byFile = {};
  for (const p of problems) (byFile[p.file] ||= []).push(p.link);
  for (const f in byFile) { console.log('\n' + f); byFile[f].forEach(l => console.log('   → ' + l)); }
  console.log('\n' + problems.length + ' broken links in ' + Object.keys(byFile).length + ' files');
}
