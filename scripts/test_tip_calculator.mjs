// Verify Tip Calculator & Bill Splitter: math is correct for bill/tip/split,
// tip-% buttons and the people stepper update the result, and it's listed
// in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8336,r));
const base='http://localhost:8336';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/tip-calculator.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__tipCalc,{timeout:8000});

  console.log('\n[1] Default 100 bill @ 15% tip, 1 person');
  const v0=await p.evaluate(()=>window.__tipCalc.values());
  (Math.abs(v0.tip-15)<0.01 && Math.abs(v0.total-115)<0.01) ? pass('tip=$15.00, total=$115.00') : fail('got tip='+v0.tip+' total='+v0.total);

  console.log('\n[2] Changing bill recalculates correctly');
  const v1=await p.evaluate(()=>window.__tipCalc.setBill(200));
  (Math.abs(v1.tip-30)<0.01 && Math.abs(v1.total-230)<0.01) ? pass('bill=200 -> tip=$30.00, total=$230.00') : fail('got '+JSON.stringify(v1));

  console.log('\n[3] Tip % buttons change the tip amount');
  const v2=await p.evaluate(()=>window.__tipCalc.setTip(20));
  (Math.abs(v2.tip-40)<0.01) ? pass('20% of 200 -> tip=$40.00') : fail('got tip='+v2.tip);

  console.log('\n[4] Splitting between people divides the total correctly');
  const v3=await p.evaluate(()=>window.__tipCalc.setPeople(4));
  (Math.abs(v3.perPerson-60)<0.01) ? pass('240/4 people = $60.00 each') : fail('got perPerson='+v3.perPerson);

  console.log('\n[5] In the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Tip Calculator/.test(l)) ? pass('Tip Calculator card in AI Zone') : fail('not in AI Zone');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Tip Calculator checks passed'); process.exit(0);
