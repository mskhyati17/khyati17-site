// Verify the newest 15 AI tools (total 165) run correctly in a real browser.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8229,r));
const base='http://localhost:8229';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const CASES=[
  ['syllable-count','hello wonderful',false,/syllables/],
  ['char-frequency','aabbbc',false,/b: 3/],
  ['remove-vowels','Programming',false,/^Prgrmmng$/],
  ['keep-vowels','Programming',false,/^oai$/],
  ['calm-caps','WOW this is COOL',false,/Wow this is Cool/],
  ['dot-case','Hello World Test',false,/^hello\.world\.test$/],
  ['train-case','hello world test',false,/^Hello-World-Test$/],
  ['a1z26','hi',false,/^8-9$/],
  ['a1z26-decode','8-9',false,/^HI$/],
  ['regional-flags','ab',false,/🇦🇧/],
  ['tax-calc','60 18',false,/Tax: 10\.80[\s\S]*Total: 70\.80/],
  ['tip-split','80 4 15',false,/total \$92\.00[\s\S]*Each of 4 pays \$23\.00/],
  ['dog-years','5',false,/33 dog years/],
  ['day-of-year','2026-01-10',false,/day 10 of the year/],
  ['tally-marks','12',false,/卌 卌 \|\|/]
];
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  let ok=0;
  for(const [id,input,gen,rx] of CASES){
    await p.goto(`${base}/ai-tools/tool.html?t=${id}`,{waitUntil:'domcontentloaded',timeout:15000});
    await p.waitForSelector('#t-name',{timeout:8000});
    if(!gen){ await p.fill('#t-in', input); await p.click('#t-run'); }
    await p.waitForFunction(()=>document.getElementById('t-out').textContent.trim().length>0,{timeout:6000}).catch(()=>{});
    const out=(await p.textContent('#t-out')).trim();
    if(rx.test(out)) ok++; else fail(`${id}: got "${out.slice(0,45)}" expected ${rx}`);
  }
  (ok===CASES.length) ? pass(`all ${CASES.length} new tools correct`) : fail(`${ok}/${CASES.length} correct`);
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL new-tool (v5) checks passed'); process.exit(0);
