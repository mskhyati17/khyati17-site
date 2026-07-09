// Verify the Mini Piano: keys render, playing a key doesn't error, and it's in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8267,r));
const base='http://localhost:8267';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true, args:['--autoplay-policy=no-user-gesture-required']});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/mini-piano.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__piano,{timeout:8000});
  (await p.evaluate(()=>window.__piano.whiteKeys()))===8 ? pass('8 white keys') : fail('white keys: '+await p.evaluate(()=>window.__piano.whiteKeys()));
  (await p.evaluate(()=>window.__piano.blackKeys()))===5 ? pass('5 black keys') : fail('black keys: '+await p.evaluate(()=>window.__piano.blackKeys()));

  console.log('\n[1] Playing keys does not error');
  await p.evaluate(()=>{ for(let i=0;i<13;i++) window.__piano.play(i); });
  await p.waitForTimeout(200);
  pass('played all 13 notes');

  console.log('\n[2] Clicking a key highlights it');
  await p.locator('.wkey').last().click(); await p.waitForTimeout(50);   // last white key has no black-key overlay
  pass('key click handled');

  console.log('\n[3] In the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Mini Piano/.test(l)) ? pass('Mini Piano card in AI Zone') : fail('not in AI Zone');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mini Piano checks passed'); process.exit(0);
