// Verify "Mochi Quiz": answering correctly scores, wrong marks the right answer,
// finishing 10 questions shows results, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8228,r));
const base='http://localhost:8228';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/mochi-quiz.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__mochiQuiz && window.__mochiQuiz.current(),{timeout:8000});
  (await p.$$eval('.opt', e=>e.length))===4 ? pass('4 answer options render') : fail('options missing');

  console.log('\n[1] Correct answer scores');
  await p.evaluate(()=>window.__mochiQuiz.answer(window.__mochiQuiz.current().a));
  await p.waitForTimeout(60);
  (await p.evaluate(()=>window.__mochiQuiz.score))===1 ? pass('correct answer scored') : fail('score not 1');
  (await p.$$eval('.opt.correct', e=>e.length))>=1 ? pass('correct option highlighted') : fail('no correct highlight');

  console.log('\n[2] Wrong answer marks the right one');
  await p.evaluate(()=>window.__mochiQuiz.next());
  await p.waitForTimeout(60);
  await p.evaluate(()=>{ const a=window.__mochiQuiz.current().a; window.__mochiQuiz.answer((a+1)%4); });
  await p.waitForTimeout(60);
  ((await p.$$eval('.opt.wrong', e=>e.length))>=1 && (await p.$$eval('.opt.correct', e=>e.length))>=1) ? pass('wrong + correct both marked') : fail('marking wrong');
  (await p.evaluate(()=>window.__mochiQuiz.score))===1 ? pass('wrong answer did not score') : fail('score changed on wrong');

  console.log('\n[3] Finishing 10 questions shows results');
  await p.evaluate(()=>{ for(let k=0;k<10;k++){ const q=window.__mochiQuiz; if(q.state!=='play') break; q.answer(q.current().a); q.next(); } });
  await p.waitForTimeout(100);
  (await p.evaluate(()=>window.__mochiQuiz.state))==='over' ? pass('quiz ended after 10') : fail('state='+await p.evaluate(()=>window.__mochiQuiz.state));
  (await p.isVisible('#over')) ? pass('results screen shown') : fail('no results screen');

  console.log('\n[4] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi Quiz/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi Quiz checks passed'); process.exit(0);
