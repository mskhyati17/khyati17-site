// Verify the "👻 Scary" GameZone category: chip present, filters to only games
// tagged scary (all names read as horror/spooky), and games still open.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8291,r));
const base='http://localhost:8291';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const scaryRe=/horror|scary|creepy|haunt|nightmare|granny|slender|fnaf|freddy|spooky|undead|zombie|ghost|poppy|huggy|scream|backroom|halloween|demon|evil|apocalypse|vampire|werewolf|phantom|cursed|reaper|terror|abandoned|night shift/i;
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForSelector('#catStrip .chip',{timeout:10000});

  console.log('\n[1] Scary chip present');
  const chips=await p.$$eval('#catStrip .chip', e=>e.map(x=>x.textContent.trim()));
  chips.some(c=>/Scary/.test(c)) ? pass('"👻 Scary" chip present') : fail('no Scary chip: '+chips.join(','));

  console.log('\n[2] Scary tag count in catalog');
  const tagged = await p.evaluate(()=>GAMES.filter(g=>g.scary).length);
  (tagged>=25 && tagged<=45) ? pass(tagged+' games tagged scary') : fail('unexpected scary count: '+tagged);

  console.log('\n[3] Filter shows only scary games');
  for(const c of await p.$$('#catStrip .chip')){ if(/Scary/.test(await c.textContent())){ await c.click(); break; } }
  await p.waitForTimeout(400);
  const names=await p.$$eval('#grid .card .label', e=>e.map(x=>x.textContent.trim()));
  const cnt=await p.$$eval('#grid .card', e=>e.length);
  (cnt===tagged) ? pass('grid shows all '+cnt+' scary games (no pagination cut)') : fail('grid '+cnt+' vs tagged '+tagged);
  const allScary=names.every(n=>scaryRe.test(n));
  allScary ? pass('every shown game name reads as scary/spooky') : fail('non-scary in filter: '+names.filter(n=>!scaryRe.test(n)).join(' | '));

  console.log('\n[4] A scary game still opens');
  await p.click('#grid .card'); await p.waitForTimeout(500);
  /turbowarp|scratch|fun-games/.test(p.url()) ? pass('scary game opens ('+p.url().slice(0,40)+')') : fail('did not open: '+p.url());

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Scary-category checks passed'); process.exit(0);
