// Verify "Mochi Type": has a target sentence, typing it completes with a WPM, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8278,r));
const base='http://localhost:8278';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/mochi-type.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__mochiType && window.__mochiType.target().length>0,{timeout:8000});
  (await p.$$eval('.target span', e=>e.length))>0 ? pass('target sentence rendered as chars') : fail('no target chars');

  console.log('\n[1] Typing the sentence completes with a WPM');
  await p.evaluate(()=>window.__mochiType.setText('the quick brown fox'));
  await p.evaluate(()=>window.__mochiType.type('t'));   // starts the timer
  await p.waitForTimeout(300);
  await p.evaluate(()=>window.__mochiType.type('the quick brown fox'));  // finish
  await p.waitForTimeout(80);
  (await p.evaluate(()=>window.__mochiType.done())) ? pass('marked done on completion') : fail('not done');
  (await p.evaluate(()=>window.__mochiType.wpm()))>0 ? pass('WPM computed ('+await p.evaluate(()=>window.__mochiType.wpm())+')') : fail('WPM is 0');

  console.log('\n[2] Correct/incorrect chars are marked');
  await p.evaluate(()=>window.__mochiType.setText('abcdef'));
  await p.evaluate(()=>window.__mochiType.type('abXd'));
  ((await p.$$eval('.target .ok', e=>e.length))>=3 && (await p.$$eval('.target .bad', e=>e.length))>=1) ? pass('ok + bad chars highlighted') : fail('char highlighting wrong');

  console.log('\n[3] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi Type/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi Type checks passed'); process.exit(0);
