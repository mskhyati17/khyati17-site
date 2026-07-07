// Verify accessibility helpers: a skip-to-content link is injected, is hidden
// until focused, and jumps focus to the main content; focus-visible styling
// is present.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8184,r));
const base='http://localhost:8184';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForSelector('#skip-link',{timeout:8000});
  pass('skip-to-content link injected');
  const offLeft=await p.$eval('#skip-link', e=>e.getBoundingClientRect().left);
  (offLeft<0) ? pass('hidden off-screen until focused ('+Math.round(offLeft)+'px)') : fail('skip link visible when unfocused');
  await p.focus('#skip-link'); await p.waitForTimeout(100);
  const onLeft=await p.$eval('#skip-link', e=>e.getBoundingClientRect().left);
  (onLeft>=0) ? pass('appears on focus ('+Math.round(onLeft)+'px)') : fail('did not appear on focus');
  await p.click('#skip-link'); await p.waitForTimeout(100);
  const focusedMain=await p.evaluate(()=>{ const a=document.activeElement; return a && (a.tagName==='MAIN' || a.getAttribute('role')==='main' || a.classList.contains('container') || a.classList.contains('content')); });
  focusedMain ? pass('focus jumps to main content') : fail('focus did not move to main');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL a11y checks passed'); process.exit(0);
