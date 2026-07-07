// Verify the PWA "Install App" button: hidden until the browser fires
// beforeinstallprompt, then appears and triggers the install prompt on click.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.jpg':'image/jpeg'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8181,r));
const base='http://localhost:8181';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle',timeout:20000});

  console.log('\n[1] Install button hidden until installable');
  (await p.isHidden('#install-app')) ? pass('button hidden by default') : fail('button visible without prompt');

  console.log('\n[2] beforeinstallprompt reveals the button');
  await p.evaluate(()=>{ const e=new Event('beforeinstallprompt'); e.prompt=()=>{ window.__installPrompted=true; return Promise.resolve(); }; window.dispatchEvent(e); });
  await p.waitForTimeout(150);
  (await p.isVisible('#install-app')) ? pass('button shown after beforeinstallprompt') : fail('button still hidden');

  console.log('\n[3] Clicking triggers the install prompt');
  await p.click('#install-app'); await p.waitForTimeout(150);
  (await p.evaluate(()=>window.__installPrompted)) ? pass('prompt() called on click') : fail('prompt not called');
  (await p.isHidden('#install-app')) ? pass('button hides after prompting') : fail('button did not hide');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL install-button checks passed'); process.exit(0);
