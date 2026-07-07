import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8185,r));
const base='http://localhost:8185';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  console.log('\n[1] Story Hub lists the new stories');
  await p.goto(`${base}/stories/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const count=await p.evaluate(()=>document.body.innerText);
  /Lighthouse of Lost Things|Mochi|Owl Learned to Laugh|Robot Who Collected/i.test(count) ? pass('new stories appear on the hub') : fail('new stories not listed');
  console.log('\n[2] Reader opens a new story with its body');
  await p.goto(`${base}/stories/stories.html?story=lighthouse-of-lost-things`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(500);
  /Odette|Lighthouse|Teo/i.test(await p.evaluate(()=>document.body.innerText)) ? pass('reader shows the story text') : fail('story body missing');
  console.log('\n[3] New story is searchable');
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForSelector('.main-nav .ks-trigger',{timeout:8000});
  await p.keyboard.press('/'); await p.waitForSelector('#ks-overlay.open',{timeout:5000});
  await p.waitForFunction(()=>/things to search|Type to search/.test(document.getElementById('ks-count').textContent),{timeout:10000});
  await p.fill('#ks-input','umbrella shop'); await p.waitForTimeout(300);
  (await p.$$eval('#ks-results .ks-row', e=>e.some(x=>/Umbrella Shop/i.test(x.textContent)))) ? pass('search finds a new story') : fail('search miss');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL new-stories checks passed'); process.exit(0);
