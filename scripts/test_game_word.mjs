// Verify "Word Rescue": guessing a correct letter reveals it, a wrong letter
// costs a treat, guessing the whole word wins + scores, running out loses, and
// it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8196,r));
const base='http://localhost:8196';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/word-rescue.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__wordRescue && window.__wordRescue.word,{timeout:8000});
  (await p.$$eval('.key', e=>e.length))===26 ? pass('26 letter keys render') : fail('keys missing');

  console.log('\n[1] Correct letter reveals; wrong letter costs a treat');
  const word=await p.evaluate(()=>window.__wordRescue.word);
  const wrongLetter='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(L=>word.indexOf(L)<0);
  await p.evaluate(w=>window.__wordRescue.guess(w), wrongLetter);
  (await p.evaluate(()=>window.__wordRescue.lives))===5 ? pass('wrong guess cost a treat (5 left)') : fail('lives: '+await p.evaluate(()=>window.__wordRescue.lives));
  await p.evaluate(w=>window.__wordRescue.guess(w[0]), word);
  (await p.evaluate(()=>[...document.querySelectorAll('.slot')].map(s=>s.textContent).join('')).then(t=>t.includes(word[0]))) ? pass('correct letter revealed in the word') : fail('letter not revealed');

  console.log('\n[2] Solving the whole word wins + scores');
  await p.evaluate(w=>{ [...new Set(w.replace(/ /g,'').split(''))].forEach(L=>window.__wordRescue.guess(L)); }, word);
  await p.waitForTimeout(80);
  ((await p.evaluate(()=>window.__wordRescue.state))==='won' && (await p.evaluate(()=>window.__wordRescue.score))>=1) ? pass('word solved → won + score') : fail('state='+await p.evaluate(()=>window.__wordRescue.state));

  console.log('\n[3] Running out of treats loses');
  await p.evaluate(()=>window.__wordRescue.next());
  await p.evaluate(()=>{ const w=window.__wordRescue.word; const wrong='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(L=>w.indexOf(L)<0); for(let i=0;i<6;i++) window.__wordRescue.guess(wrong[i]); });
  await p.waitForTimeout(80);
  (await p.evaluate(()=>window.__wordRescue.state))==='lost' ? pass('6 wrong guesses → lost') : fail('state='+await p.evaluate(()=>window.__wordRescue.state));

  console.log('\n[4] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Word Rescue/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Word Rescue checks passed'); process.exit(0);
