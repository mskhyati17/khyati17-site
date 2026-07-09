// Verify "Mochi Slide": shuffles solvable, a valid move slides a tile & counts,
// completing the order wins, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8271,r));
const base='http://localhost:8271';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/mochi-slide.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__mochiSlide,{timeout:8000});
  (await p.$$eval('.tile', e=>e.length))===9 ? pass('9 tiles render') : fail('tiles missing');
  (await p.evaluate(()=>window.__mochiSlide.board().slice().sort((a,b)=>a-b).join(''))) === '012345678' ? pass('board has tiles 0-8') : fail('bad board');
  !(await p.evaluate(()=>window.__mochiSlide.solved())) ? pass('starts shuffled (not solved)') : fail('started solved');

  console.log('\n[1] A valid move slides a tile and counts');
  await p.evaluate(()=>window.__mochiSlide.setBoard([1,2,3,4,5,6,7,0,8]));  // blank at 7, tile 8 at 8
  await p.evaluate(()=>window.__mochiSlide.move(8));  // slide 8 into blank
  const mv=await p.evaluate(()=>window.__mochiSlide.moves());
  mv===1 ? pass('move counted') : fail('moves='+mv);

  console.log('\n[2] Completing the order wins');
  (await p.evaluate(()=>window.__mochiSlide.solved())) ? pass('board solved after move') : fail('not solved');
  await p.waitForTimeout(50);
  /Solved/i.test(await p.textContent('#status')) ? pass('win status shown') : fail('no win status');

  console.log('\n[3] Invalid move is ignored');
  await p.evaluate(()=>window.__mochiSlide.setBoard([0,1,2,3,4,5,6,7,8]));  // blank at 0
  await p.evaluate(()=>window.__mochiSlide.move(8));  // 8 not adjacent to blank at 0
  (await p.evaluate(()=>window.__mochiSlide.moves()))===0 ? pass('non-adjacent move ignored') : fail('invalid move counted');

  console.log('\n[4] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi Slide/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi Slide checks passed'); process.exit(0);
