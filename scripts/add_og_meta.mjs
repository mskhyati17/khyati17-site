// Add Open Graph + Twitter Card meta to real pages that lack og:title, so shared
// links render a proper preview card. Reuses each page's existing <title> and
// <meta name="description">. Skips redirect stubs, the header fragment, and pages
// that already have OG tags.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const ORIGIN = 'https://khyati17.com';
const IMG = ORIGIN + '/og-image.png';
function walk(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (['node_modules', '.venv', '.git', 'test-results', '__pycache__', 'scripts', 'assets', 'admin'].includes(e)) continue;
    const f = join(d, e); const st = statSync(f);
    if (st.isDirectory()) walk(f, acc);
    else if (extname(f) === '.html') acc.push(f);
  }
  return acc;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const EXCLUDE = new Set(['/index.html', '/offline.html', '/404.html', '/ai-tools/ai-tools.html']);

let changed = 0;
for (const file of walk(root)) {
  const rel = file.replace(root, '').replace(/\\/g, '/');
  if (EXCLUDE.has(rel)) continue;
  let html = readFileSync(file, 'utf8');
  if (/property=["']og:title["']/i.test(html)) continue;            // already has OG
  if (/http-equiv=["']refresh["']|location\.(replace|href)\s*\(/i.test(html) && html.length < 2500) continue;
  const tm = html.match(/<title>([^<]*)<\/title>/i);
  const dm = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (!tm || !dm) continue;                                          // need both to anchor + fill
  const title = tm[1].trim();
  const desc = dm[1].trim();
  const url = ORIGIN + rel;
  // indentation of the description line
  const line = html.split('\n').find(l => /name=["']description["']/i.test(l)) || '';
  const ind = (line.match(/^(\s*)/) || ['', ''])[1];
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Khyati17" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${IMG}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${IMG}" />`,
  ].map(t => ind + t).join('\n');
  // insert right after the description meta tag
  html = html.replace(/(<meta[^>]+name=["']description["'][^>]*\/?>)/i, `$1\n${tags}`);
  writeFileSync(file, html);
  console.log('+ ' + rel);
  changed++;
}
console.log('\n' + changed + ' pages got OG/Twitter meta');
