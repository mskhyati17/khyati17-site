// Verify the "My Stuff" dashboard: renders streak/coins/badges from storage,
// shows earned vs locked achievements, lists favorites + recently-opened, has a
// nav link, and works in dark mode.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8186,r));
const base='http://localhost:8186';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await ctx.addInitScript(()=>{
    localStorage.setItem('pomRewards', JSON.stringify({streak:7,longest:9,coins:245,days:12,badges:['first','streak3','streak7','coins100']}));
    localStorage.setItem('ks_favs', JSON.stringify([{title:'Snake',type:'Game',sub:'Game',url:'/fun-games/snake.html'},{title:'Pig Latin',type:'Tool',sub:'tool',url:'/ai-tools/tool.html?t=pig-latin'}]));
    localStorage.setItem('ks_recent', JSON.stringify([{title:'The Lighthouse of Lost Things',type:'Story',sub:'Story',url:'/stories/stories.html?story=lighthouse-of-lost-things'}]));
    localStorage.setItem('mochiCatchBest','42'); localStorage.setItem('pawReflexBest','287');
  });
  await p.goto(`${base}/me/index.html`,{waitUntil:'networkidle',timeout:20000});

  console.log('\n[1] Stats reflect stored rewards');
  const stats=(await p.$$eval('.my-stat .n', e=>e.map(x=>x.textContent))).join(' | ');
  (/7/.test(stats) && /245/.test(stats) && /12/.test(stats)) ? pass('stats: '+stats) : fail('stats wrong: '+stats);

  console.log('\n[2] Achievements: earned vs locked');
  const earned=await p.$$eval('.badge.earned', e=>e.length);
  const total=await p.$$eval('.badge', e=>e.length);
  (earned===4 && total===7) ? pass(earned+'/'+total+' achievements earned') : fail('badges: '+earned+'/'+total);

  console.log('\n[3] Favorites + recently opened listed');
  const favTitles=await p.$$eval('#favs .item .t', e=>e.map(x=>x.textContent));
  (favTitles.includes('Snake') && favTitles.includes('Pig Latin')) ? pass('favorites: '+favTitles.join(', ')) : fail('favs: '+favTitles);
  const recTitles=await p.$$eval('#recent .item .t', e=>e.map(x=>x.textContent));
  recTitles.some(t=>/Lighthouse/.test(t)) ? pass('recent: '+recTitles.join(', ')) : fail('recent: '+recTitles);

  console.log('\n[3b] Best-scores section shows the original games');
  const scoreCards=await p.$$eval('#scores .item', els=>els.map(e=>e.querySelector('.s').textContent));
  (scoreCards.length===7 && scoreCards.some(t=>/42/.test(t)) && scoreCards.some(t=>/287/.test(t))) ? pass('7 game score cards with bests') : fail('scores: '+scoreCards.join(' | '));

  console.log('\n[4] Reachable from the nav');
  (await p.$('.main-nav a[href="/me/index.html"]')) ? pass('"My Stuff" link in nav') : fail('no nav link');

  console.log('\n[5] Dark mode themes the dashboard');
  await p.evaluate(()=>window.KhyatiTheme && window.KhyatiTheme.set('dark')); await p.waitForTimeout(200);
  const cardBg=await p.evaluate(()=>getComputedStyle(document.querySelector('.my-stat')).backgroundColor);
  /36, 22, 51|36,22,51/.test(cardBg) ? pass('dashboard cards dark ('+cardBg+')') : fail('not dark: '+cardBg);

  console.log('\n[6] Empty states when nothing stored');
  await ctx.addInitScript(()=>{ localStorage.removeItem('ks_favs'); localStorage.removeItem('ks_recent'); });
  const p2=await ctx.newPage(); await p2.addInitScript(()=>{ localStorage.removeItem('ks_favs'); localStorage.removeItem('ks_recent'); localStorage.removeItem('pomRewards'); });
  await p2.goto(`${base}/me/index.html`,{waitUntil:'networkidle'});
  (await p2.$$eval('.empty', e=>e.length))>=2 ? pass('friendly empty states shown') : fail('no empty states');
  await p2.close();

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL My Stuff checks passed'); process.exit(0);
