// Story Hub test: functional (render/search/genre/reader) + 100-user load.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'};
let served=0;
const server=createServer((req,res)=>{served++;let f=decodeURIComponent(join(projectDir,req.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{res.writeHead(404);res.end('nf');return;}}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'text/plain'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8143,r));
const base='http://localhost:8143';
const HUB=`${base}/stories/index.html`;
let failures=0; const assert=(c,m)=>{ if(c)console.log('  ✅ '+m); else {console.log('  ❌ '+m);failures++;} };

const browser=await chromium.launch({headless:true});
try{
  console.log('\n=== PART 1 — Story Hub functional checks ===');
  const page=await browser.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto(HUB,{waitUntil:'load',timeout:20000});
  await page.waitForSelector('#grid .card',{timeout:12000});
  const cards=await page.$$eval('#grid .card',e=>e.length);
  assert(cards>=100, `home grid renders ${cards} story cards (expected >= 100)`);
  assert(errs.length===0, `no JS errors on load${errs.length?': '+errs[0]:''}`);
  const genres=await page.$$eval('#catStrip .chip',e=>e.length);
  assert(genres>1, `genre chips present (${genres})`);

  // search
  await page.fill('#search','dragon');
  await page.waitForTimeout(400);
  const hit=await page.$$eval('#grid .card',els=>els.map(e=>e.textContent.toLowerCase()).some(t=>t.includes('dragon')));
  assert(hit, 'search "dragon" surfaces a matching story');
  await page.fill('#search','');
  await page.waitForTimeout(200);

  // genre filter
  const chips=await page.$$('#catStrip .chip');
  let clicked=false;
  for(const c of chips){ if((await c.textContent()).trim()==='Sci-Fi'){ await c.click(); clicked=true; break; } }
  await page.waitForTimeout(400);
  if(clicked){ const n=await page.$$eval('#grid .card',e=>e.length); assert(n>0,`Sci-Fi genre shows ${n} stories`); }
  await page.close();

  console.log('\n=== PART 2 — reader opens individual stories ===');
  const slugs=['the-dragon-who-was-afraid-of-fire','the-last-light-on-pluto','the-lighthouse-key','the-great-sock-rebellion','the-button-collector'];
  for(const slug of slugs){
    const p=await browser.newPage();
    const e2=[]; p.on('pageerror',e=>e2.push(e.message.split('\n')[0]));
    await p.goto(`${base}/stories/stories.html?story=${slug}`,{waitUntil:'load',timeout:20000});
    await p.waitForTimeout(900);
    const txt=await p.$eval('#story-content',el=>el.innerText.trim()).catch(()=>'');
    assert(txt.length>150 && e2.length===0, `reader renders "${slug}" (${txt.length} chars${e2.length?', ERR '+e2[0]:''})`);
    await p.close();
  }

  console.log('\n=== PART 3 — 100 concurrent-user HTTP load test ===');
  const VU=100,ROUNDS=5; const lat=[]; let ok=0,fail=0; const fails={};
  async function f(u){const s=Date.now();try{const r=await fetch(base+u,{signal:AbortSignal.timeout(15000)});await r.arrayBuffer();return{ok:r.status===200,ms:Date.now()-s,status:r.status};}catch(e){return{ok:false,ms:Date.now()-s,status:'ERR'};}}
  const t0=Date.now();
  for(let r=0;r<ROUNDS;r++){ await Promise.all(Array.from({length:VU},async()=>{const x=await f('/stories/index.html');lat.push(x.ms);if(x.ok)ok++;else{fail++;fails[x.status]=(fails[x.status]||0)+1;}})); }
  for(const a of ['/stories/stories-data.js?v=20260626a','/assets/js/auth.js']){const x=await f(a);assert(x.ok,`asset ${a} → ${x.status}`);}
  const wall=Date.now()-t0; lat.sort((a,b)=>a-b);
  const pct=q=>lat[Math.min(lat.length-1,Math.floor(q*lat.length))];
  const visits=VU*ROUNDS, avg=Math.round(lat.reduce((a,b)=>a+b,0)/lat.length);
  console.log(`  virtual users    : ${VU} concurrent × ${ROUNDS} rounds = ${visits} page visits`);
  console.log(`  successful        : ${ok}/${visits}${fail?'  failures: '+JSON.stringify(fails):''}`);
  console.log(`  wall-clock        : ${wall} ms`);
  console.log(`  response latency  : avg ${avg}ms | p50 ${pct(.5)}ms | p95 ${pct(.95)}ms | p99 ${pct(.99)}ms | max ${lat[lat.length-1]}ms`);
  console.log(`  throughput        : ~${(visits/(wall/1000)).toFixed(0)} requests/sec`);
  assert(ok===visits, `all ${visits} concurrent page requests served (0 errors)`);
} finally { await browser.close(); server.close(); }
console.log('\n'+(failures===0?'✅ ALL STORY CHECKS PASSED':`❌ ${failures} CHECK(S) FAILED`));
process.exit(failures?1:0);
