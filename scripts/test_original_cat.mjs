// Verify the "⭐ Original" GameZone category surfaces exactly the 6 original games.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8230,r));
const base='http://localhost:8230';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForSelector('#catStrip .chip',{timeout:10000});
  const chips=await p.$$eval('#catStrip .chip', e=>e.map(x=>x.textContent.trim()));
  chips.some(c=>/Original/.test(c)) ? pass('"⭐ Original" chip present') : fail('no Original chip: '+chips.join(','));
  // click the Original chip
  for(const c of await p.$$('#catStrip .chip')){ if(/Original/.test(await c.textContent())){ await c.click(); break; } }
  await p.waitForTimeout(500);
  const names=await p.$$eval('#grid .card .label, #grid .card .name, #grid .card h3', e=>e.map(x=>x.textContent.trim()));
  const cnt=await p.$$eval('#grid .card', e=>e.length);
  const want=["Mochi's Treat Catch","Mochi Says","Perfect Fetch","Word Rescue","Paw Reflex","Mochi Quiz","Mochi Match"];
  const allShown=want.every(w=>names.some(n=>n.includes(w)));
  (cnt===7 && allShown) ? pass('Original filter shows exactly the 7 originals') : fail('got '+cnt+' cards: '+names.join(', '));
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Original-category checks passed'); process.exit(0);
