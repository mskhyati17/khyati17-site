// Verify the new original game "Mochi's Treat Catch": it loads and plays,
// catching scores + bombs cost lives + game-over works, and it's discoverable
// on the GameZone hub and in global search.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8179,r));
const base='http://localhost:8179';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Game loads and renders');
  await p.goto(`${base}/fun-games/mochi-treat-catch.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__mochiCatch,{timeout:8000});
  const dims=await p.$eval('#c', c=>({w:c.width,h:c.getBoundingClientRect().width}));
  (dims.w===400 && dims.h>0) ? pass('canvas renders ('+Math.round(dims.h)+'px wide)') : fail('canvas bad: '+JSON.stringify(dims));
  (await p.textContent('#score'))==='0' ? pass('score starts at 0') : fail('score not 0');

  console.log('\n[2] Player moves with arrow keys');
  const x0=await p.evaluate(()=>window.__mochiCatch.player().x);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(350); await p.keyboard.up('ArrowRight');
  const x1=await p.evaluate(()=>window.__mochiCatch.player().x);
  (x1>x0) ? pass('ArrowRight moved Mochi ('+Math.round(x0)+'→'+Math.round(x1)+')') : fail('no move: '+x0+'→'+x1);

  console.log('\n[3] Catching a treat scores');
  await p.evaluate(()=>{ window.__mochiCatch.forceCatchTreat(); window.__mochiCatch.forceCatchTreat(); window.__mochiCatch.forceCatchTreat(); });
  await p.waitForTimeout(100);
  const sc=parseInt(await p.textContent('#score'),10);
  (sc>=3) ? pass('score after 3 catches: '+sc) : fail('score wrong: '+sc);

  console.log('\n[4] Bombs cost lives → game over at 0');
  await p.evaluate(()=>{ window.__mochiCatch.forceBomb(); window.__mochiCatch.forceBomb(); });
  const lives=await p.evaluate(()=>window.__mochiCatch.lives);
  (lives===1) ? pass('2 bombs → 1 life left') : fail('lives: '+lives);
  await p.evaluate(()=>window.__mochiCatch.forceBomb());
  await p.waitForTimeout(150);
  (await p.evaluate(()=>window.__mochiCatch.isOver())) ? pass('3rd bomb ends the game') : fail('game did not end');
  (await p.isVisible('#over.show')) ? pass('game-over overlay shown') : fail('no overlay');

  console.log('\n[5] Play Again resets');
  await p.click('#again'); await p.waitForTimeout(150);
  ((await p.textContent('#score'))==='0' && !(await p.evaluate(()=>window.__mochiCatch.isOver()))) ? pass('reset to a fresh game') : fail('reset failed');

  console.log('\n[6] Discoverable on the GameZone hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForSelector('#grid .card, .card',{timeout:12000}).catch(()=>{});
  const onHub=await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi.?s Treat/.test(g.name)));
  onHub ? pass('game is in the hub catalog') : fail('not in hub GAMES');

  console.log('\n[7] Discoverable in global search');
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForSelector('.main-nav .ks-trigger',{timeout:8000});
  await p.keyboard.press('/'); await p.waitForSelector('#ks-overlay.open',{timeout:5000});
  await p.waitForFunction(()=>/things to search|Type to search/.test(document.getElementById('ks-count').textContent),{timeout:10000});
  await p.fill('#ks-input','mochi treat'); await p.waitForTimeout(300);
  const hit=await p.$$eval('#ks-results .ks-row', els=>els.some(e=>/Mochi.?s Treat/i.test(e.textContent)));
  hit ? pass('search finds the game') : fail('search miss');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi game checks passed'); process.exit(0);
