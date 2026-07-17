// Verify Gradient Generator: live CSS updates with color/angle changes,
// randomize picks new values, copy works, and it's listed in the AI Zone.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8323,r));
const base='http://localhost:8323';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true, args:['--use-fake-ui-for-media-stream']});
const ctx=await b.newContext(); await ctx.grantPermissions(['clipboard-read','clipboard-write']);
try{
  const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/ai-tools/gradient-generator.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__gradientGen,{timeout:8000});

  console.log('\n[1] Setting colours/angle updates the generated CSS');
  await p.evaluate(()=>window.__gradientGen.setColors('#ff0000','#00ff00'));
  await p.evaluate(()=>window.__gradientGen.setAngle(90));
  const css=await p.evaluate(()=>window.__gradientGen.css());
  (/90deg/.test(css) && /#ff0000/.test(css) && /#00ff00/.test(css)) ? pass('CSS reflects colours + angle: '+css) : fail('CSS wrong: '+css);

  console.log('\n[2] Preview background actually changes');
  const bg=await p.evaluate(()=>getComputedStyle(document.getElementById('preview')).backgroundImage);
  /gradient/i.test(bg) ? pass('preview element has a gradient background') : fail('no gradient on preview: '+bg);

  console.log('\n[3] Randomize changes the CSS');
  const before=await p.evaluate(()=>window.__gradientGen.css());
  await p.evaluate(()=>window.__gradientGen.randomize());
  const after=await p.evaluate(()=>window.__gradientGen.css());
  (after!==before) ? pass('randomize produced a different gradient') : fail('randomize did not change anything');

  console.log('\n[4] Copy button shows a confirmation');
  await p.click('#copyBtn');
  await p.waitForFunction(()=>document.getElementById('copyMsg').textContent.length>0,{timeout:3000}).catch(()=>{});
  /Copied/.test(await p.textContent('#copyMsg')) ? pass('copy confirmation shown') : fail('no copy confirmation');

  console.log('\n[5] In the AI Zone');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const labels=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  labels.some(l=>/Gradient Generator/.test(l)) ? pass('Gradient Generator card in AI Zone') : fail('not in AI Zone');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Gradient Generator checks passed'); process.exit(0);
