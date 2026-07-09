// Verify "Whack-a-Mochi": whacking a Mochi scores, whacking a bomb costs points,
// the round ends, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8258,r));
const base='http://localhost:8258';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/whack-a-mochi.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__whackMochi,{timeout:8000});
  (await p.$$eval('.hole', e=>e.length))===9 ? pass('9 holes render') : fail('holes missing');

  console.log('\n[1] Whacking a Mochi scores');
  await p.evaluate(()=>{ window.__whackMochi.start(); window.__whackMochi.spawn(4,'mochi'); window.__whackMochi.whack(4); });
  (await p.evaluate(()=>window.__whackMochi.score))===1 ? pass('mochi whack scored +1') : fail('score not 1');

  console.log('\n[2] Whacking a bomb costs points');
  await p.evaluate(()=>{ window.__whackMochi.spawn(0,'mochi'); window.__whackMochi.whack(0); window.__whackMochi.spawn(0,'mochi'); window.__whackMochi.whack(0); }); // score now 3
  await p.evaluate(()=>{ window.__whackMochi.spawn(1,'bomb'); window.__whackMochi.whack(1); });
  (await p.evaluate(()=>window.__whackMochi.score))===1 ? pass('bomb whack cost -2 (3→1)') : fail('bomb score wrong: '+await p.evaluate(()=>window.__whackMochi.score));

  console.log('\n[3] Round ends');
  await p.evaluate(()=>window.__whackMochi.end());
  (await p.evaluate(()=>window.__whackMochi.state))==='over' ? pass('round ended') : fail('not over');

  console.log('\n[4] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Whack-a-Mochi/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Whack-a-Mochi checks passed'); process.exit(0);
