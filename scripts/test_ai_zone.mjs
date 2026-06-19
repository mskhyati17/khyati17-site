// Playwright check for the AI Zone portal (/ai-tools/index.html): renders the
// tools, popular row, category chips/tiles, search, live-card navigation,
// the coming-soon card being inert, and the old page redirecting to the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2' };

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
  const PORT = 8124;
  const server = await startServer(PORT);
  const base = `http://localhost:${PORT}`;
  const errors = [];
  const pass = m => console.log(`  ✓ ${m}`);
  const fail = m => { console.log(`  ✗ ${m}`); errors.push(m); };

  const browser = await chromium.launch({ headless:true });
  try{
    const page = await browser.newPage();
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));

    // ---- 1. AI Zone portal ----
    console.log('\n[1] AI Zone /ai-tools/index.html');
    await page.goto(`${base}/ai-tools/index.html`, { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(200);

    const logo = (await page.textContent('.logo'))?.trim();
    logo && logo.includes('AI Zone') ? pass(`logo: '${logo}'`) : fail(`logo not 'AI Zone' (got '${logo}')`);

    const cards = await page.$$('#grid .card');
    cards.length === 4 ? pass(`${cards.length} cards (3 live + 1 soon)`) : fail(`expected 4 cards, got ${cards.length}`);

    const labels = await page.$$eval('#grid .card .label', ns=>ns.map(n=>n.textContent.trim()));
    ['News Aggregator','Voice Clone','Story Creator'].every(t=>labels.includes(t)) ? pass('all 3 live tools present') : fail(`live tools missing; got ${JSON.stringify(labels)}`);

    const popular = await page.$$('#popRow .pop-item');
    popular.length === 3 ? pass(`${popular.length} popular items (live only)`) : fail(`expected 3 popular, got ${popular.length}`);

    const chips = await page.$$('#catStrip .chip');
    chips.length === 4 ? pass(`${chips.length} chips (All + News + Audio + Writing)`) : fail(`expected 4 chips, got ${chips.length}`);

    const tiles = await page.$$('#catGrid .cat-tile');
    tiles.length === 3 ? pass(`${tiles.length} browse-category tiles`) : fail(`expected 3 tiles, got ${tiles.length}`);

    const soon = await page.$$('#grid .card.soon');
    soon.length === 1 ? pass('coming-soon card rendered & dimmed') : fail(`expected 1 soon card, got ${soon.length}`);

    // ---- 2. Search ----
    console.log('\n[2] Search');
    await page.fill('#search', 'voice');
    await page.waitForTimeout(150);
    const found = await page.$$eval('#grid .card .label', ns=>ns.map(n=>n.textContent.trim()));
    (found.length===1 && found[0]==='Voice Clone') ? pass('search "voice" -> Voice Clone') : fail(`search expected [Voice Clone], got ${JSON.stringify(found)}`);
    await page.fill('#search', '');
    await page.waitForTimeout(150);

    // ---- 3. Live card opens the tool ----
    console.log('\n[3] Live card -> tool page');
    const all = await page.$$('#grid .card');
    let clicked=false;
    for(const c of all){ const l=(await c.$eval('.label',n=>n.textContent)).trim(); if(l==='Story Creator'){ await c.click(); clicked=true; break; } }
    if(clicked){
      await page.waitForURL(/ai-tools\/story-creator\.html/, { timeout:10000 }).catch(()=>{});
      page.url().includes('/ai-tools/story-creator.html') ? pass(`navigated: ${page.url().replace(base,'')}`) : fail(`unexpected url: ${page.url()}`);
    } else fail('could not find Story Creator card to click');

    // ---- 4. Old page redirects to the hub ----
    console.log('\n[4] /ai-tools/ai-tools.html -> redirect to hub');
    await page.goto(`${base}/ai-tools/ai-tools.html`, { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(300);
    page.url().endsWith('/ai-tools/index.html') ? pass(`redirected to ${page.url().replace(base,'')}`) : fail(`expected redirect, stayed at ${page.url().replace(base,'')}`);

    if(jsErrors.length){ jsErrors.forEach(e=>fail(`JS error: ${e}`)); } else pass('no uncaught JS errors');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n' + '='.repeat(50));
  if(errors.length){ console.log(`❌ ${errors.length} check(s) failed`); process.exit(1); }
  console.log('✅ ALL AI Zone checks passed'); process.exit(0);
}
run().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
