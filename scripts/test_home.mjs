// Verify the home "Everything to explore" section: animated stat counters reach
// their real values, the explore cards link to every section, trust badges +
// richer footer render, and there are no JS errors.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8171,r));
const base='http://localhost:8171';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle',timeout:20000});

  console.log('\n[1] Stat counters animate to their real values');
  await p.evaluate(()=>document.querySelector('.home-explore').scrollIntoView());
  await p.waitForTimeout(1900);
  const stats=await p.$$eval('.stat-num', els=>els.map(e=>e.textContent.trim()));
  const want=['10,000+','10,000+','200','700+'];
  const ok=want.every((w,i)=>stats[i]===w);
  ok ? pass('counters: '+stats.join(' · ')) : fail('counters wrong: got '+stats.join(',')+' want '+want.join(','));

  console.log('\n[1b] Today\'s Picks render');
  const picks=await p.$$eval('#today-picks .pick', e=>e.map(x=>x.getAttribute('href')));
  (picks.length===3 && picks.every(h=>h&&h.startsWith('/'))) ? pass('3 daily picks: '+picks.map(h=>h.split('?')[0]).join(', ')) : fail('picks wrong: '+picks.join(','));

  console.log('\n[2] Explore cards link to every section');
  const cards=await p.$$eval('.explore-grid .xcard', els=>els.map(e=>({t:e.querySelector('h3').textContent, href:e.getAttribute('href')})));
  const need=['/fun-games/index.html','/ai-tools/index.html','/stories/index.html','/videos/videos.html','/trading/trading.html','/others/others.html'];
  const hrefs=cards.map(c=>c.href);
  const allThere=need.every(h=>hrefs.includes(h));
  (cards.length>=6 && allThere) ? pass(`${cards.length} cards linking to all sections`) : fail('missing section links: '+hrefs.join(', '));

  console.log('\n[3] Trust badges + richer footer');
  const badges=await p.$$eval('.why', e=>e.map(x=>x.textContent.trim()));
  (badges.length>=4 && badges.some(b=>/offline/i.test(b))) ? pass('trust badges: '+badges.join(' · ')) : fail('badges missing: '+badges);
  const footLinks=await p.$$eval('.foot-links a', e=>e.length);
  (footLinks>=6) ? pass(`footer has ${footLinks} quick links`) : fail('footer links: '+footLinks);

  console.log('\n[4] A card actually navigates');
  await Promise.all([ p.waitForNavigation({timeout:8000}).catch(()=>{}), p.click('.xc-tools') ]);
  /ai-tools/.test(p.url()) ? pass('AI Tools card navigates ('+p.url().replace(base,'')+')') : fail('card nav failed: '+p.url());

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL home checks passed'); process.exit(0);
