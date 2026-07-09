// Verify the Doodle Pad: drawing marks the canvas, clear wipes it, eraser paints
// white, and it's listed in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8263,r));
const base='http://localhost:8263';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/doodle-pad.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__doodle,{timeout:8000});
  (await p.$$eval('.swatch', e=>e.length))>=8 ? pass('colour swatches render') : fail('no swatches');
  (await p.evaluate(()=>window.__doodle.nonWhitePixels()))===0 ? pass('canvas starts blank') : fail('canvas not blank at start');

  console.log('\n[1] Drawing marks the canvas');
  await p.evaluate(()=>window.__doodle.strokeLine(20,20,480,340));
  const drawn=await p.evaluate(()=>window.__doodle.nonWhitePixels());
  drawn>0 ? pass('stroke drew pixels ('+drawn+')') : fail('no pixels drawn');

  console.log('\n[2] Clear wipes the canvas');
  await p.evaluate(()=>window.__doodle.clear());
  (await p.evaluate(()=>window.__doodle.nonWhitePixels()))===0 ? pass('clear wiped canvas') : fail('clear did not wipe');

  console.log('\n[3] Eraser paints white (leaves no mark on blank)');
  await p.evaluate(()=>{ window.__doodle.setErasing(true); window.__doodle.strokeLine(50,50,200,200); });
  (await p.evaluate(()=>window.__doodle.nonWhitePixels()))===0 ? pass('eraser leaves white') : fail('eraser marked canvas');

  console.log('\n[4] Listed in the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Doodle Pad/.test(l)) ? pass('Doodle Pad card in AI Zone grid') : fail('not in AI Zone grid');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Doodle Pad checks passed'); process.exit(0);
