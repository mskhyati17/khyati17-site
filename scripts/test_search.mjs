// Verify the global site search:
//   - a "🔍 Search" trigger appears in the nav; "/" and Ctrl-K open it
//   - it lazy-loads and indexes games + stories + tools + videos
//   - typing returns ranked, correctly-typed results from every dataset
//   - keyboard nav + Enter navigates; Esc closes
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8160,r));
const base='http://localhost:8160';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});

  console.log('\n[1] Search trigger appears in the nav');
  await p.waitForSelector('.main-nav .ks-trigger',{timeout:8000});
  pass('🔍 Search button injected into the nav');

  console.log('\n[2] "/" opens the overlay and it indexes the whole site');
  await p.keyboard.press('/');
  await p.waitForSelector('#ks-overlay.open',{timeout:5000});
  await p.waitForFunction(()=>/things to search/.test(document.getElementById('ks-count').textContent),{timeout:10000});
  const countTxt=await p.textContent('#ks-count');
  const n=parseInt(countTxt.replace(/[^0-9]/g,''),10);
  (n>2000) ? pass(`indexed ${n.toLocaleString()} items (games+stories+tools+videos)`) : fail('index too small: '+countTxt);

  console.log('\n[3] Typing returns results from multiple datasets');
  await p.fill('#ks-input','snake');
  await p.waitForSelector('#ks-results .ks-row',{timeout:4000});
  const rows=await p.$$eval('#ks-results .ks-row', els=>els.map(e=>({t:e.querySelector('.ks-title').textContent, type:e.querySelector('.ks-badge').textContent})));
  rows.length ? pass(`"snake" → ${rows.length} results (e.g. ${rows[0].type}: ${rows[0].t.slice(0,24)})`) : fail('no results for "snake"');

  // a tool query
  await p.fill('#ks-input','pig latin');
  await p.waitForTimeout(150);
  const toolHit=await p.$$eval('#ks-results .ks-row', els=>els.some(e=>/Tool/.test(e.querySelector('.ks-badge').textContent)&&/Pig Latin/i.test(e.textContent)));
  toolHit ? pass('finds the "Pig Latin" AI tool') : fail('did not find Pig Latin tool');

  // a story query
  await p.fill('#ks-input','lantern');
  await p.waitForTimeout(150);
  const storyHit=await p.$$eval('#ks-results .ks-row', els=>els.some(e=>/Story/.test(e.querySelector('.ks-badge').textContent)));
  storyHit ? pass('finds a Story result') : fail('no Story result for "lantern"');

  console.log('\n[4] Ctrl-K opens and Esc closes');
  await p.keyboard.press('Escape');                 // close from the previous step first
  await p.keyboard.press('Control+k');
  await p.waitForSelector('#ks-overlay.open',{timeout:5000});
  pass('Ctrl-K opened search');
  await p.keyboard.press('Escape');
  await p.waitForFunction(()=>!document.getElementById('ks-overlay').classList.contains('open'),null,{timeout:3000});
  pass('Esc closed search');

  console.log('\n[5] Enter navigates to a result (done last — may leave the page)');
  await p.click('.main-nav .ks-trigger'); await p.waitForSelector('#ks-overlay.open',{timeout:5000});
  await p.fill('#ks-input','snake');
  await p.waitForSelector('#ks-results .ks-row',{timeout:3000});
  const targetHref=await p.$eval('#ks-results .ks-row', e=>e.getAttribute('href'));
  const before=p.url();
  await Promise.all([ p.waitForNavigation({timeout:8000}).catch(()=>{}), p.keyboard.press('Enter') ]);
  await p.waitForTimeout(400);
  (p.url()!==before) ? pass('Enter navigated ('+p.url().replace(base,'').slice(0,48)+') target="'+targetHref.slice(0,40)+'"') : fail('did not navigate from '+before);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL search checks passed'); process.exit(0);
