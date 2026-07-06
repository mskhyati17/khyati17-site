// Verify PWA support: the site registers a service worker, injects the manifest
// + theme-color sitewide, and stays usable offline (cached pages served; a
// friendly offline page for uncached navigations).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>srv.listen(8162,r));
const base='http://localhost:8162';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const ctx=await b.newContext();
  const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Service worker registers + controls the page');
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});
  await p.evaluate(()=>navigator.serviceWorker.ready);
  pass('service worker reached "ready" (activated)');
  await p.reload({waitUntil:'networkidle'});
  const controlled=await p.evaluate(()=>!!navigator.serviceWorker.controller);
  controlled ? pass('page is controlled by the service worker') : fail('no SW controller after reload');

  console.log('\n[2] Manifest + theme-color injected (installable)');
  const manifest=await p.getAttribute('link[rel="manifest"]','href').catch(()=>null);
  manifest ? pass('manifest linked: '+manifest) : fail('no manifest link');
  const theme=await p.getAttribute('meta[name="theme-color"]','content').catch(()=>null);
  theme ? pass('theme-color meta present: '+theme) : fail('no theme-color');

  console.log('\n[3] Prime the cache, then go offline');
  // visit another page so it (and its assets) get cached
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle'});
  await p.waitForTimeout(500);
  await ctx.setOffline(true);
  pass('network set to OFFLINE');

  console.log('\n[4] An UNvisited route shows the offline fallback page');
  const r2=await p.goto(`${base}/never-visited-xyz-page.html`,{waitUntil:'domcontentloaded',timeout:15000}).catch(e=>({err:e.message}));
  const txt=await p.evaluate(()=>document.body?document.body.innerText:'').catch(()=>'');
  /offline|Mochi can’t reach|try again/i.test(txt) ? pass('friendly offline page served for uncached route') : fail('no offline fallback: '+(r2&&r2.err||txt.slice(0,60)));

  console.log('\n[5] A previously-visited page still loads offline (from cache)');
  const resp=await p.goto(`${base}/others/others.html`,{waitUntil:'domcontentloaded',timeout:15000}).catch(e=>({err:e.message}));
  const bodyLen=await p.evaluate(()=>document.body?document.body.innerText.length:0).catch(()=>0);
  (resp && !resp.err && bodyLen>50) ? pass('cached page rendered offline ('+bodyLen+' chars of text)') : fail('cached page failed offline: '+(resp&&resp.err||'empty'));

  await ctx.setOffline(false);
  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); srv.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL PWA checks passed'); process.exit(0);
