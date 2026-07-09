// Verify Spin the Wheel: renders, spinning picks one of the current items, custom
// items work, and it's listed in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8269,r));
const base='http://localhost:8269';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/spin-wheel.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__wheel,{timeout:8000});
  (await p.evaluate(()=>window.__wheel.items().length))===6 ? pass('6 default options parsed') : fail('default items wrong');

  console.log('\n[1] Custom options update the wheel');
  await p.evaluate(()=>window.__wheel.setItems('Alpha\nBeta\nGamma'));
  JSON.stringify(await p.evaluate(()=>window.__wheel.items()))==='["Alpha","Beta","Gamma"]' ? pass('custom items applied') : fail('custom items wrong');

  console.log('\n[2] Spinning picks one of the items');
  await p.evaluate(()=>window.__wheel.spin());
  const w=await p.evaluate(()=>window.__wheel.lastWinner);
  ['Alpha','Beta','Gamma'].includes(w) ? pass('winner is a valid option ('+w+')') : fail('bad winner: '+w);

  console.log('\n[3] Winner is announced after the spin');
  await p.waitForFunction(()=>/picked/i.test(document.getElementById('winner').textContent),{timeout:7000}).catch(()=>{});
  /picked/i.test(await p.textContent('#winner')) ? pass('winner announced') : fail('no winner text');

  console.log('\n[4] In the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Spin the Wheel/.test(l)) ? pass('Spin the Wheel card in AI Zone') : fail('not in AI Zone');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Spin the Wheel checks passed'); process.exit(0);
