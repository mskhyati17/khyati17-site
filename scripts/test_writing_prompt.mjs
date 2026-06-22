// Verify the Writing Prompt Generator: generates a well-formed prompt for each
// genre, "Another" produces variety, copy + Story Creator link present.
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
  const PORT = 8133;
  const server = await startServer(PORT);
  const base = `http://localhost:${PORT}`;
  const errors = [];
  const pass = m => console.log(`  ✓ ${m}`);
  const fail = m => { console.log(`  ✗ ${m}`); errors.push(m); };

  const browser = await chromium.launch({ headless:true });
  try{
    const page = await browser.newPage();
    const jsErrors = []; page.on('pageerror', e=>jsErrors.push(e.message));
    await page.goto(`${base}/ai-tools/writing-prompt.html`, { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(150);

    console.log('\n[1] Each genre produces a well-formed prompt');
    const tags = await page.$$('#wpTags .wp-tag');
    for(const tag of tags){
      const label = (await tag.textContent()).trim();
      await tag.click();
      await page.click('#wpGenerate');
      await page.waitForTimeout(80);
      const txt = (await page.textContent('#wpPrompt')).trim();
      const pill = (await page.textContent('.wp-prompt .genre-pill').catch(()=>''))?.trim();
      const ok = txt.includes('Write a story about') && txt.includes(' who ') && txt.includes(' in ') && pill.length>0;
      ok ? pass(`${label}: prompt + genre pill (${pill})`) : fail(`${label}: malformed prompt -> ${JSON.stringify(txt.slice(0,80))}`);
    }

    console.log('\n[2] "Another" gives variety');
    await page.$$('#wpTags .wp-tag').then(t=>t[1].click()); // fantasy
    const seen = new Set();
    for(let i=0;i<8;i++){ await page.click('#wpAnother'); await page.waitForTimeout(60); seen.add((await page.textContent('#wpPrompt')).trim()); }
    seen.size >= 3 ? pass(`${seen.size} distinct prompts in 8 spins`) : fail(`low variety: ${seen.size} distinct`);

    console.log('\n[3] Toolbar');
    const copyVis = await page.isVisible('#wpCopy');
    const writeHref = await page.getAttribute('#wpWrite','href');
    copyVis ? pass('Copy button visible') : fail('Copy button missing');
    writeHref && writeHref.includes('story-creator.html') ? pass('"Write in Story Creator" links correctly') : fail(`write link = ${writeHref}`);

    console.log('');
    if(jsErrors.length){ jsErrors.forEach(e=>fail(`JS error: ${e}`)); } else pass('no uncaught JS errors');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n' + '='.repeat(50));
  if(errors.length){ console.log(`❌ ${errors.length} check(s) failed`); process.exit(1); }
  console.log('✅ ALL Writing Prompt checks passed'); process.exit(0);
}
run().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
