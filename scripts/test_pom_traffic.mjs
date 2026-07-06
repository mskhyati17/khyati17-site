// Traffic test for Mochi, the AI Talking Teacup Pomeranian corner buddy.
// Simulates 10 CONCURRENT users (isolated Playwright browser contexts, so each
// has its own localStorage/session). Every virtual user opens the puppy and
// runs a short chat, and we assert that under concurrency each session:
//   - renders the puppy + opens the chat
//   - gets an in-character reply per message
//   - reaches a lip-sync "talking" state and an emotion
//   - fires the ruff system at least once
//   - keeps its OWN name + learned favorite (no cross-user bleed)
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

const USERS = 10;
const PROMPTS = ['hi there','tell me a joke','can i give you a belly rub','i love you','are you a good pup','goodbye'];

// One virtual user's full session. Returns per-user metrics.
async function runUser(browser, i){
  const name = 'User'+i;
  const treat = ['bacon','cheese','peanut butter','chicken','carrots','apples','steak','tuna','biscuits','yogurt'][i%10];
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const jsErrors=[]; page.on('pageerror',e=>jsErrors.push(e.message.split('\n')[0]));
  const t0=Date.now();
  const m={ user:name, ok:false, replies:0, ruffs:0, emotions:new Set(), sawTalking:false, memoryOk:false, jsErrors:0, ms:0 };
  try{
    await page.goto(PAGE,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#pom-mascot .pom-dog',{timeout:15000});

    // this user names the puppy uniquely + turns voice off (headless has no audio)
    await page.evaluate(n=>localStorage.setItem('pomConfig',JSON.stringify({name:n,acc:'bow',voice:false})),'Pom'+i);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#pom-mascot .pom-dog',{timeout:15000});

    await page.click('#pom-mascot .pom-stage',{force:true});
    await page.waitForSelector('#pom-mascot .pom-panel.open',{timeout:8000});

    // teach a unique favorite, then chat through the prompt list
    const msgs=['my name is '+name, 'my favorite treat is '+treat, ...PROMPTS];
    for(const msg of msgs){
      const before = await page.$$eval('#pom-mascot .pom-msg.bot', n=>n.length);
      await page.fill('#pom-mascot .pom-input input', msg);
      await page.click('#pom-mascot .pom-send');
      // wait for a new bot reply
      await page.waitForFunction(b=>document.querySelectorAll('#pom-mascot .pom-msg.bot').length>b, before, {timeout:6000});
      // sample the talking (lip-sync) state a few times right after the reply
      for(let k=0;k<8 && !m.sawTalking;k++){
        if(/(^| )talking( |$)/.test(await page.getAttribute('#pom-mascot','class'))) m.sawTalking=true;
        else await page.waitForTimeout(60);
      }
      const cls = await page.getAttribute('#pom-mascot','class');
      (cls.match(/emo-([a-z]+)/g)||[]).forEach(c=>m.emotions.add(c));
    }

    const bots = await page.$$eval('#pom-mascot .pom-msg.bot', n=>n.map(x=>x.textContent));
    m.replies = bots.length;
    m.ruffs = bots.filter(t=>/^(Ruff|Arf|Woof|Bark|Yip|Rrrf)/i.test(t)).length;

    // memory isolation: ask this user's favorite back; must be THIS user's treat
    await page.fill('#pom-mascot .pom-input input', "what's my favorite treat");
    await page.click('#pom-mascot .pom-send');
    await page.waitForTimeout(500);
    const memLast=(await page.$$eval('#pom-mascot .pom-msg.bot', n=>n.map(x=>x.textContent))).pop();
    m.memoryOk = new RegExp(treat,'i').test(memLast);

    m.jsErrors = jsErrors.length;
    m.ok = m.replies>0 && m.sawTalking && m.emotions.size>0 && m.jsErrors===0;
  }catch(e){ m.error=e.message.split('\n')[0]; }
  m.ms = Date.now()-t0;
  await ctx.close();
  return m;
}

const browser=await chromium.launch({headless:true});
try{
  console.log(`\n=== Mochi traffic test — ${USERS} concurrent users, each a full chat session ===\n`);
  const t0=Date.now();
  const results = await Promise.all(Array.from({length:USERS},(_,i)=>runUser(browser,i)));
  const wall=Date.now()-t0;

  // per-user summary
  results.forEach(r=>{
    const status=r.ok?'✅':'❌';
    console.log(`  ${status} ${r.user.padEnd(6)} replies:${String(r.replies).padStart(2)}  ruffs:${String(r.ruffs).padStart(2)}  emotions:${r.emotions.size}  lipsync:${r.sawTalking?'yes':'NO '}  mem:${r.memoryOk?'ok':'BAD'}  jsErr:${r.jsErrors}  ${r.ms}ms${r.error?'  ERR: '+r.error:''}`);
  });

  console.log('\n=== Aggregate assertions ===');
  const okUsers=results.filter(r=>r.ok).length;
  assert(okUsers===USERS, `all ${USERS} concurrent users completed a working session`);
  assert(results.every(r=>r.replies>=PROMPTS.length), `every user got a reply to all ${PROMPTS.length}+ messages`);
  assert(results.every(r=>r.sawTalking), 'every user saw lip-sync (talking state) engage');
  assert(results.every(r=>r.ruffs>=1), 'every user got at least one ruff/bark');
  assert(results.every(r=>r.emotions.size>=2), 'every user triggered ≥2 distinct emotions');
  assert(results.every(r=>r.memoryOk), 'every user’s learned favorite stayed isolated to their session');
  assert(results.every(r=>r.jsErrors===0), 'zero uncaught JS errors across all users');

  const lat=results.map(r=>r.ms).sort((a,b)=>a-b);
  const avg=Math.round(lat.reduce((a,b)=>a+b,0)/lat.length);
  const totalReplies=results.reduce((a,r)=>a+r.replies,0);
  console.log('\n=== Stats ===');
  console.log(`  concurrent users  : ${USERS}`);
  console.log(`  total bot replies : ${totalReplies}`);
  console.log(`  session time      : avg ${avg}ms | min ${lat[0]}ms | max ${lat[lat.length-1]}ms`);
  console.log(`  wall-clock (all)  : ${wall}ms`);
} finally { await browser.close(); server.close(); }

console.log('\n=========================================');
console.log(failures===0 ? '✅ ALL TRAFFIC CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`);
console.log('=========================================');
process.exit(failures===0?0:1);
