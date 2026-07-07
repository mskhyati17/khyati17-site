// Verify "Perfect Fetch": tapping inside the green zone scores, outside costs a
// life, lives→0 ends the game, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8188,r));
const base='http://localhost:8188';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/perfect-fetch.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__perfectFetch,{timeout:8000});
  pass('game loads');

  console.log('\n[1] Tap in the zone scores');
  await p.evaluate(()=>{ const z=window.__perfectFetch.zone(); window.__perfectFetch.setPos((z.lo+z.hi)/2); window.__perfectFetch.tap(); });
  await p.waitForTimeout(50);
  (parseInt(await p.textContent('#score'),10)>=1) ? pass('scored a hit') : fail('no score');

  console.log('\n[2] Tap outside the zone costs a life');
  await p.evaluate(()=>{ const z=window.__perfectFetch.zone(); let x=z.lo-20; if(x<6)x=z.hi+20; window.__perfectFetch.setPos(x); window.__perfectFetch.tap(); });
  await p.waitForTimeout(50);
  (await p.evaluate(()=>window.__perfectFetch.lives))===2 ? pass('miss cost a life (2 left)') : fail('lives: '+await p.evaluate(()=>window.__perfectFetch.lives));

  console.log('\n[3] Running out of lives ends the game');
  await p.evaluate(()=>{ for(let i=0;i<2;i++){ const z=window.__perfectFetch.zone(); let x=z.lo-20; if(x<6)x=z.hi+20; window.__perfectFetch.setPos(x); window.__perfectFetch.tap(); } });
  await p.waitForTimeout(80);
  (await p.evaluate(()=>window.__perfectFetch.state))==='over' ? pass('game over at 0 lives') : fail('did not end');

  console.log('\n[4] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Perfect Fetch/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Perfect Fetch checks passed'); process.exit(0);
