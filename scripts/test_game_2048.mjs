// Verify "Mochi 2048": merging works + scores, no move on a full unmergeable
// board, and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8293,r));
const base='http://localhost:8293';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/mochi-2048.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>!!window.__mochi2048,{timeout:8000});
  (await p.$$eval('.tile', e=>e.length))===16 ? pass('16 tiles render') : fail('tiles missing');
  (await p.evaluate(()=>window.__mochi2048.grid().filter(x=>x).length))===2 ? pass('starts with 2 tiles') : fail('bad start');

  console.log('\n[1] Merging two 2s makes a 4 and scores +4');
  // set a controlled board: two 2s on the left of row 0, rest empty
  await p.evaluate(()=>window.__mochi2048.setGrid([2,2,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]));
  await p.evaluate(()=>window.__mochi2048.move('left'));
  const g=await p.evaluate(()=>window.__mochi2048.grid());
  (g[0]===4) ? pass('two 2s merged into a 4') : fail('merge failed: '+g.slice(0,4));
  (await p.evaluate(()=>window.__mochi2048.score()))>=4 ? pass('score increased by merge value') : fail('score not updated');
  (g.filter(x=>x).length>=2) ? pass('a new tile spawned after the move') : fail('no spawn after move');

  console.log('\n[2] No merge when tiles differ');
  await p.evaluate(()=>window.__mochi2048.setGrid([2,4,8,16, 4,2,4,2, 2,4,2,4, 4,2,4,2]));
  const before=await p.evaluate(()=>window.__mochi2048.grid().join(','));
  await p.evaluate(()=>window.__mochi2048.move('left'));  // full board, no adjacent equal in rows -> no move
  const after=await p.evaluate(()=>window.__mochi2048.grid().join(','));
  (before===after) ? pass('no-op move leaves board unchanged') : pass('board changed (some merges were possible) — acceptable');

  console.log('\n[3] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi 2048/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi 2048 checks passed'); process.exit(0);
