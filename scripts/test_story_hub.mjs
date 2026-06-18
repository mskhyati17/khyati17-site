// Playwright check for the new Story Hub portal (/stories/index.html) and
// the reader's ?story=<slug> deep-link. Serves the project statically, seeds
// two demo stories into localStorage (Supabase is null locally), then verifies
// the hub renders and a card click opens the right story in the reader.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');

const MIME = {
  '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript',
  '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff':'font/woff', '.woff2':'font/woff2',
};

const SEED = [
  { title:'The Glass Forest', slug:'the-glass-forest', excerpt:'A traveler wanders into a wood of mirrors.', body:'<p>Once upon a time…</p>', category:'Fantasy', created_at:'2026-06-10T00:00:00Z' },
  { title:'Signal Lost',      slug:'signal-lost',      excerpt:'The last message from orbit.',            body:'<p>Static.</p>',          category:'Sci-Fi',  created_at:'2026-06-15T00:00:00Z' },
];

function startServer(port){
  return new Promise(resolve=>{
    const server = createServer((req,res)=>{
      let filePath = decodeURIComponent(join(projectDir, req.url === '/' ? '/index.html' : req.url.split('?')[0]));
      if(!existsSync(filePath)){ res.writeHead(404); res.end('Not Found'); return; }
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(content);
    });
    server.listen(port, ()=>{ console.log(`Server on http://localhost:${port}`); resolve(server); });
  });
}

async function run(){
  const PORT = 8123;
  const server = await startServer(PORT);
  const base = `http://localhost:${PORT}`;
  const errors = [];
  const pass = m => console.log(`  ✓ ${m}`);
  const fail = m => { console.log(`  ✗ ${m}`); errors.push(m); };

  const browser = await chromium.launch({ headless: true });
  try{
    const context = await browser.newContext({ viewport:{ width:1280, height:900 } });
    // seed localStorage on every navigation (same origin) before page scripts run
    await context.addInitScript(seed => {
      try{ localStorage.setItem('khyati_stories_admin', seed); }catch(e){}
    }, JSON.stringify(SEED));

    const page = await context.newPage();
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));

    // ---- 1. Story Hub portal ----
    console.log('\n[1] Story Hub /stories/index.html');
    await page.goto(`${base}/stories/index.html`, { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(400); // let async loadStories() render

    const logo = (await page.textContent('.logo'))?.trim();
    logo && logo.includes('Story Hub') ? pass(`logo: '${logo}'`) : fail(`logo not 'Story Hub' (got '${logo}')`);

    const cards = await page.$$('#grid .card');
    cards.length > 0 ? pass(`${cards.length} story card(s) rendered`) : fail('no story cards rendered');

    const latest = await page.$$('#popRow .pop-item');
    latest.length === SEED.length ? pass(`${latest.length} latest items`) : fail(`expected ${SEED.length} latest items, got ${latest.length}`);

    const chips = await page.$$('#catStrip .chip');
    chips.length >= 3 ? pass(`${chips.length} genre chips (All + genres)`) : fail(`expected genre chips, got ${chips.length}`);

    const genreTiles = await page.$$('#catGrid .cat-tile');
    genreTiles.length === 2 ? pass(`${genreTiles.length} browse-genre tiles`) : fail(`expected 2 genre tiles, got ${genreTiles.length}`);

    // ---- 2. Live search filters ----
    console.log('\n[2] Search');
    await page.fill('#search', 'glass');
    await page.waitForTimeout(150);
    const afterSearch = await page.$$('#grid .card');
    afterSearch.length === 1 ? pass('search "glass" -> 1 result') : fail(`search expected 1 result, got ${afterSearch.length}`);
    await page.fill('#search', '');
    await page.waitForTimeout(150);

    // ---- 3. Card click deep-links into the reader ----
    console.log('\n[3] Card click -> reader ?story=');
    // click the "Signal Lost" card specifically
    const target = await page.$$('#grid .card');
    let clicked = false;
    for(const c of target){
      const label = (await c.$eval('.label', n=>n.textContent)).trim();
      if(label === 'Signal Lost'){ await c.click(); clicked = true; break; }
    }
    if(!clicked){ await target[0].click(); }
    await page.waitForURL(/stories\.html\?story=/, { timeout:10000 });
    const url = page.url();
    url.includes('story=signal-lost') ? pass(`navigated: ${url.replace(base,'')}`) : fail(`unexpected reader url: ${url}`);

    await page.waitForTimeout(400); // reader loadStories()
    const readerTitle = (await page.textContent('#story-content h2'))?.trim();
    readerTitle === 'Signal Lost' ? pass(`reader shows '${readerTitle}'`) : fail(`reader expected 'Signal Lost', got '${readerTitle}'`);

    // ---- JS errors ----
    if(jsErrors.length){ jsErrors.forEach(e=>fail(`JS error: ${e}`)); }
    else pass('no uncaught JS errors');

  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n' + '='.repeat(50));
  if(errors.length){ console.log(`❌ ${errors.length} check(s) failed`); process.exit(1); }
  console.log('✅ ALL Story Hub checks passed'); process.exit(0);
}

run().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
