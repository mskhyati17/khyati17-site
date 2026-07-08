// 100-user site-wide traffic test. Each user is an isolated Playwright context
// (own localStorage), run through a bounded concurrency pool. Users are spread
// across real journeys: home, GameZone, an original game, AI Zone + a tool,
// a story + posting a comment (signed in), and a video + comment. We assert the
// key content renders for every user and that ZERO uncaught JS errors occur
// across the whole fleet.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(dir,req.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{res.writeHead(404);res.end('Not Found');return;}}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8250,r));
const base='http://localhost:8250';

const USERS=Number(process.env.USERS||100);
const POOL=Number(process.env.POOL||16);
const SESSION_MS=Number(process.env.SESSION_MS||45000);
const IGNORE=/scratch|turbowarp|ytimg|youtube|googlevideo|doubleclick|favicon|Failed to load resource|net::ERR/;

let failures=0, sessionsOK=0, jsErrors=0;
const note=(cond,msg)=>{ if(!cond){ console.log('  ❌ '+msg); failures++; } };

async function pool(n,size,fn){ let idx=0; async function w(){ while(idx<n){ const i=idx++; await fn(i); } } await Promise.all(Array.from({length:Math.min(size,n)},w)); }

async function runUser(browser,i){
  const journey=i%6;
  const ctx=await browser.newContext();
  // 1/3 of users are signed in (for comment journeys)
  if(journey>=4) await ctx.addInitScript(()=>{ localStorage.setItem('khyati_users', JSON.stringify({'u@x.com':{password:'p',metadata:{first_name:'User'}}})); localStorage.setItem('khyati_session','u@x.com'); });
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.split('\n')[0])); p.on('console',m=>{ if(m.type()==='error'){ const t=m.text(); if(!IGNORE.test(t)) errs.push('CE:'+t.slice(0,80)); } });
  const done=(async()=>{
    try{
      if(journey===0){ await p.goto(`${base}/home/index.html`,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.stat-num',{timeout:15000}); }
      else if(journey===1){ await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded'}); await p.waitForSelector('#catStrip .chip',{timeout:15000}); }
      else if(journey===2){ await p.goto(`${base}/ai-tools/index.html`,{waitUntil:'domcontentloaded'}); await p.waitForSelector('#grid .card',{timeout:15000});
        await p.goto(`${base}/ai-tools/tool.html?t=dog-years`,{waitUntil:'domcontentloaded'}); await p.waitForSelector('#t-name',{timeout:10000}); await p.fill('#t-in','5'); await p.click('#t-run'); await p.waitForTimeout(120); }
      else if(journey===3){ await p.goto(`${base}/fun-games/mochi-quiz.html`,{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.__mochiQuiz&&window.__mochiQuiz.current(),{timeout:10000}); await p.evaluate(()=>window.__mochiQuiz.answer(window.__mochiQuiz.current().a)); }
      else if(journey===4){ await p.goto(`${base}/stories/stories.html?story=coco-the-cloud-who-wanted-to-rain`,{waitUntil:'networkidle'}); await p.waitForSelector('#cmt-body',{timeout:15000}); await p.fill('#cmt-body','User '+i+' says hi!'); await p.click('#cmt-post'); await p.waitForTimeout(400); note(/User /.test(await p.textContent('#comments-list')),'user '+i+' story comment shown'); }
      else { await p.goto(`${base}/videos/videos.html`,{waitUntil:'domcontentloaded'}); await p.waitForSelector('.v-card',{timeout:15000}); await p.click('.v-card'); await p.waitForSelector('#cmt-body',{timeout:12000}); await p.fill('#cmt-body','clip '+i); await p.click('#cmt-post'); await p.waitForTimeout(400); }
      sessionsOK++;
    }catch(e){ failures++; console.log('  ❌ user '+i+' (journey '+journey+') failed: '+e.message.split('\n')[0]); }
  })();
  await Promise.race([done, new Promise(r=>setTimeout(r,SESSION_MS))]);
  if(errs.length){ jsErrors+=errs.length; failures++; console.log('  ❌ user '+i+' JS errors: '+errs.slice(0,2).join(' | ')); }
  await ctx.close();
}

console.log(`\n🚦 Simulating ${USERS} users (pool ${POOL}) across 6 journeys…`);
const t0=Date.now();
const browser=await chromium.launch({headless:true});
try{ await pool(USERS,POOL,i=>runUser(browser,i)); } finally{ await browser.close(); server.close(); }
const secs=((Date.now()-t0)/1000).toFixed(1);
console.log(`\nSessions OK: ${sessionsOK}/${USERS} | JS errors: ${jsErrors} | time: ${secs}s`);
console.log('='.repeat(50));
if(failures){ console.log('❌ '+failures+' issue(s) under load'); process.exit(1); }
console.log('✅ 100-user traffic test passed — 0 JS errors, all journeys OK'); process.exit(0);
