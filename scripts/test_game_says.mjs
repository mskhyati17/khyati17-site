// Verify "Mochi Says" memory game: shows a growing sequence, correct repetition
// advances the round, a wrong press ends the game, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8183,r));
const base='http://localhost:8183';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const waitInput = p => p.waitForFunction(()=>window.__mochiSays && window.__mochiSays.state==='input',{timeout:8000});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Game loads');
  await p.goto(`${base}/fun-games/mochi-says.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__mochiSays,{timeout:8000});
  (await p.$$eval('.pad', e=>e.length))===4 ? pass('4 colour pads render') : fail('pads missing');

  console.log('\n[2] Start → sequence shown → correct repeat advances the round');
  await p.click('#start');
  await waitInput(p);
  const seq1=await p.evaluate(()=>window.__mochiSays.seq);
  (seq1.length===1) ? pass('round 1 sequence has 1 step') : fail('seq len '+seq1.length);
  await p.evaluate(s=>s.forEach(i=>window.__mochiSays.press(i)), seq1);
  await p.waitForFunction(()=>window.__mochiSays.round===2 && window.__mochiSays.state==='input',{timeout:8000});
  const seq2=await p.evaluate(()=>window.__mochiSays.seq);
  const round=await p.evaluate(()=>window.__mochiSays.round);
  (round===2 && seq2.length===2) ? pass('correct repeat → round 2, sequence grew to 2') : fail('round='+round+' seqlen='+seq2.length);

  console.log('\n[3] A wrong press ends the game');
  // press a deliberately wrong first pad
  const wrong=(seq2[0]+1)%4;
  await p.evaluate(w=>window.__mochiSays.press(w), wrong);
  await p.waitForTimeout(150);
  (await p.evaluate(()=>window.__mochiSays.state))==='over' ? pass('wrong press → game over') : fail('did not end');
  /reached|best/i.test(await p.textContent('#msg')) ? pass('game-over message shown') : fail('no over message');

  console.log('\n[4] On the GameZone hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi Says/.test(g.name)))) ? pass('game is in the hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi Says checks passed'); process.exit(0);
