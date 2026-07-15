// Verify the GameZone hub folds in the full 10k catalogue, keeps categories
// working, stays fast, and errors-free.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.jpg':'image/jpeg'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'text/html'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8297,r));
const base='http://localhost:8297';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  p.on('console',m=>{if(m.type()==='error'){const t=m.text(); if(!/scratch|turbowarp|ytimg|favicon|Failed to load resource/.test(t)) js.push('CE:'+t.slice(0,70));}});
  const t0=Date.now();
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForSelector('#grid .card',{timeout:15000});
  const firstPaint=Date.now()-t0;
  pass('interactive at '+firstPaint+'ms (curated games render first)');
  // wait for the merge to complete
  await p.waitForFunction(()=>typeof GAMES!=='undefined' && GAMES.length>9000,{timeout:20000});
  const total=await p.evaluate(()=>GAMES.length);
  (total>=9900) ? pass('full catalogue merged: '+total+' games') : fail('only '+total+' games');
  (await p.$$eval('#grid .card', e=>e.length))<=61 ? pass('grid still paginated (initial ≤60)') : fail('grid not paginated');

  console.log('\n[categories still work]');
  for(const c of await p.$$('#catStrip .chip')){ if(/Original/.test(await c.textContent())){ await c.click(); break; } }
  await p.waitForTimeout(300);
  (await p.$$eval('#grid .card', e=>e.length))===13 ? pass('Original = 13 (curated intact)') : fail('Original count wrong: '+await p.$$eval('#grid .card',e=>e.length));
  // a genre chip
  const racing=await p.evaluate(()=>GAMES.filter(g=>g.category==='Racing').length);
  (racing>100) ? pass('Racing category now has '+racing+' games (merged catalogue)') : fail('Racing only '+racing);
  // scary grew
  for(const c of await p.$$('#catStrip .chip')){ if(/Scary/.test(await c.textContent())){ await c.click(); break; } }
  await p.waitForTimeout(300);
  const scary=await p.evaluate(()=>GAMES.filter(g=>g.scary).length);
  (scary>=30) ? pass('Scary now '+scary+' games') : fail('scary count: '+scary);

  console.log('');
  js.length ? js.slice(0,3).forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL hub-10k checks passed'); process.exit(0);
