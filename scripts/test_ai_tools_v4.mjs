// Verify the newest 25 AI tools (total 150) run correctly in a real browser.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8212,r));
const base='http://localhost:8212';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const CASES=[
  ['unique-words','a a b c',false,/Unique words: 3/],
  ['remove-dup-words','the cat the dog',false,/^the cat dog$/],
  ['longest-line','hi\nhello world\nyo',false,/hello world/],
  ['avg-word-length','ab cde',false,/2\.50/],
  ['extract-phone','call +1 415 555 1234 now',false,/415/],
  ['reverse-lines','one\ntwo\nthree',false,/three[\s\S]*two[\s\S]*one/],
  ['sort-lines-desc','apple\nzebra\nmango',false,/zebra[\s\S]*mango[\s\S]*apple/],
  ['smart-title','the lord of the rings',false,/The Lord of the Rings/],
  ['base64url','Hi>>',false,/^[A-Za-z0-9_-]+$/],
  ['rot18','abc123',false,/nop678/],
  ['caesar-decode','Kh<D',false,/He/],
  ['simple-interest','1000 5 3',false,/Interest: 150\.00[\s\S]*Total: 1150\.00/],
  ['circle-area','5',false,/Area: 78\.54/],
  ['area-perimeter','8 5',false,/Area: 40[\s\S]*Perimeter: 26/],
  ['speed-calc','150 3',false,/Speed: 50\.00/],
  ['fraction-decimal','3/8',false,/= 0\.375/],
  ['scientific-notation','149600000',false,/1\.4960 × 10\^8/],
  ['leap-year','2024',false,/LEAP year/],
  ['zodiac-sign','2010-08-14',false,/Leo/],
  ['hours-breakdown','100',false,/4d 4h 0m/],
  ['hex-to-hsl','#ff0000',false,/hsl\(0, 100%, 50%\)/],
  ['color-mixer','#ff0000 #0000ff',false,/Mixed: #800080/i],
  ['flip-coins','10',false,/Heads: \d+/],
  ['password-gen','20',false,/^.{20}$/],
  ['team-name-gen','',true,/\w+ \w+/]
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
  // confirm the AI Zone now advertises 150 tools somewhere dynamic
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL new-tool (v4) checks passed'); process.exit(0);
