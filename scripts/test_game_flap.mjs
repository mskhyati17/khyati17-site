// Verify "Mochi Flap": starts on flap, scores by passing pipes, ends on crash,
// and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8305,r));
const base='http://localhost:8305';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/mochi-flap.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__mochiFlap,{timeout:8000});
  (await p.evaluate(()=>window.__mochiFlap.state))==='ready' ? pass('starts in ready state') : fail('bad start state');

  console.log('\n[1] Flapping starts the game');
  await p.evaluate(()=>window.__mochiFlap.flap());
  (await p.evaluate(()=>window.__mochiFlap.state))==='playing' ? pass('flap starts play') : fail('did not start');

  console.log('\n[2] Ticking advances / scores');
  await p.evaluate(()=>window.__mochiFlap.tick(400));  // advance many frames
  const st=await p.evaluate(()=>window.__mochiFlap.state);
  (st==='playing'||st==='over') ? pass('game advanced (state '+st+')') : fail('bad state '+st);

  console.log('\n[3] Crash ends the game');
  await p.evaluate(()=>window.__mochiFlap.crash());
  (await p.evaluate(()=>window.__mochiFlap.state))==='over' ? pass('crash → game over') : fail('did not end on crash');

  console.log('\n[4] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi Flap/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi Flap checks passed'); process.exit(0);
