// Regenerate sitemap.xml to cover every real, indexable page (section hubs +
// all playable games + all AI tools). Skips redirect stubs, admin, error/offline
// pages and dynamic templates. Preserves existing <lastmod> where present.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const ORIGIN = 'https://khyati17.com';
const TODAY = '2026-07-11';

function walk(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (['node_modules', '.venv', '.git', 'test-results', '__pycache__', 'scripts', 'assets', 'admin'].includes(e)) continue;
    const f = join(d, e); const st = statSync(f);
    if (st.isDirectory()) walk(f, acc);
    else if (extname(f) === '.html') acc.push(f);
  }
  return acc;
}
// existing lastmod map so we don't churn dates on unchanged pages
const prev = {};
if (existsSync(join(root, 'sitemap.xml'))) {
  const xml = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  const re = /<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g; let m;
  while ((m = re.exec(xml))) prev[m[1]] = m[2];
}

const EXCLUDE = new Set([
  '/index.html', '/404.html', '/offline.html',
  '/ai-tools/ai-tools.html',   // redirect stub → /ai-tools/index.html
  '/ai-tools/tool.html',       // dynamic per-tool template, not a standalone page
  '/fun-games/fun-games.html', // legacy stub → /fun-games/index.html
  '/stories/stories.html',     // dynamic per-story template → hub is /stories/index.html
]);

function priorityFor(rel) {
  if (rel === '/home/index.html') return { p: '1.0', cf: 'weekly' };
  if (/\/(fun-games|ai-tools|stories)\/index\.html$/.test(rel)) return { p: '0.9', cf: 'weekly' };
  if (/\/(videos|trading|others|about|me)\//.test(rel)) return { p: '0.6', cf: 'weekly' };
  if (rel.startsWith('/fun-games/')) return { p: '0.7', cf: 'monthly' };
  if (rel.startsWith('/ai-tools/')) return { p: '0.7', cf: 'monthly' };
  return { p: '0.6', cf: 'monthly' };
}

const pages = [];
for (const file of walk(root)) {
  const rel = file.replace(root, '').replace(/\\/g, '/');
  if (EXCLUDE.has(rel)) continue;
  const html = readFileSync(file, 'utf8');
  // skip redirect stubs (meta refresh or location.replace/href with tiny body)
  if (/http-equiv=["']refresh["']|location\.(replace|href)/i.test(html) && html.length < 2500) continue;
  pages.push(rel);
}
// stable ordering: hubs first (by priority), then alpha within
pages.sort((a, b) => {
  const pa = parseFloat(priorityFor(a).p), pb = parseFloat(priorityFor(b).p);
  return pb - pa || a.localeCompare(b);
});

let out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const rel of pages) {
  const loc = ORIGIN + rel;
  const { p, cf } = priorityFor(rel);
  const lastmod = prev[loc] || TODAY;
  out += `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${cf}</changefreq><priority>${p}</priority></url>\n`;
}
out += '</urlset>\n';
writeFileSync(join(root, 'sitemap.xml'), out);
console.log('Wrote sitemap.xml with ' + pages.length + ' urls (' + Object.keys(prev).length + ' had prior lastmod)');
