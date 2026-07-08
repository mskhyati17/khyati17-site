import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8201,r));
const base='http://localhost:8201';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/about/about.html`,{waitUntil:'networkidle',timeout:20000});
  (await p.textContent('.about h1')).includes('About') ? pass('About hero renders') : fail('no hero');
  (await p.$$eval('.a-stat', e=>e.length))===4 ? pass('4 stat cards') : fail('stats missing');
  const cards=await p.$$eval('.a-card', e=>e.map(x=>x.getAttribute('href')));
  (cards.length>=6 && cards.includes('/fun-games/index.html') && cards.includes('/me/index.html')) ? pass(cards.length+' section cards linking out') : fail('cards: '+cards);
  (await p.$$eval('.a-why div', e=>e.length))>=5 ? pass('"why different" points') : fail('no why points');
  (await p.$$eval('.a-cta a', e=>e.length))>=2 ? pass('CTA buttons') : fail('no CTAs');
  await Promise.all([p.waitForNavigation({timeout:8000}).catch(()=>{}), p.click('.a-card[href="/fun-games/index.html"]')]);
  /fun-games/.test(p.url()) ? pass('a card navigates') : fail('nav failed');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL About checks passed'); process.exit(0);
