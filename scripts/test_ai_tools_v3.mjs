// Verify the newest 25 AI tools (total 125) run correctly in a real browser.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8178,r));
const base='http://localhost:8178';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const CASES=[
  ['invert-case','Hello World',false,/hELLO wORLD/],
  ['acronym','National Aeronautics Space Administration',false,/^NASA$/],
  ['initials','Khyati Srivastava',false,/K\. S\./],
  ['repeat-text','ha | 4',false,/ha ha ha ha/],
  ['remove-numbers','a1b2c3',false,/^abc$/],
  ['spaced-text','hey',false,/h e y/],
  ['reverse-each-word','abc def',false,/cba fed/],
  ['zalgo','hi',false,/h.+i/],
  ['base32-encode','Hi',false,/^[A-Z2-7]+=*$/],
  ['rot5','2026',false,/7571/],
  ['hex-decode','48 69 21',false,/Hi!/],
  ['html-num-entities','AB',false,/&#65;&#66;/],
  ['quadratic','1 -3 2',false,/x₁ = 2[\s\S]*x₂ = 1|x₁ = 1[\s\S]*x₂ = 2/],
  ['bmi','70 175',false,/BMI: 22\.9[\s\S]*healthy/],
  ['compound-interest','1000 5 10',false,/1628\.89/],
  ['permutations','5 2',false,/5P2 = 20[\s\S]*5C2 = 10/],
  ['aspect-ratio','1920 1080',false,/16:9/],
  ['std-dev','2 4 6',false,/Mean: 4/],
  ['unix-time','1751000000',false,/2025/],
  ['add-days','2026-01-01 + 31',false,/February 1, 2026/],
  ['lighten-color','#404040 +20',false,/#[0-9A-F]{6}/],
  ['contrast-checker','#ffffff #000000',false,/21\.00:1[\s\S]*AAA/],
  ['dice-notation','2d6+1',true,/= \d+/],
  ['random-quote','',true,/[""].+[""]|—/],
  ['random-card','',true,/[A2-9JQK10][♠♥♦♣]/]
];
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  console.log(`\nRun ${CASES.length} new tools in the browser`);
  let ok=0;
  for(const [id,input,gen,rx] of CASES){
    await p.goto(`${base}/ai-tools/tool.html?t=${id}`,{waitUntil:'domcontentloaded',timeout:15000});
    await p.waitForSelector('#t-name',{timeout:8000});
    if(!gen){ await p.fill('#t-in', input); await p.click('#t-run'); }
    await p.waitForFunction(()=>document.getElementById('t-out').textContent.trim().length>0,{timeout:6000}).catch(()=>{});
    const out=(await p.textContent('#t-out')).trim();
    if(rx.test(out)) ok++; else fail(`${id}: got "${out.slice(0,45)}" expected ${rx}`);
  }
  (ok===CASES.length) ? pass(`all ${CASES.length} new tools produced correct output`) : fail(`${ok}/${CASES.length} correct`);
  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL new-tool (v3) checks passed'); process.exit(0);
