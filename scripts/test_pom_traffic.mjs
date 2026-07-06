// Traffic test for Mochi, the AI talking Pomeranian corner buddy.
// Simulates 1000 users, each an isolated Playwright browser context (its own
// localStorage/session), driven through a real (light) chat session. 1000 live
// Chromium pages at once would melt the machine, so users run through a bounded
// concurrency pool (POOL at a time) — still real browser traffic, just capped.
// Under load we verify each session renders + opens, replies in character,
// reaches lip-sync + an emotion, with the ruff system firing at the right rate
// and zero uncaught JS errors across the whole fleet.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const projectDir = join(fileURLToPath(import.meta.url), '..', '..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{res.writeHead(404);res.end('Not Found');return;}}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8155,r));
const base='http://localhost:8155';
const PAGE = `${base}/others/others.html`;

let failures=0;
const assert=(cond,msg)=>{ if(cond){console.log('  ✅ '+msg);} else {console.log('  ❌ '+msg); failures++;} };

const USERS = Number(process.env.USERS || 1000);
const POOL  = Number(process.env.POOL  || 24);   // concurrent live browser sessions
const CHAT  = ['hi there','tell me a joke','i love you'];

async function pool(n, size, fn){
  const results=new Array(n); let idx=0;
  async function worker(){ while(idx<n){ const i=idx++; results[i]=await fn(i); } }
  await Promise.all(Array.from({length:Math.min(size,n)}, worker));
  return results;
}

async function runUser(browser, i){
  const ctx=await browser.newContext();
  // seed a unique name + voice off (headless has no audio) BEFORE the page loads
  await ctx.addInitScript(n=>{ try{ localStorage.setItem('pomConfig', JSON.stringify({name:n, acc:'bow', voice:false})); }catch(e){} }, 'Pom'+i);
  const page=await ctx.newPage();
  const jsErr=[]; page.on('pageerror',e=>jsErr.push(e.message.split('\n')[0]));
  const t0=Date.now();
  const m={ ok:false, replies:0, ruffs:0, emotions:new Set(), talk:false, jsErrors:0, ms:0 };
  try{
    await page.goto(PAGE,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForSelector('#pom-mascot .pom-dog',{timeout:20000});
    await page.click('#pom-mascot .pom-stage',{force:true});
    await page.waitForSelector('#pom-mascot .pom-panel.open',{timeout:10000});
    for(const msg of CHAT){
      const before=await page.$$eval('#pom-mascot .pom-msg.bot', n=>n.length);
      await page.fill('#pom-mascot .pom-input input', msg);
      await page.click('#pom-mascot .pom-send');
      await page.waitForFunction(b=>document.querySelectorAll('#pom-mascot .pom-msg.bot').length>b, before, {timeout:8000});
      for(let k=0;k<5 && !m.talk;k++){ if(/(^| )talking( |$)/.test(await page.getAttribute('#pom-mascot','class'))) m.talk=true; else await page.waitForTimeout(60); }
      ((await page.getAttribute('#pom-mascot','class')).match(/emo-([a-z]+)/g)||[]).forEach(c=>m.emotions.add(c));
    }
    const bots=await page.$$eval('#pom-mascot .pom-msg.bot', n=>n.map(x=>x.textContent));
    const replies=bots.slice(-CHAT.length);        // ignore status + greeting lines
    m.replies=replies.length;
    m.ruffs=replies.filter(t=>/^(Ruff|Arf|Woof|Bark|Yip|Rrrf)/i.test(t)).length;
    m.jsErrors=jsErr.length;
    m.ok = m.replies>=CHAT.length && m.talk && m.emotions.size>=1 && m.jsErrors===0;
  }catch(e){ m.error=e.message.split('\n')[0]; }
  m.ms=Date.now()-t0; await ctx.close(); return m;
}

const browser=await chromium.launch({headless:true});
try{
  console.log(`\n=== Mochi traffic test — ${USERS} users (isolated sessions, ${POOL} concurrent) ===\n`);
  let done=0; const t0=Date.now();
  const results=await pool(USERS, POOL, async i=>{
    const r=await runUser(browser,i); done++;
    if(done%100===0 || done===USERS) console.log(`  … ${done}/${USERS} sessions complete`);
    return r;
  });
  const wall=Date.now()-t0;

  const okUsers=results.filter(r=>r.ok).length;
  const totalReplies=results.reduce((a,r)=>a+r.replies,0);
  const totalRuffs=results.reduce((a,r)=>a+r.ruffs,0);
  const usersWithRuff=results.filter(r=>r.ruffs>=1).length;
  const totalJsErr=results.reduce((a,r)=>a+r.jsErrors,0);
  const ruffRate=totalRuffs/Math.max(1,totalReplies);
  const talkAll=results.filter(r=>r.talk).length;

  console.log('\n=== Aggregate assertions ===');
  assert(okUsers/USERS >= 0.99, `≥99% of users completed a working session (${okUsers}/${USERS})`);
  assert(talkAll/USERS >= 0.98, `≥98% of users saw lip-sync (talking) engage (${talkAll}/${USERS})`);
  assert(results.every(r=>!r.ok || r.emotions.size>=1), 'every working session triggered an emotion');
  assert(usersWithRuff/USERS >= 0.9, `≥90% of users got a ruff/bark (${usersWithRuff}/${USERS})`);
  assert(ruffRate>=0.6 && ruffRate<=0.85, `ruff rate ${(ruffRate*100).toFixed(1)}% within expected 60–85% (design: 72%)`);
  assert(totalJsErr===0, `zero uncaught JS errors across all users (${totalJsErr})`);

  const lat=results.map(r=>r.ms).sort((a,b)=>a-b);
  const pct=q=>lat[Math.min(lat.length-1,Math.floor(q*lat.length))];
  const avg=Math.round(lat.reduce((a,b)=>a+b,0)/lat.length);
  console.log('\n=== Stats ===');
  console.log(`  users / concurrency : ${USERS} users, ${POOL} at a time`);
  console.log(`  total bot replies   : ${totalReplies}  (ruffs: ${totalRuffs}, ${(ruffRate*100).toFixed(1)}%)`);
  console.log(`  session time        : avg ${avg}ms | p50 ${pct(.5)}ms | p95 ${pct(.95)}ms | max ${lat[lat.length-1]}ms`);
  console.log(`  wall-clock (all)    : ${(wall/1000).toFixed(1)}s   throughput ~${(USERS/(wall/1000)).toFixed(1)} sessions/sec`);
  const failed=results.filter(r=>!r.ok).slice(0,5);
  failed.forEach((r,i)=>console.log(`  failed sample ${i}: ${JSON.stringify({replies:r.replies,talk:r.talk,emo:r.emotions.size,jsErr:r.jsErrors,err:r.error})}`));
} finally { await browser.close(); server.close(); }

console.log('\n=========================================');
console.log(failures===0 ? '✅ ALL TRAFFIC CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`);
console.log('=========================================');
process.exit(failures===0?0:1);
