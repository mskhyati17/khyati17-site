// Verify Stopwatch & Timer: stopwatch counts up + laps, timer counts down + tab
// switching works, and it's in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8276,r));
const base='http://localhost:8276';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/stopwatch.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__timer,{timeout:8000});

  console.log('\n[1] Stopwatch counts up');
  await p.evaluate(()=>window.__timer.swStart());
  await p.waitForTimeout(350);
  await p.evaluate(()=>window.__timer.swStop());
  (await p.evaluate(()=>window.__timer.swElapsed()))>200 ? pass('elapsed advanced ('+await p.evaluate(()=>window.__timer.swElapsed())+'ms)') : fail('stopwatch did not advance');

  console.log('\n[2] Lap records a time');
  await p.evaluate(()=>window.__timer.lap());
  (await p.evaluate(()=>window.__timer.lapCount()))===1 ? pass('lap recorded') : fail('lap not recorded');

  console.log('\n[3] Timer sets and counts down');
  await p.click('#tab-tm'); await p.waitForTimeout(100);
  await p.evaluate(()=>window.__timer.setTimer(2,0));
  (await p.evaluate(()=>window.__timer.timerText()))==='02:00' ? pass('timer set to 02:00') : fail('timer text: '+await p.evaluate(()=>window.__timer.timerText()));
  await p.click('#tm-toggle'); await p.waitForTimeout(1200); await p.click('#tm-toggle');
  (await p.evaluate(()=>window.__timer.timerRemaining()))<120000 ? pass('timer counted down') : fail('timer did not count down');

  console.log('\n[4] In the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Stopwatch/.test(l)) ? pass('Stopwatch card in AI Zone') : fail('not in AI Zone');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Stopwatch checks passed'); process.exit(0);
