// Verify "Paw Reflex": tapping on green records a reaction time, tapping during
// the wait is "too soon", and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8213,r));
const base='http://localhost:8213';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/paw-reflex.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__pawReflex,{timeout:8000}); pass('game loads');

  console.log('\n[1] Green → tap records a reaction time');
  await p.evaluate(()=>window.__pawReflex.tap());          // start (idle->wait)
  await p.evaluate(()=>window.__pawReflex.forceGreen());   // -> go
  await p.waitForTimeout(30);
  await p.evaluate(()=>window.__pawReflex.tap());          // tap on green
  const last=await p.evaluate(()=>window.__pawReflex.last);
  (typeof last==='number' && last>=0 && last<2000) ? pass('recorded reaction time: '+last+'ms') : fail('bad time: '+last);

  console.log('\n[2] Tapping during the wait is "too soon"');
  await p.evaluate(()=>window.__pawReflex.tap());          // result->wait (arm)
  await p.evaluate(()=>window.__pawReflex.tap());          // tap during wait
  const msg=await p.textContent('#pad-txt');
  /too soon/i.test(msg) ? pass('early tap flagged: "'+msg+'"') : fail('no too-soon: '+msg);

  console.log('\n[3] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Paw Reflex/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Paw Reflex checks passed'); process.exit(0);
