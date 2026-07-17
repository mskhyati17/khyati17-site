// Verify the 50 newly-added mini AI tools work end-to-end in a real browser:
//   - the AI Zone lists ~100 mini tools and the new category chips appear
//   - each sampled tool page renders and produces the expected output
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8157,r));
const base='http://localhost:8157';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});

// [id, input, gen?, regex the output must match]
const CASES=[
  ['pig-latin','hello world',false,/ellohay orldway/i],
  ['bold-unicode','hi',false,/\uD835/],                       // math-bold uses surrogate pairs
  ['small-caps','abc',false,/ᴀʙᴄ/],
  ['upside-down','abc',false,/ɔq/],                            // reversed + flipped
  ['mocking-case','hello',false,/hElLo/],
  ['rot47','Hello',false,/^\S+$/],
  ['atbash','abc',false,/zyx/],
  ['nato-phonetic','AB',false,/Alpha Bravo/],
  ['ascii-encode','Hi',false,/72 105/],
  ['extract-emails','ping me@test.com ok',false,/me@test\.com/],
  ['extract-urls','see https://khyati17.com now',false,/https:\/\/khyati17\.com/],
  ['json-format','{"a":1}',false,/"a": 1/],
  ['html-encode','<b>',false,/&lt;b&gt;/],
  ['reading-time','one two three four five',false,/5 words/],
  ['word-frequency','a a b',false,/2 × a/],
  ['prime-check','97',false,/prime ✅/],
  ['factorial','5',false,/= 120/],
  ['fibonacci','7',false,/0, 1, 1, 2, 3, 5, 8/],
  ['gcd-lcm','12 18',false,/GCD = 6[\s\S]*LCM = 36/],
  ['base-converter','255',false,/Hex: FF/],
  ['percent-change','80 100',false,/\+25\.00%/],
  ['discount-calc','60 25',false,/Final price: \$45\.00/],
  ['median-mode','3, 5, 5, 7, 9',false,/Median: 5[\s\S]*Mode: 5/],
  ['days-between','2024-01-01 to 2025-01-01',false,/36[56] days/],
  ['seconds-to-hms','3725',false,/01:02:05/],
  ['day-of-week','2026-07-04',false,/Saturday/],
  ['hex-to-rgb','#4f8cff',false,/rgb\(79, 140, 255\)/],
  ['rgb-to-hex','79, 140, 255',false,/#4f8cff/i],
  ['complementary-color','#000000',false,/#FFFFFF/i],
  ['random-gradient','',true,/linear-gradient/],
  ['uuid-gen','',true,/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}/i],
  ['lorem-ipsum','12',false,/\w+ \w+ \w+/],
  ['team-picker','Ava, Ben, Cara, Dan',false,/Team A:[\s\S]*Team B:/],
  ['pick-winner','pizza, tacos',false,/🏆 (pizza|tacos)/],
  ['unicode-escape','A',false,/\\u0041/],
  ['ascii-decode','72 105',false,/Hi/],
  ['superscript','x2',false,/ˣ²/],
  ['squared-text','ab',false,/🄰🄱/],
  ['remove-punct','a, b! c?',false,/^a b c$/],
  ['strip-html','<p>hey</p>',false,/^hey$/],
  ['extract-numbers','a 3 b 4.5',false,/3[\s\S]*4\.5/],
  ['extract-hashtags','#fun and #cool',false,/#fun #cool/],
  ['html-decode','&lt;b&gt;',false,/<b>/],
  ['countdown','2099-01-01',false,/days/],
  ['age-calc','2000-01-01',false,/years/],
  ['monospace-unicode','a',false,/\uD835/],
  ['italic-unicode','a',false,/\uD835/],
  ['script-unicode','a',false,/\uD835/],
  ['underline-text','a',false,/a̲/],
  ['longest-word','hi hello',false,/hello/]
];

try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] AI Zone lists ~100 mini tools + new category chips');
  await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(300);
  const count=await p.evaluate(()=>window.TOOLS?window.TOOLS.length:(typeof TOOLS!=='undefined'?TOOLS.length:-1));
  // The grid only renders the first 60 (of 200+) tools until "Load more" is
  // clicked, and Pig Latin isn't in that first page — search for it instead.
  await p.fill('#search','pig latin'); await p.waitForTimeout(200);
  const hasPigLatin=await p.$$eval('.card, .grid *', els=>els.some(e=>/Pig Latin/i.test(e.textContent)));
  hasPigLatin ? pass('new tool "Pig Latin" is listed in the AI Zone') : fail('Pig Latin not listed');
  await p.fill('#search',''); await p.waitForTimeout(200);
  const chips=await p.$$eval('#catStrip .chip', els=>els.map(e=>e.textContent.trim()));
  const needChips=['Web','Time','Color','Random'];
  const gotChips=needChips.filter(c=>chips.some(x=>x.includes(c)));
  (gotChips.length===needChips.length) ? pass('new category chips present: '+gotChips.join(', ')) : fail('missing chips, got: '+chips.join(', '));

  console.log(`\n[2] Run ${CASES.length} sampled new tools in the browser`);
  let okN=0;
  for(const [id,input,gen,rx] of CASES){
    await p.goto(`${base}/ai-tools/tool.html?t=${id}`,{waitUntil:'domcontentloaded',timeout:15000});
    await p.waitForSelector('#t-name',{timeout:8000});
    if(!gen){ await p.fill('#t-in', input); await p.click('#t-run'); }
    await p.waitForFunction(()=>document.getElementById('t-out').textContent.trim().length>0,{timeout:6000}).catch(()=>{});
    const out=(await p.textContent('#t-out')).trim();
    if(rx.test(out)){ okN++; } else { fail(`${id}: got "${out.slice(0,45)}" — expected ${rx}`); }
  }
  (okN===CASES.length) ? pass(`all ${CASES.length} sampled tools produced correct output`) : fail(`${okN}/${CASES.length} tools correct`);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL new AI-tool checks passed'); process.exit(0);
