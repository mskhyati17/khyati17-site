// Verify the 404 page: renders, section links present, and the "Search the
// site" button opens the global search overlay.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8182,r));
const base='http://localhost:8182';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/404.html`,{waitUntil:'networkidle',timeout:15000});
  (await p.textContent('.big'))==='404' ? pass('renders the 404') : fail('no 404');
  (await p.$$eval('.links a', e=>e.length))>=5 ? pass('section links present') : fail('links missing');
  await p.click('#do-search'); await p.waitForSelector('#ks-overlay.open',{timeout:5000});
  pass('"Search the site" opens the global search');
  await p.waitForFunction(()=>/things to search|Type to search/.test(document.getElementById('ks-count').textContent),{timeout:10000});
  await p.fill('#ks-input','snake'); await p.waitForSelector('#ks-results .ks-row',{timeout:4000});
  pass('search works from the 404 page');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL 404 checks passed'); process.exit(0);
