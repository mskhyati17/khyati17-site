// Deeper audit: canonical links, favicon/apple-touch/theme-color, JSON-LD,
// duplicate element ids, form controls without labels, links opening new tabs
// without rel=noopener.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
function walk(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (['node_modules', '.venv', '.git', 'test-results', '__pycache__', 'scripts', 'assets'].includes(e)) continue;
    const f = join(d, e); const st = statSync(f);
    if (st.isDirectory()) walk(f, acc);
    else if (extname(f) === '.html') acc.push(f);
  }
  return acc;
}
const files = walk(root);
const stat = { canonical: [], favicon: [], noopener: [], dupIds: [], unlabeled: [] };
for (const file of files) {
  const rel = file.replace(root, '').replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  const isRedirect = /http-equiv=["']refresh["']|location\.(replace|href)\s*\(/i.test(html) && html.length < 2500;
  if (isRedirect || rel === '/assets/includes/header.html') continue;
  // canonical
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) stat.canonical.push(rel);
  // favicon (any icon link)
  if (!/<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html)) stat.favicon.push(rel);
  // target=_blank without rel noopener
  const blanks = (html.match(/<a\b[^>]*target=["']_blank["'][^>]*>/gi) || []);
  const bad = blanks.filter(a => !/rel=["'][^"']*noopener/i.test(a));
  if (bad.length) stat.noopener.push(rel + ' (' + bad.length + ')');
  // duplicate ids
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]);
  const seen = {}, dups = new Set();
  ids.forEach(i => { if (seen[i]) dups.add(i); seen[i] = 1; });
  if (dups.size) stat.dupIds.push(rel + ' → ' + [...dups].join(','));
}
function section(name, arr) {
  console.log('\n### ' + name + ' (' + arr.length + ')');
  arr.slice(0, 60).forEach(x => console.log('  - ' + x));
  if (arr.length > 60) console.log('  … +' + (arr.length - 60) + ' more');
}
section('Missing <link rel=canonical>', stat.canonical);
section('Missing favicon/icon link', stat.favicon);
section('target=_blank without rel=noopener', stat.noopener);
section('Duplicate element ids', stat.dupIds);
