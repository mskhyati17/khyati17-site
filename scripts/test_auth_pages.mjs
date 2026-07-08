// Guard: sign-up & sign-in pages must render the shared header (single avatar)
// and a styled form, with no JS errors. (Regression guard after header cleanup.)
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8207,r));
const base='http://localhost:8207';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  for(const [url,form] of [['/admin/signup.html','#signup-form'],['/admin/login.html','#login-form']]){
    const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
    await p.goto(base+url,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1000);
    const hdr=await p.$$eval('.site-header', e=>e.length);
    const av=await p.$$eval('.avatar', e=>e.length);
    (hdr===1 && av===1) ? pass(url+': single header + avatar') : fail(url+': headers='+hdr+' avatars='+av);
    (await p.$(form)) ? pass(url+': form present') : fail(url+': form missing');
    const radius=await p.$eval(form+' input', el=>getComputedStyle(el).borderRadius).catch(()=>'0px');
    (parseInt(radius)>=6) ? pass(url+': inputs styled (radius '+radius+')') : fail(url+': inputs unstyled');
    js.length ? js.forEach(e=>fail(url+' JS error: '+e)) : pass(url+': no JS errors');
    await p.close();
  }
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL auth-page checks passed'); process.exit(0);
