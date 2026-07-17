// Add a short explanatory HTML comment above the SEO/social meta blocks that
// were injected across the site, so future maintainers know what they are.
// Idempotent: skips pages that already carry the comment.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const MARK = 'khyati:seo-meta';
function walk(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (['node_modules', '.venv', '.git', 'test-results', '__pycache__', 'scripts', 'assets'].includes(e)) continue;
    const f = join(d, e); const st = statSync(f);
    if (st.isDirectory()) walk(f, acc);
    else if (extname(f) === '.html') acc.push(f);
  }
  return acc;
}
let changed = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  if (html.includes(MARK)) continue;                       // already annotated
  const dm = html.match(/([ \t]*)<meta[^>]+name=["']description["']/i);
  if (!dm) continue;
  const ind = dm[1] || '';
  const hasOg = /property=["']og:title["']/i.test(html);
  const text = hasOg
    ? 'SEO + social share preview: meta description, Open Graph & Twitter Card tags.'
    : 'SEO: meta description for search-result snippets.';
  const comment = `${ind}<!-- ${text} (${MARK}) -->\n`;
  // place the comment immediately before the description meta line
  html = html.replace(/([ \t]*<meta[^>]+name=["']description["'])/i, comment + '$1');
  writeFileSync(file, html);
  console.log('+ ' + file.replace(root, '').replace(/\\/g, '/') + (hasOg ? '  [seo+social]' : '  [seo]'));
  changed++;
}
console.log('\n' + changed + ' pages annotated');
