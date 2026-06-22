// Functional checks for the 5 new client-side AI tools:
// Password Generator, Color Palette, Hashtag Generator, Emoji Translator, Decision Maker.
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
  const PORT = 8134;
  const server = await startServer(PORT);
  const base = `http://localhost:${PORT}`;
  const errors = [];
  const pass = m => console.log(`  ✓ ${m}`);
  const fail = m => { console.log(`  ✗ ${m}`); errors.push(m); };
  const browser = await chromium.launch({ headless:true });
  const allJsErrors = [];

  async function withPage(name, file, fn){
    const page = await browser.newPage();
    const jsErrors = []; page.on('pageerror', e=>jsErrors.push(`${name}: ${e.message}`));
    await page.goto(`${base}/ai-tools/${file}`, { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(150);
    await fn(page);
    allJsErrors.push(...jsErrors);
    await page.close();
  }

  try{
    // Password Generator
    console.log('\n[Password Generator]');
    await withPage('Password','password-generator.html', async page=>{
      const p1 = await page.textContent('#pwOut');
      await page.click('#pwGen'); await page.waitForTimeout(60);
      const p2 = await page.textContent('#pwOut');
      (p2 && p2.length>=6 && p2!=='click generate…') ? pass(`generated password (len ${p2.length})`) : fail(`bad password: ${JSON.stringify(p2)}`);
      p1 !== p2 ? pass('regenerate changes the password') : fail('password did not change');
    });

    // Color Palette
    console.log('\n[Color Palette]');
    await withPage('Color','color-palette.html', async page=>{
      await page.click('#genBtn'); await page.waitForTimeout(60);
      const hexes = await page.$$eval('#palette .swatch span', ns=>ns.map(n=>n.textContent.trim()));
      const valid = hexes.length===5 && hexes.every(h=>/^#[0-9A-F]{6}$/.test(h));
      valid ? pass(`5 valid hex colours: ${hexes.join(' ')}`) : fail(`bad palette: ${JSON.stringify(hexes)}`);
    });

    // Hashtag Generator
    console.log('\n[Hashtag Generator]');
    await withPage('Hashtag','hashtag-generator.html', async page=>{
      await page.fill('#topic','travel photography');
      await page.click('#genBtn'); await page.waitForTimeout(60);
      const tags = await page.$$eval('#tags .tag', ns=>ns.map(n=>n.textContent.trim()));
      const ok = tags.length>0 && tags.every(t=>t.startsWith('#')) && tags.some(t=>t.includes('travel'));
      ok ? pass(`${tags.length} hashtags incl. topic (${tags.slice(0,3).join(' ')}…)`) : fail(`bad hashtags: ${JSON.stringify(tags)}`);
    });

    // Emoji Translator
    console.log('\n[Emoji Translator]');
    await withPage('Emoji','emoji-translator.html', async page=>{
      await page.fill('#inp','I love pizza and my dog');
      await page.click('#genBtn'); await page.waitForTimeout(60);
      const out = await page.textContent('#out');
      (out.includes('❤️') && out.includes('🍕') && out.includes('🐶')) ? pass(`emoji-fied: ${JSON.stringify(out)}`) : fail(`no emojis: ${JSON.stringify(out)}`);
    });

    // Decision Maker
    console.log('\n[Decision Maker]');
    await withPage('Decision','decision-maker.html', async page=>{
      await page.click('#goBtn'); await page.waitForTimeout(60);
      const coin = await page.textContent('#rBig');
      ['Heads','Tails'].includes(coin) ? pass(`coin flip -> ${coin}`) : fail(`coin gave ${JSON.stringify(coin)}`);
      // pick-from-list mode
      await page.click('#modes .mode[data-m="pick"]');
      await page.fill('#opts','Pizza\nSushi\nTacos');
      await page.click('#goBtn'); await page.waitForTimeout(60);
      const winner = await page.textContent('#rBig');
      ['Pizza','Sushi','Tacos'].includes(winner) ? pass(`pick from list -> ${winner}`) : fail(`pick gave ${JSON.stringify(winner)}`);
    });

    console.log('');
    if(allJsErrors.length){ allJsErrors.forEach(e=>fail(`JS error: ${e}`)); } else pass('no uncaught JS errors across all 5 tools');
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n' + '='.repeat(50));
  if(errors.length){ console.log(`❌ ${errors.length} check(s) failed`); process.exit(1); }
  console.log('✅ ALL 5 new-tool checks passed'); process.exit(0);
}
run().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
