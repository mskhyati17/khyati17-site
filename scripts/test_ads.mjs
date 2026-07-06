// Verify the placeholder house ads:
//   - render on a normal content page (in-flow leaderboard + floating banner)
//   - are clearly labeled "Ad" and link to this site's own sections
//   - the floating banner is dismissible and stays dismissed for the session
//   - do NOT collide with Mochi (buddy bottom-right vs ad bottom-left)
//   - do NOT inject an in-flow unit on a game/canvas page
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8158,r));
const base='http://localhost:8158';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Content page shows ads');
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForSelector('#k-ad-float .k-ad',{timeout:8000});
  const inflow=await p.$$eval('main .k-ad-leaderboard', e=>e.length);
  (inflow>=1) ? pass('in-flow leaderboard ad injected into <main>') : fail('no in-flow leaderboard');
  (await p.isVisible('#k-ad-float')) ? pass('floating banner ad visible') : fail('floating banner missing');

  console.log('\n[2] Ads are labeled "Ad" and link to own sections');
  const badges=await p.$$eval('.k-ad-badge', e=>e.map(x=>x.textContent.trim()));
  badges.length && badges.every(t=>/^Ad$/i.test(t)) ? pass(`${badges.length} ad units labeled "Ad"`) : fail('ad label missing: '+badges);
  const hrefs=await p.$$eval('.k-ad-link', e=>e.map(x=>x.getAttribute('href')));
  const ownSection=/\/(fun-games|stories|ai-tools|videos|trading|others)\//;
  hrefs.length && hrefs.every(h=>ownSection.test(h)) ? pass('ads link to own sections: '+[...new Set(hrefs)].join(', ')) : fail('bad ad hrefs: '+hrefs);

  console.log('\n[3] Floating ad does not collide with Mochi');
  await p.waitForSelector('#pom-mascot',{timeout:8000}).catch(()=>{});
  const boxes=await p.evaluate(()=>{
    const a=document.getElementById('k-ad-float'), m=document.getElementById('pom-mascot');
    const r=el=>el?el.getBoundingClientRect():null;
    const ar=r(a), mr=r(m);
    const overlap = ar&&mr && !(ar.right<=mr.left || ar.left>=mr.right || ar.bottom<=mr.top || ar.top>=mr.bottom);
    return {ar:ar&&{l:Math.round(ar.left),r:Math.round(ar.right)}, mr:mr&&{l:Math.round(mr.left),r:Math.round(mr.right)}, overlap};
  });
  (boxes.mr && !boxes.overlap) ? pass(`no overlap (ad right ${boxes.ar.r} < Mochi left ${boxes.mr.l})`) : fail('ad overlaps Mochi: '+JSON.stringify(boxes));

  console.log('\n[4] Floating ad is dismissible + stays closed for the session');
  await p.click('#k-ad-float .k-ad-close'); await p.waitForTimeout(200);
  (await p.$('#k-ad-float')) ? fail('ad still present after close') : pass('ad removed on ✕');
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(600);
  (await p.$('#k-ad-float')) ? fail('ad reappeared after dismiss (should stay closed)') : pass('stays dismissed after reload (sessionStorage)');

  console.log('\n[5] Game/canvas page does NOT get an in-flow ad (layout-safe)');
  const p2=await b.newPage(); const js2=[]; p2.on('pageerror',e=>js2.push(e.message.split('\n')[0]));
  await p2.goto(`${base}/fun-games/snake.html`,{waitUntil:'domcontentloaded',timeout:20000});
  await p2.waitForTimeout(1200);
  const gInflow=await p2.$$eval('.k-ad-leaderboard, .k-ad-rectangle', e=>e.length);
  (gInflow===0) ? pass('no in-flow ad injected on the game page') : fail(`${gInflow} in-flow ads on game page (should be 0)`);
  await p2.close();

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL ad checks passed'); process.exit(0);
