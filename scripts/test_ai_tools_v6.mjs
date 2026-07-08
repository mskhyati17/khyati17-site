import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8233,r));
const base='http://localhost:8233';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const CASES=[
  ['remove-emojis','hi 🎮 there 🐶',false,/^hi there$/],
  ['count-emojis','a 🎮 b 🐶 c 🎮',false,/3 emojis/],
  ['palindrome-check','racecar',false,/is a palindrome/],
  ['pangram-check','The quick brown fox jumps over a lazy dog',false,/a pangram/],
  ['anagram-check','listen | silent',false,/are anagrams/],
  ['underscore-spaces','hello world',false,/^hello_world$/],
  ['wrap-quotes','line one',false,/^"line one"$/],
  ['hashtagify','throwback thursday',false,/^#ThrowbackThursday$/],
  ['even-odd','42',false,/42 is EVEN/],
  ['power','2 10',false,/2\^10 = 1024/],
  ['ordinal-number','23',false,/^23rd$/],
  ['factors','12',false,/1, 2, 3, 4, 6, 12/],
  ['rock-paper-scissors','',true,/Rock|Paper|Scissors/],
  ['would-you-rather','',true,/Would you rather/],
  ['random-username','',true,/^@\w+\d+$/]
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
console.log('✅ ALL new-tool (v6) checks passed'); process.exit(0);
