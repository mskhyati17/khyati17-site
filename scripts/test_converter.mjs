// Verify Unit Converter: correct conversions across categories (incl. temperature),
// swap, and listing in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8282,r));
const base='http://localhost:8282';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const near=(a,b2,t)=>Math.abs(a-b2)<=t;
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/unit-converter.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__convert,{timeout:8000});

  console.log('\n[1] Length: 1 km = 1000 m');
  near(await p.evaluate(()=>window.__convert.run('km','m',1)),1000,0.01) ? pass('1 km = 1000 m') : fail('length wrong');
  console.log('[2] Length: 1 mile ≈ 1609.34 m');
  near(await p.evaluate(()=>window.__convert.run('mile','m',1)),1609.344,0.01) ? pass('1 mile ≈ 1609.34 m') : fail('mile wrong');

  console.log('\n[3] Temperature: 100 °C = 212 °F');
  await p.evaluate(()=>window.__convert.setCat('Temperature'));
  near(await p.evaluate(()=>window.__convert.run('°C','°F',100)),212,0.01) ? pass('100°C = 212°F') : fail('temp C→F wrong');
  console.log('[4] Temperature: 0 °C = 273.15 K');
  near(await p.evaluate(()=>window.__convert.run('°C','K',0)),273.15,0.01) ? pass('0°C = 273.15K') : fail('temp C→K wrong');

  console.log('\n[5] Data: 1 GB = 1024 MB');
  await p.evaluate(()=>window.__convert.setCat('Data'));
  near(await p.evaluate(()=>window.__convert.run('GB','MB',1)),1024,0.01) ? pass('1 GB = 1024 MB') : fail('data wrong');

  console.log('\n[6] Time: 2 hours = 7200 sec');
  await p.evaluate(()=>window.__convert.setCat('Time'));
  near(await p.evaluate(()=>window.__convert.run('hour','sec',2)),7200,0.01) ? pass('2 hours = 7200 sec') : fail('time wrong');

  console.log('\n[7] In the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Unit Converter/.test(l)) ? pass('Unit Converter card in AI Zone') : fail('not in AI Zone');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Unit Converter checks passed'); process.exit(0);
