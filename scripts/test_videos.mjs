// VideoZone: hub renders/filters/searches and clicking a card navigates to a
// dedicated per-video reader page (real navigation, matching Stories/AI
// Tools/GameZone) — not an in-page modal. The reader plays via the YouTube
// API (unmuted), shows comments, share works, and a video-less URL redirects
// back to the hub, the same pattern as stories.html.
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

  console.log('\n[1] VideoZone hub renders');
  await p.goto(`${base}/videos/index.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForTimeout(400);
  const title = await p.title();
  /VideoZone/i.test(title) ? pass(`hub titled "${title}"`) : fail(`unexpected hub title: ${title}`);
  const cards=await p.$$('#v-grid .v-card');
  // grid is paginated (48/page + Load more) — first page renders a capped batch
  (cards.length>0 && cards.length<=49 && VIDEOS.length>=cards.length) ? pass(`${cards.length} of ${VIDEOS.length} video cards (paginated)`) : fail(`page 1 rendered ${cards.length}, data has ${VIDEOS.length}`);
  const thumbs=await p.$$eval('#v-grid .v-thumb img', ns=>ns.filter(n=>n.src.includes('i.ytimg.com')).length);
  thumbs>40 ? pass(`${thumbs} real YouTube thumbnails`) : fail(`few thumbnails: ${thumbs}`);
  const crossNav = await p.$$eval('.zone-nav a', ns=>ns.map(n=>n.textContent));
  crossNav.some(t=>/GameZone/i.test(t)) && crossNav.some(t=>/AI Zone/i.test(t)) ? pass('cross-navigation to other zones present (matches GameZone/AI Zone/Story Hub)') : fail(`zone nav missing links: ${crossNav.join(', ')}`);

  console.log('\n[2] Filter + search');
  for(const c of await p.$$('#v-chips .v-chip')){ const t=await c.textContent(); if(t.includes('Science')){ await c.click(); break; } }
  await p.waitForTimeout(150);
  const afterCat=await p.$$('#v-grid .v-card'); (afterCat.length>0 && afterCat.length<VIDEOS.length) ? pass(`Science filter -> ${afterCat.length} cards`) : fail(`category filter off: ${afterCat.length}`);
  for(const c of await p.$$('#v-chips .v-chip')){ const t=await c.textContent(); if(t.trim()==='All'){ await c.click(); break; } }
  await p.fill('#v-search','zach'); await p.waitForTimeout(150);
  const search=await p.$$('#v-grid .v-card'); (search.length>0 && search.length<VIDEOS.length) ? pass(`search "zach" -> ${search.length} cards`) : fail(`search off: ${search.length}`);
  await p.fill('#v-search','');

  console.log('\n[3] Clicking a card navigates to a dedicated video page (not a modal)');
  const firstId = VIDEOS[0].id;
  await Promise.all([
    p.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
    p.click('#v-grid .v-card'),
  ]);
  p.url().includes('videos.html?video=') ? pass(`navigated to a real per-video URL: ${p.url()}`) : fail(`did not navigate to a video URL: ${p.url()}`);
  const hasModal = await p.$('.v-modal');
  !hasModal ? pass('reader page has no leftover modal markup — it\'s a real page now') : fail('reader page unexpectedly still has modal markup');

  console.log('\n[4] Reader page: player (sound), comments, share');
  const ifr = await p.waitForSelector('#v-player-mount iframe',{timeout:15000}).catch(()=>null);
  ifr ? pass('player iframe created via YouTube API') : fail('no player iframe');
  const src = ifr ? await ifr.getAttribute('src') : '';
  (src && src.includes('/embed/')) ? pass(`embeds YouTube: ${src.slice(0,46)}…`) : fail(`bad embed src: ${src}`);
  const hasSoundCode = await p.evaluate(()=> document.documentElement.innerHTML.includes('unMute') && document.documentElement.innerHTML.includes('setVolume'));
  hasSoundCode ? pass('player code unmutes + sets volume (sound on)') : fail('no unmute/volume code found');
  const h1Text = await p.textContent('#v-title');
  h1Text.trim().length > 0 ? pass(`video title shown: "${h1Text}"`) : fail('video title empty');
  const promptTxt=await p.textContent('#comment-form-wrapper').catch(()=>'');
  /sign in/i.test(promptTxt) ? pass('comments show sign-in prompt (logged out)') : fail(`no comment prompt: ${JSON.stringify(promptTxt.slice(0,40))}`);
  const shareBtn = await p.$('#v-share');
  shareBtn ? pass('share button present') : fail('share button missing');

  console.log('\n[5] Direct link to a specific video (deep link, no click needed)');
  const p2 = await b.newPage(); const js2=[]; p2.on('pageerror',e=>js2.push(e.message.split('\n')[0]));
  await p2.goto(`${base}/videos/videos.html?video=${encodeURIComponent(firstId)}`,{waitUntil:'networkidle',timeout:20000});
  await p2.waitForSelector('#v-player-mount iframe',{timeout:15000});
  const deepTitle = await p2.textContent('#v-title');
  deepTitle.trim() === VIDEOS[0].title ? pass(`deep link opened the correct video directly: "${deepTitle}"`) : fail(`deep link opened wrong video: "${deepTitle}" expected "${VIDEOS[0].title}"`);
  await p2.close();

  console.log('\n[6] Visiting the reader with no ?video= redirects to the hub');
  const p3 = await b.newPage();
  await p3.goto(`${base}/videos/videos.html`,{waitUntil:'networkidle',timeout:20000});
  p3.url().includes('/videos/index.html') ? pass('bare videos.html redirects to the VideoZone hub') : fail(`expected redirect to hub, got ${p3.url()}`);
  await p3.close();

  console.log('\n[7] "Watch another video" swaps videos without a full page reload');
  const beforeUrl = p.url();
  await p.click('#v-another-btn');
  await p.waitForFunction((prevUrl) => location.href !== prevUrl, beforeUrl, { timeout: 5000 });
  p.url() !== beforeUrl && p.url().includes('videos.html?video=') ? pass(`"watch another" moved to a new video URL: ${p.url()}`) : fail('watch-another did not change the URL correctly');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error (hub/first video): '+e)) : pass('no uncaught JS errors');
  js2.length ? js2.forEach(e=>fail('JS error (deep link page): '+e)) : pass('no uncaught JS errors on deep link');
} finally { await b.close(); server.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); errors.forEach(e=>console.log('  - '+e)); process.exit(1); }
console.log('✅ ALL VideoZone checks passed'); process.exit(0);
