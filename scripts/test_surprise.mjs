import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8203,r));
const base='http://localhost:8203';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForSelector('#surprise',{timeout:8000}); pass('Surprise Me button present');
  const dests=new Set();
  for(let i=0;i<6;i++){
    await p.goto(`${base}/home/index.html`,{waitUntil:'domcontentloaded'});
    await p.waitForSelector('#surprise');
    await Promise.all([p.waitForNavigation({timeout:8000}).catch(()=>{}), p.click('#surprise')]);
    const u=p.url().replace(base,''); dests.add(u.split('?')[0]);
    // verify the destination is a real page (200, has content)
    const bodyLen=await p.evaluate(()=>document.body?document.body.innerText.length:0).catch(()=>0);
    if(bodyLen<20) fail('landed on empty page: '+u);
  }
  (dests.size>=2) ? pass('navigates to varied destinations: '+[...dests].slice(0,4).join(', ')) : fail('not varied: '+[...dests]);
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Surprise Me checks passed'); process.exit(0);
