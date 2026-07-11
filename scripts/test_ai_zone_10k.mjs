import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.jpg':'image/jpeg'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'text/html'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8298,r));
const base='http://localhost:8298';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const ctx=await b.newContext({viewport:{width:390,height:800}}); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  const client=await ctx.newCDPSession(p); await client.send('Emulation.setCPUThrottlingRate',{rate:4});
  const t0=Date.now();
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForSelector('#grid .card',{timeout:15000});
  const ready=Date.now()-t0;
  const initial=await p.$$eval('#grid .card', e=>e.length);
  (initial<=61) ? pass('initial grid paginated ('+initial+' cards)') : fail('too many cards: '+initial);
  (ready<3000) ? pass('DOMready fast on 4x-CPU mobile: '+ready+'ms') : fail('slow: '+ready+'ms');
  const gc=await p.textContent('#gridCount');
  (parseInt(gc.replace(/,/g,''))>=10000) ? pass('gridCount shows '+gc) : fail('gridCount: '+gc);

  console.log('\n[Load more]');
  (await p.$('#loadMoreWrap .load-more-btn')) ? pass('load-more present') : fail('no load-more');
  await p.click('#loadMoreWrap .load-more-btn'); await p.waitForTimeout(150);
  (await p.$$eval('#grid .card', e=>e.length))>initial ? pass('more cards after load-more') : fail('load-more did nothing');

  console.log('\n[Curated tools still first]');
  const firstLabels=await p.$$eval('#grid .card .label', e=>e.slice(0,15).map(x=>x.textContent));
  firstLabels.some(l=>/Story Creator|Doodle|Piano|Wheel|Stopwatch|Unit Converter|Palette/.test(l)) ? pass('curated featured tools on page 1') : fail('curated not first: '+firstLabels.slice(0,5).join(', '));

  console.log('\n[Generated tools actually work]');
  for(const [id,inp] of [['times-table-7',''],['multiply-by-9','8'],['caesar-shift-3','hello'],['to-base-16','255'],['percent-25-of','200']]){
    await p.goto(`${base}/ai-tools/tool.html?t=${id}`,{waitUntil:'domcontentloaded'}); await p.waitForSelector('#t-name',{timeout:8000});
    if(inp && await p.isVisible('#t-in')){ await p.fill('#t-in', inp); }
    await p.click('#t-run').catch(()=>{});
    await p.waitForFunction(()=>document.getElementById('t-out').textContent.trim().length>0,{timeout:5000}).catch(()=>{});
    const out=(await p.textContent('#t-out')).trim();
    out.length>0 ? pass(id+' → "'+out.slice(0,24).replace(/\n/g,' ')+'"') : fail(id+' produced no output');
  }

  console.log('');
  js.length ? js.slice(0,3).forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL AI-Zone-10k checks passed'); process.exit(0);
