// Verify the "via Scratch" attribution badge shows only on cards embedded from
// turbowarp.org (community Scratch projects), never on original/hand-built games.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.jpg':'image/jpeg'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'text/html'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8318,r));
const base='http://localhost:8318';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForSelector('#grid .card',{timeout:15000});
  await p.waitForFunction(()=>typeof GAMES!=='undefined' && GAMES.length>9000,{timeout:20000});

  console.log('\n[1] Original games never show the Scratch badge');
  for(const c of await p.$$('#catStrip .chip')){ if(/Original/.test(await c.textContent())){ await c.click(); break; } }
  await p.waitForTimeout(400);
  const originalBadges=await p.$$eval('#grid .card .badge-via', e=>e.length);
  originalBadges===0 ? pass('no badge-via on any Original card') : fail(originalBadges+' Original cards wrongly badged');

  console.log('\n[2] A hand-built classic (Tetris, local page) has no badge either');
  const tetrisHasBadge=await p.evaluate(()=>{
    const g=GAMES.find(g=>g.name==='Tetris');
    return g ? /turbowarp\.org/.test(g.url) : null;
  });
  tetrisHasBadge===false ? pass('Tetris is a local page, not a turbowarp embed') : fail('Tetris URL unexpectedly: '+tetrisHasBadge);

  console.log('\n[3] A known turbowarp-embedded entry does get the badge');
  await p.evaluate(()=>{ for(const c of document.querySelectorAll('#catStrip .chip')){ if(/All|🎮/.test(c.textContent)){ c.click(); break; } } });
  await p.waitForTimeout(200);
  const turboCount=await p.evaluate(()=>GAMES.filter(g=>/turbowarp\.org/.test(g.url)).length);
  (turboCount>5000) ? pass(turboCount+' turbowarp-embedded games in catalogue') : fail('unexpectedly few turbowarp entries: '+turboCount);
  // render a batch and confirm at least one visible card with a turbowarp URL carries the badge
  const anyBadged=await p.evaluate(()=>{
    const cards=[...document.querySelectorAll('#grid .card')];
    return cards.some(c=>c.querySelector('.badge-via'));
  });
  anyBadged ? pass('at least one rendered card shows the "via Scratch" badge') : fail('no rendered card shows the badge');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Scratch-badge checks passed'); process.exit(0);
