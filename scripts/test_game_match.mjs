// Verify "Mochi Match": flipping two matching cards makes a pair; matching all
// 8 pairs wins; and it's on the hub.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8232,r));
const base='http://localhost:8232';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/fun-games/mochi-match.html`,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForFunction(()=>window.__mochiMatch && window.__mochiMatch.count()===16,{timeout:8000});
  pass('16 cards (8 pairs) render');

  console.log('\n[1] Flipping a matching pair scores a pair');
  const pairIdx=await p.evaluate(()=>{ const m=window.__mochiMatch, n=m.count(); const seen={}; for(let i=0;i<n;i++){ const f=m.faceAt(i); if(seen[f]!==undefined) return [seen[f],i]; seen[f]=i; } return null; });
  await p.evaluate(idx=>{ window.__mochiMatch.flip(idx[0]); window.__mochiMatch.flip(idx[1]); }, pairIdx);
  await p.waitForTimeout(120);
  (await p.evaluate(()=>window.__mochiMatch.matched))>=1 ? pass('matched a pair') : fail('no pair matched');

  console.log('\n[2] Matching all pairs wins');
  await p.evaluate(async()=>{
    const m=window.__mochiMatch, n=m.count(); const groups={};
    for(let i=0;i<n;i++){ (groups[m.faceAt(i)]=groups[m.faceAt(i)]||[]).push(i); }
    for(const f in groups){ const [a,bb]=groups[f]; m.flip(a); m.flip(bb); await new Promise(r=>setTimeout(r,20)); }
  });
  await p.waitForTimeout(200);
  ((await p.evaluate(()=>window.__mochiMatch.matched))===8 && (await p.evaluate(()=>window.__mochiMatch.state))==='won') ? pass('all 8 pairs matched → won') : fail('matched='+await p.evaluate(()=>window.__mochiMatch.matched)+' state='+await p.evaluate(()=>window.__mochiMatch.state));

  console.log('\n[3] On the hub');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(400);
  (await p.evaluate(()=>typeof GAMES!=='undefined' && GAMES.some(g=>/Mochi Match/.test(g.name)))) ? pass('in hub catalog') : fail('not on hub');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi Match checks passed'); process.exit(0);
