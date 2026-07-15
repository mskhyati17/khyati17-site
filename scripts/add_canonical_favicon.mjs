// Add <link rel="canonical"> to every real page, and the site favicon +
// apple-touch-icon + theme-color to pages that lack an icon link (standalone
// game/tool pages show a blank tab icon without it). Idempotent; inserts a
// labeled block just before </head>.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const ORIGIN = 'https://khyati17.com';
function walk(d, acc = []) {
  for (const e of readdirSync(d)) {
    if (['node_modules', '.venv', '.git', 'test-results', '__pycache__', 'scripts', 'assets'].includes(e)) continue;
    const f = join(d, e); const st = statSync(f);
    if (st.isDirectory()) walk(f, acc);
    else if (extname(f) === '.html') acc.push(f);
  }
  return acc;
}
let canAdded = 0, icoAdded = 0, touched = 0;
for (const file of walk(root)) {
  const rel = file.replace(root, '').replace(/\\/g, '/');
  let html = readFileSync(file, 'utf8');
  const isRedirect = /http-equiv=["']refresh["']|location\.(replace|href)\s*\(/i.test(html) && html.length < 2500;
  if (isRedirect) continue;
  if (!/<\/head>/i.test(html)) continue;                              // need a head to close
  const needCanonical = !/<link[^>]+rel=["']canonical["']/i.test(html);
  const needIcon = !/<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
  if (!needCanonical && !needIcon) continue;
  // indentation from the </head> line
  const hl = html.split('\n').find(l => /<\/head>/i.test(l)) || '  </head>';
  const ind = (hl.match(/^(\s*)/) || ['', ''])[1] + '  ';
  const lines = [];
  if (needCanonical) { lines.push(`<link rel="canonical" href="${ORIGIN}${rel}" />`); canAdded++; }
  if (needIcon) {
    lines.push(`<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`);
    lines.push(`<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`);
    if (!/name=["']theme-color["']/i.test(html)) lines.push(`<meta name="theme-color" content="#6a1b9a" />`);
    icoAdded++;
  }
  const block = ind + '<!-- canonical + site icon (khyati:head) -->\n' +
    lines.map(l => ind + l).join('\n') + '\n';
  html = html.replace(/([ \t]*)<\/head>/i, block + '$1</head>');
  writeFileSync(file, html);
  touched++;
  console.log('+ ' + rel + (needCanonical ? ' [canonical]' : '') + (needIcon ? ' [icon]' : ''));
}
console.log('\n' + touched + ' pages updated · canonical:' + canAdded + ' · icon:' + icoAdded);
