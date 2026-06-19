// Verify every GameZone game icon has a live CSS animation (the "gif-style"
// animated icons), in both the Popular row and the Featured grid.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

function startServer(port){
  return new Promise(resolve=>{
    const server = createServer((req,res)=>{
      let filePath = decodeURIComponent(join(projectDir, req.url === '/' ? '/index.html' : req.url.split('?')[0]));
      if(!existsSync(filePath)){ res.writeHead(404); res.end('Not Found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    });
    server.listen(port, ()=>{ console.log(`Server on http://localhost:${port}`); resolve(server); });
  });
}

async function run(){
  const PORT = 8125;
  const server = await startServer(PORT);
  const base = `http://localhost:${PORT}`;
  const errors = [];
  const pass = m => console.log(`  ✓ ${m}`);
  const fail = m => { console.log(`  ✗ ${m}`); errors.push(m); };

  const browser = await chromium.launch({ headless:true });
  try{
    const page = await browser.newPage();
    const jsErrors = []; page.on('pageerror', e=>jsErrors.push(e.message));
    await page.goto(`${base}/fun-games/index.html`, { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(200);

    // Grid icons: every emoji should carry an anim class with a real animation
    const gridStats = await page.$$eval('#grid .card .emoji', els => {
      let animated = 0;
      const names = new Set();
      els.forEach(e=>{
        const a = getComputedStyle(e).animationName;
        if(a && a !== 'none'){ animated++; names.add(a); }
      });
      return { total: els.length, animated, distinct: [...names] };
    });
    console.log(`\n[1] Featured grid (${gridStats.total} emoji icons)`);
    gridStats.total > 0 ? pass(`grid has ${gridStats.total} emoji icons`) : fail('no emoji icons in grid');
    gridStats.animated === gridStats.total ? pass(`all ${gridStats.animated} icons animated`) : fail(`only ${gridStats.animated}/${gridStats.total} icons animated`);
    gridStats.distinct.length >= 2 ? pass(`varied animations: ${gridStats.distinct.join(', ')}`) : fail(`expected varied animations, got ${JSON.stringify(gridStats.distinct)}`);

    // Popular row icons animated too
    const popStats = await page.$$eval('#popRow .pop-tile span.anim', els => {
      let animated = 0;
      els.forEach(e=>{ const a = getComputedStyle(e).animationName; if(a && a !== 'none') animated++; });
      return { total: els.length, animated };
    });
    console.log(`\n[2] Popular row (${popStats.total} icons)`);
    popStats.total > 0 && popStats.animated === popStats.total ? pass(`all ${popStats.animated}/${popStats.total} popular icons animated`) : fail(`popular icons: ${popStats.animated}/${popStats.total} animated`);

    // 🌀 Tunnel Rush should spin
    console.log('\n[3] 🌀 spins');
    const spin = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#grid .card, #popRow .pop-item')];
      const c = cards.find(el => el.textContent.includes('Tunnel Rush'));
      if(!c) return null;
      const icon = c.querySelector('.emoji, span.anim');
      return icon ? getComputedStyle(icon).animationName : null;
    });
    spin === 'icon-spin' ? pass('Tunnel Rush 🌀 uses icon-spin') : fail(`Tunnel Rush animation = ${spin}`);

    console.log('');
    if(jsErrors.length){ jsErrors.forEach(e=>fail(`JS error: ${e}`)); } else pass('no uncaught JS errors');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n' + '='.repeat(50));
  if(errors.length){ console.log(`❌ ${errors.length} check(s) failed`); process.exit(1); }
  console.log('✅ ALL game-icon animation checks passed'); process.exit(0);
}
run().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
