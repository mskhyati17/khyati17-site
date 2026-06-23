import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8153,r));
const base='http://localhost:8153';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  // A) login page has the API key field and saves it
  console.log('\n[1] Login page API-key field');
  { const ctx=await b.newContext(); const p=await ctx.newPage();
    await p.goto(`${base}/admin/login.html`,{waitUntil:'networkidle',timeout:15000});
    (await p.$('#apikey')) ? pass('login has API key field') : fail('no #apikey on login');
    await p.fill('#email','x@y.com'); await p.fill('#password','pw'); await p.fill('#apikey','sk-test-LOGINKEY');
    await p.click('button[type=submit]'); await p.waitForTimeout(600);
    const k=await p.evaluate(()=>localStorage.getItem('openai_api_key'));
    k==='sk-test-LOGINKEY' ? pass('login saved API key to localStorage') : fail('login key not saved ('+k+')');
    await ctx.close(); }

  // B) NO key -> every message is the persuasion nudge
  console.log('\n[2] No key -> persuasion every time');
  { const ctx=await b.newContext(); const p=await ctx.newPage();
    await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(1400);
    await p.click('#cute-mascot .cm-buddy',{force:true}); await p.waitForTimeout(200);
    for(const t of ['hi','tell me a joke','how are you']){ await p.fill('#cute-mascot .cm-input input',t); await p.click('.cm-send'); await p.waitForTimeout(450); }
    const bots=await p.$$eval('#cute-mascot .cm-msg.bot', ns=>ns.map(n=>n.textContent));
    const replies=bots.slice(1); // skip greeting
    const allNudge=replies.length>=3 && replies.every(r=>/key/i.test(r));
    allNudge ? pass('all replies nudge for API key: e.g. "'+replies[0]+'"') : fail('not all nudges: '+JSON.stringify(replies));
    await ctx.close(); }

  // C) WITH key (mocked OpenAI) -> real AI reply
  console.log('\n[3] With key -> ChatGPT reply (mocked OpenAI)');
  { const ctx=await b.newContext();
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('openai_api_key','sk-test-REALKEY'); }catch(e){} });
    const p=await ctx.newPage();
    await p.route('https://api.openai.com/**', route=> route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'Yay! Let us go play a game 🎮🦊'}}]})}));
    await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(1400);
    await p.click('#cute-mascot .cm-buddy',{force:true}); await p.waitForTimeout(200);
    await p.fill('#cute-mascot .cm-input input','hello milo'); await p.click('.cm-send'); await p.waitForTimeout(900);
    const bots=await p.$$eval('#cute-mascot .cm-msg.bot', ns=>ns.map(n=>n.textContent));
    bots.some(t=>t.includes('Let us go play a game')) ? pass('ChatGPT reply shown: "Yay! Let us go play a game 🎮🦊"') : fail('no AI reply: '+JSON.stringify(bots));
    await ctx.close(); }

  // D) settings key save
  console.log('\n[4] Settings API-key save');
  { const ctx=await b.newContext(); const p=await ctx.newPage();
    await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(1400);
    await p.click('#cute-mascot .cm-buddy',{force:true}); await p.waitForTimeout(150);
    await p.click('#cute-mascot .cm-gear'); await p.waitForTimeout(150);
    await p.fill('#cute-mascot .cm-key','sk-test-SETTINGSKEY'); await p.click('.cm-key-save'); await p.waitForTimeout(200);
    const k=await p.evaluate(()=>localStorage.getItem('openai_api_key'));
    k==='sk-test-SETTINGSKEY' ? pass('settings saved API key') : fail('settings key not saved ('+k+')');
    await ctx.close(); }
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL buddy-ChatGPT checks passed'); process.exit(0);
