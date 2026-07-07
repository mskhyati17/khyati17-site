// Verify per-content share: the tool page and story reader each expose a share
// button that copies the correct canonical URL (native share unavailable in test).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8187,r));
const base='http://localhost:8187';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const mockClipboard = p => p.evaluate(()=>{ delete navigator.share; navigator.clipboard.writeText = t => { window.__copied=t; return Promise.resolve(); }; });
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Tool page shares the tool URL');
  await p.goto(`${base}/ai-tools/tool.html?t=pig-latin`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForSelector('#t-share',{timeout:8000});
  await mockClipboard(p);
  await p.click('#t-share'); await p.waitForTimeout(150);
  const tu=await p.evaluate(()=>window.__copied);
  (/tool\.html\?t=pig-latin/.test(tu||'')) ? pass('copied tool URL: '+tu) : fail('bad tool share: '+tu);
  /copied/i.test(await p.textContent('#t-share')) ? pass('button shows copied feedback') : fail('no feedback');

  console.log('\n[2] Story reader shares the story URL');
  await p.goto(`${base}/stories/stories.html?story=lighthouse-of-lost-things`,{waitUntil:'networkidle',timeout:15000});
  await p.waitForSelector('#story-share',{timeout:8000});
  await mockClipboard(p);
  await p.click('#story-share'); await p.waitForTimeout(150);
  const su=await p.evaluate(()=>window.__copied);
  (/story=lighthouse-of-lost-things/.test(su||'')) ? pass('copied story URL: '+su) : fail('bad story share: '+su);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL content-share checks passed'); process.exit(0);
