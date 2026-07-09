// Verify GameZone pagination: initial render is capped (~60 cards, fast), "Load
// more" reveals the next batch, category/search filtering still works, and
// clicking a game still navigates. Also re-measures render perf.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.jpg':'image/jpeg'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'text/html'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8287,r));
const base='http://localhost:8287';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const ctx=await b.newContext({viewport:{width:390,height:800}}); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  const client=await ctx.newCDPSession(p); await client.send('Emulation.setCPUThrottlingRate',{rate:4});
  const t0=Date.now();
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForSelector('#grid .card',{timeout:15000});
  const ready=Date.now()-t0;
  const initial=await p.$$eval('#grid .card', e=>e.length);
  (initial<=61) ? pass('initial grid capped at '+initial+' cards (was ~2130)') : fail('too many initial cards: '+initial);
  (ready<2500) ? pass('DOMready fast on 4x-CPU mobile: '+ready+'ms (was 5600ms)') : fail('still slow: '+ready+'ms');

  console.log('\n[1] "Load more" reveals the next batch');
  (await p.$('#loadMoreWrap .load-more-btn')) ? pass('load-more button present') : fail('no load-more button');
  await p.click('#loadMoreWrap .load-more-btn'); await p.waitForTimeout(200);
  (await p.$$eval('#grid .card', e=>e.length))>initial ? pass('more cards after load-more ('+await p.$$eval('#grid .card',e=>e.length)+')') : fail('load-more did nothing');

  console.log('\n[2] Category filter still works + paginates');
  for(const c of await p.$$('#catStrip .chip')){ if(/Original/.test(await c.textContent())){ await c.click(); break; } }
  await p.waitForTimeout(300);
  const origCount=await p.$$eval('#grid .card', e=>e.length);
  (origCount===10 && !(await p.$('#loadMoreWrap .load-more-btn'))) ? pass('Original category shows all 10, no load-more') : fail('original filter: '+origCount+' cards');

  console.log('\n[3] Search still works');
  await p.fill('#search','snake'); await p.waitForTimeout(300);
  (await p.$$eval('#grid .card', e=>e.length))>0 ? pass('search returns results') : fail('search broke');

  console.log('\n[4] Clicking a game still navigates');
  await p.fill('#search',''); await p.waitForTimeout(200);
  for(const c of await p.$$('#catStrip .chip')){ if(/Original/.test(await c.textContent())){ await c.click(); break; } }
  await p.waitForTimeout(200);
  await p.click('#grid .card'); await p.waitForTimeout(500);
  /fun-games\/(mochi|perfect|word|paw|whack)/.test(p.url()) ? pass('game click navigates ('+p.url().split('/').pop()+')') : fail('click did not navigate: '+p.url());

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL GameZone pagination checks passed'); process.exit(0);
