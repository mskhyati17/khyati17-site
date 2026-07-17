// Health scan: load every HTML page, collect JS errors, failed requests (404s), and console errors.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir = join(fileURLToPath(import.meta.url), '..', '..');
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.woff':'font/woff','.mp3':'audio/mpeg','.txt':'text/plain'};
const s = createServer((q, r) => {
  let f = decodeURIComponent(join(dir, q.url.split('?')[0]));
  if (!existsSync(f) || extname(f) === '') {
    if (existsSync(f + '/index.html')) f = f + '/index.html';
    else { r.writeHead(404); r.end(); return; }
  }
  r.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise(r => s.listen(8171, r));
const base = 'http://localhost:8171';

// Pages to scan (relative URLs served by our server)
const pages = [
  '/home/index.html','/index.html','/about/about.html','/me/index.html',
  '/fun-games/index.html','/fun-games/fun-games.html',
  '/ai-tools/index.html','/ai-tools/ai-tools.html',
  '/stories/index.html','/stories/stories.html',
  '/videos/videos.html','/trading/trading.html','/others/others.html',
  '/admin/login.html','/admin/signup.html','/admin/panel.html','/admin/profile.html',
  '/404.html','/offline.html',
  // a sample of games & tools
  '/ai-tools/color-palette.html','/ai-tools/password-generator.html','/ai-tools/unit-converter.html',
  '/ai-tools/stopwatch.html','/ai-tools/spin-wheel.html','/ai-tools/doodle-pad.html','/ai-tools/mini-piano.html',
  '/ai-tools/name-generator.html','/ai-tools/decision-maker.html','/ai-tools/news-app.html',
  '/fun-games/tetris.html','/fun-games/snake.html','/fun-games/pong.html','/fun-games/breakout.html',
  '/fun-games/flappy-bird.html','/fun-games/space-invaders.html','/fun-games/tictactoe.html',
  '/fun-games/mochi-2048.html','/fun-games/memory-match.html',
];
const b = await chromium.launch({ headless: true });
const report = [];
for (const url of pages) {
  const p = await b.newPage();
  const js = [], con = [], net = [];
  p.on('pageerror', e => js.push(e.message.split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') con.push(m.text().split('\n')[0]); });
  p.on('requestfailed', r => net.push(r.url().replace(base,'') + ' (' + (r.failure()?.errorText||'?') + ')'));
  p.on('response', r => { if (r.status() >= 400) net.push(r.url().replace(base,'') + ' [' + r.status() + ']'); });
  try {
    await p.goto(base + url, { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(400);
  } catch (e) { js.push('NAV FAIL: ' + e.message.split('\n')[0]); }
  if (js.length || con.length || net.length) {
    report.push({ url, js, con, net: [...new Set(net)] });
  }
  await p.close();
}
s.close(); await b.close();
if (!report.length) { console.log('✅ No errors on any scanned page'); }
else {
  for (const r of report) {
    console.log('\n### ' + r.url);
    r.js.forEach(e => console.log('  JS  : ' + e));
    r.con.forEach(e => console.log('  CON : ' + e));
    r.net.forEach(e => console.log('  NET : ' + e));
  }
  console.log('\n' + report.length + ' pages with issues');
}
