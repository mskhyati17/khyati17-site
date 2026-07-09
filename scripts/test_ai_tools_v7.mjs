import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8255,r));
const base='http://localhost:8255';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const CASES=[
  ['count-sentences','Hi there. How are you? Good!',false,/3 sentences/],
  ['reverse-word-order','one two three',false,/^three two one$/],
  ['sort-words','banana apple cherry',false,/^apple banana cherry$/],
  ['shuffle-words','a b c d e',false,/^[abcde]( [abcde]){4}$/],
  ['swap-case','Hello World',false,/^hELLO wORLD$/],
  ['count-paragraphs','p1\n\np2\n\np3',false,/3 paragraphs/],
  ['remove-line-breaks','a\nb\nc',false,/^a b c$/],
  ['add-bullets','x\ny',false,/• x[\s\S]*• y/],
  ['indent-lines','hi',false,/^ {4}hi$/],
  ['median','3 1 4 1 5',false,/Median: 3/],
  ['average','10 20 30',false,/Average: 20/],
  ['sum','5 10 15',false,/Sum: 30/],
  ['product','2 3 4',false,/Product: 24/],
  ['number-range','7 2 9 4',false,/Min: 2[\s\S]*Max: 9[\s\S]*Range: 7/],
  ['fortune-cookie','',true,/🥠/],
  ['dad-joke','',true,/\?|!|\./],
  ['compliment','',true,/\w+/],
  ['random-fact','',true,/🤓/],
  ['truth-or-dare','',true,/Truth:|Dare:/],
  ['spirit-animal','',true,/spirit animal/]
];
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  let ok=0;
  for(const [id,input,gen,rx] of CASES){
    await p.goto(`${base}/ai-tools/tool.html?t=${id}`,{waitUntil:'domcontentloaded',timeout:15000});
    await p.waitForSelector('#t-name',{timeout:8000});
    if(!gen){ await p.fill('#t-in', input); await p.click('#t-run'); }
    await p.waitForFunction(()=>document.getElementById('t-out').textContent.trim().length>0,{timeout:6000}).catch(()=>{});
    const out=(await p.textContent('#t-out')).replace(/\s+$/,'');  // trim end only (indent-lines needs leading spaces)
    if(rx.test(out)) ok++; else fail(`${id}: got "${out.slice(0,45)}" expected ${rx}`);
  }
  (ok===CASES.length) ? pass(`all ${CASES.length} new tools correct`) : fail(`${ok}/${CASES.length} correct`);
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL new-tool (v7) checks passed'); process.exit(0);
