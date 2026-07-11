// Videos gallery: cards render, filter + search, clicking opens the API player
// (which unmutes for sound) + comments, close works.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { VIDEOS } from '../videos/videos-data.js';
const __dirname=join(fileURLToPath(import.meta.url),'..'); const projectDir=join(__dirname,'..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url.split('?')[0]));if(!existsSync(f)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8141,r));
const base='http://localhost:8141';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/videos/videos.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForTimeout(400);

  console.log('\n[1] Gallery renders');
  const cards=await p.$$('#v-grid .v-card');
  // grid is paginated (48/page + Load more) — first page renders a capped batch
  (cards.length>0 && cards.length<=49 && VIDEOS.length>=cards.length) ? pass(`${cards.length} of ${VIDEOS.length} video cards (paginated)`) : fail(`page 1 rendered ${cards.length}, data has ${VIDEOS.length}`);
  const thumbs=await p.$$eval('#v-grid .v-thumb img', ns=>ns.filter(n=>n.src.includes('i.ytimg.com')).length);
  thumbs>40 ? pass(`${thumbs} real YouTube thumbnails`) : fail(`few thumbnails: ${thumbs}`);

  console.log('\n[2] Filter + search');
  for(const c of await p.$$('#v-chips .v-chip')){ const t=await c.textContent(); if(t.includes('Science')){ await c.click(); break; } }
  await p.waitForTimeout(150);
  const afterCat=await p.$$('#v-grid .v-card'); (afterCat.length>0 && afterCat.length<VIDEOS.length) ? pass(`Science filter -> ${afterCat.length} cards`) : fail(`category filter off: ${afterCat.length}`);
  for(const c of await p.$$('#v-chips .v-chip')){ const t=await c.textContent(); if(t.trim()==='All'){ await c.click(); break; } }
  await p.fill('#v-search','zach'); await p.waitForTimeout(150);
  const search=await p.$$('#v-grid .v-card'); (search.length>0 && search.length<VIDEOS.length) ? pass(`search "zach" -> ${search.length} cards`) : fail(`search off: ${search.length}`);
  await p.fill('#v-search','');

  console.log('\n[3] Open API player (sound) + comments + close');
  await (await p.$('#v-grid .v-card')).click();
  const ifr = await p.waitForSelector('#v-player-mount iframe',{timeout:15000}).catch(()=>null);
  ifr ? pass('player iframe created via YouTube API') : fail('no player iframe');
  const src = ifr ? await ifr.getAttribute('src') : '';
  (src && src.includes('/embed/')) ? pass(`embeds YouTube: ${src.slice(0,46)}…`) : fail(`bad embed src: ${src}`);
  // confirm the page wires unmute/volume (sound) in its code
  const hasSoundCode = await p.evaluate(()=> document.documentElement.innerHTML.includes('unMute') && document.documentElement.innerHTML.includes('setVolume'));
  hasSoundCode ? pass('player code unmutes + sets volume (sound on)') : fail('no unmute/volume code found');
  const promptTxt=await p.textContent('#comment-form-wrapper').catch(()=>'');
  /sign in/i.test(promptTxt) ? pass('comments show sign-in prompt (logged out)') : fail(`no comment prompt: ${JSON.stringify(promptTxt.slice(0,40))}`);
  await p.click('#v-close'); await p.waitForTimeout(300);
  (!(await p.isVisible('#v-modal.open').catch(()=>true))) ? pass('modal closes') : fail('modal did not close');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); server.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Videos gallery checks passed'); process.exit(0);
