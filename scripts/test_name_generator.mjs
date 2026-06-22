// Verify the Name Generator tool works: each category generates the requested
// number of unique names, the "starts with" filter works, and copy-all appears.
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
      let f = decodeURIComponent(join(projectDir, req.url === '/' ? '/index.html' : req.url.split('?')[0]));
      if(!existsSync(f)){ res.writeHead(404); res.end('Not Found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
      res.end(readFileSync(f));
    });
    server.listen(port, ()=>{ console.log(`Server on http://localhost:${port}`); resolve(server); });
  });
}

async function run(){
  const PORT = 8132;
  const server = await startServer(PORT);
  const base = `http://localhost:${PORT}`;
  const errors = [];
  const pass = m => console.log(`  ✓ ${m}`);
  const fail = m => { console.log(`  ✗ ${m}`); errors.push(m); };

  const browser = await chromium.launch({ headless:true });
  try{
    const page = await browser.newPage();
    const jsErrors = []; page.on('pageerror', e=>jsErrors.push(e.message));
    await page.goto(`${base}/ai-tools/name-generator.html`, { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(150);

    // Each category generates names
    console.log('\n[1] Each category generates names');
    const cats = await page.$$('#ngTags .ng-tag');
    for(const tag of cats){
      const label = (await tag.textContent()).trim();
      await tag.click();
      await page.click('#ngGenerate');
      await page.waitForTimeout(120);
      const names = await page.$$eval('#ngGrid .ng-name', ns=>ns.map(n=>n.childNodes[0].textContent.trim()).filter(Boolean));
      const uniq = new Set(names);
      (names.length === 12 && uniq.size === 12) ? pass(`${label}: 12 unique names`) : fail(`${label}: got ${names.length} names, ${uniq.size} unique`);
    }

    // Count selector
    console.log('\n[2] Count selector');
    await page.selectOption('#ngCount', '24');
    await page.click('#ngGenerate'); await page.waitForTimeout(120);
    const c24 = (await page.$$('#ngGrid .ng-name')).length;
    c24 === 24 ? pass('24 names when requested') : fail(`expected 24, got ${c24}`);

    // Starts-with filter
    console.log('\n[3] "Starts with" filter');
    await page.$$('#ngTags .ng-tag').then(t=>t[0].click()); // fantasy
    await page.fill('#ngStart', 'A');
    await page.selectOption('#ngCount', '6');
    await page.click('#ngGenerate'); await page.waitForTimeout(120);
    const aNames = await page.$$eval('#ngGrid .ng-name', ns=>ns.map(n=>n.childNodes[0].textContent.trim()));
    (aNames.length>0 && aNames.every(n=>n.toLowerCase().startsWith('a'))) ? pass(`all start with A: ${JSON.stringify(aNames.slice(0,3))}…`) : fail(`starts-with failed: ${JSON.stringify(aNames)}`);

    // Copy-all button appears
    console.log('\n[4] Copy-all');
    const copyVisible = await page.isVisible('#ngCopyAll');
    copyVisible ? pass('Copy-all button shown after generating') : fail('Copy-all not visible');

    console.log('');
    if(jsErrors.length){ jsErrors.forEach(e=>fail(`JS error: ${e}`)); } else pass('no uncaught JS errors');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n' + '='.repeat(50));
  if(errors.length){ console.log(`❌ ${errors.length} check(s) failed`); process.exit(1); }
  console.log('✅ ALL Name Generator checks passed'); process.exit(0);
}
run().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
