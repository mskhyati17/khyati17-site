// Verify Milo's expanded replies + the "teach me" learning feature.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8154,r));
const base='http://localhost:8154';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message));
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1300);
  await p.click('#cute-mascot .cm-buddy',{force:true}); await p.waitForTimeout(200);
  async function say(t){ await p.fill('#cute-mascot .cm-input input',t); await p.click('.cm-send'); await p.waitForTimeout(560); return (await p.$$eval('#cute-mascot .cm-msg.bot', ns=>ns.map(n=>n.textContent))).pop(); }

  console.log('\n[1] Expanded intents give on-topic replies');
  const joke=await say('tell me a joke'); /road|royalty|windows|knock|nap-imal/i.test(joke) ? pass('joke: "'+joke+'"') : fail('joke off: '+joke);
  const color=await say('what is your favorite color'); /purple|rainbow/i.test(color) ? pass('color: "'+color+'"') : fail('color off: '+color);
  const game=await say('i am so bored'); /game|gamezone|play/i.test(game) ? pass('bored->games: "'+game+'"') : fail('bored off: '+game);
  const sad=await say('i feel sad'); /hug|cookie|breath|got this/i.test(sad) ? pass('sad->comfort: "'+sad+'"') : fail('sad off: '+sad);

  console.log('\n[2] Favorite memory');
  await say('my favorite snack is mango'); const favback=await say('what is my favorite snack'); /mango/i.test(favback) ? pass('remembers favorite: "'+favback+'"') : fail('fav memory off: '+favback);

  console.log('\n[3] Teach-me: Milo learns a new reply and persists it');
  const phrase='do you like waffles';
  let taught=false;
  for(let i=0;i<10 && !taught;i++){ const r=await say(phrase); if(/teach me|learning/i.test(r)){ await say('I LOVE waffles so much! 🧇'); taught=true; } }
  taught ? pass('entered teach mode and taught a reply') : fail('never entered teach mode');
  const after=await say(phrase); /waffles so much/i.test(after) ? pass('uses the learned reply: "'+after+'"') : fail('did not use learned reply: '+after);
  const stored=await p.evaluate(()=>{ try{ return JSON.stringify(JSON.parse(localStorage.getItem('miloLearned')||'{}')); }catch(e){ return '{}'; } });
  /waffles so much/.test(stored) ? pass('learned reply persisted to localStorage') : fail('not persisted: '+stored);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL buddy-reply checks passed'); process.exit(0);
