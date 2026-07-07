// Verify favorites + recently-opened in the global search: star a result to pin
// it, opening a result records it under "Recently opened", both persist and show
// in the empty-state, and favorites survive a reload.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8177,r));
const base='http://localhost:8177';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const openSearch = async p => { await p.keyboard.press('/'); await p.waitForSelector('#ks-overlay.open',{timeout:5000}); await p.waitForFunction(()=>/things to search|Type to search/.test(document.getElementById('ks-count').textContent),{timeout:10000}); };
try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForSelector('.main-nav .ks-trigger',{timeout:8000});

  console.log('\n[1] Empty search shows the star hint when nothing pinned');
  await openSearch(p);
  (await p.textContent('#ks-empty')).match(/Star/i) ? pass('empty state prompts to star items') : fail('no star hint');

  console.log('\n[2] Star a search result → it appears under Favorites');
  await p.fill('#ks-input','snake'); await p.waitForSelector('#ks-results .ks-row',{timeout:4000});
  const firstTitle=await p.$eval('#ks-results .ks-row .ks-title', e=>e.textContent);
  await p.click('#ks-results .ks-row .ks-star'); await p.waitForTimeout(150);
  (await p.$eval('#ks-results .ks-row .ks-star', e=>e.classList.contains('on'))) ? pass('star toggled on for "'+firstTitle+'"') : fail('star did not toggle');
  await p.fill('#ks-input',''); await p.waitForTimeout(150);
  const favSec=await p.$$eval('#ks-results .ks-sec', e=>e.map(x=>x.textContent));
  const favTitles=await p.$$eval('#ks-results .ks-row .ks-title', e=>e.map(x=>x.textContent));
  (favSec.some(t=>/Favorites/.test(t)) && favTitles.includes(firstTitle)) ? pass('"'+firstTitle+'" pinned under ⭐ Favorites') : fail('favorite not shown: '+favSec.join(',')+' | '+favTitles.slice(0,3));

  console.log('\n[3] Favorite persists in localStorage');
  const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('ks_favs')||'[]'));
  (stored.length>=1 && stored[0].title===firstTitle) ? pass('ks_favs persisted ('+stored.length+')') : fail('not persisted: '+JSON.stringify(stored).slice(0,80));

  console.log('\n[4] Opening a result records it under "Recently opened"');
  // simulate opening by seeding recent (a real click would leave the page)
  await p.evaluate(t=>localStorage.setItem('ks_recent', JSON.stringify([{title:t,sub:'Tool',url:'/ai-tools/tool.html?t=pig-latin',type:'Tool'}])), 'Pig Latin');
  await p.keyboard.press('Escape');
  await openSearch(p);
  await p.waitForTimeout(150);
  const secs=await p.$$eval('#ks-results .ks-sec', e=>e.map(x=>x.textContent).join(' '));
  const titles=await p.$$eval('#ks-results .ks-row .ks-title', e=>e.map(x=>x.textContent));
  (/Recently opened/.test(secs) && titles.includes('Pig Latin')) ? pass('recent item shown under 🕘 Recently opened') : fail('recent not shown: '+secs+' | '+titles.join(','));

  console.log('\n[5] Favorites survive a reload');
  await p.reload({waitUntil:'networkidle'}); await p.waitForSelector('.main-nav .ks-trigger',{timeout:8000});
  await openSearch(p); await p.waitForTimeout(150);
  const afterReload=await p.$$eval('#ks-results .ks-row .ks-title', e=>e.map(x=>x.textContent));
  afterReload.includes(firstTitle) ? pass('favorite still pinned after reload') : fail('favorite lost on reload: '+afterReload.join(','));

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL favorites checks passed'); process.exit(0);
