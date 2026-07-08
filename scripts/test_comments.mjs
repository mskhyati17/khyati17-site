// Verify the comment system on Stories + Videos:
//  - signed OUT shows a "sign in to comment" gate (no textarea)
//  - signed IN shows a textarea and a posted comment appears & persists
//  - AuthReady resolving is not required for the form to render
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8244,r));
const base='http://localhost:8244';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const signIn = ctx => ctx.addInitScript(()=>{ localStorage.setItem('khyati_users', JSON.stringify({'t@x.com':{password:'p',metadata:{first_name:'Tess'}}})); localStorage.setItem('khyati_session','t@x.com'); });
async function openStory(p){ /* stories auto-open first/target story */ }
try{
  // ---- STORIES ----
  console.log('\n[Stories] signed out → gate');
  let ctx=await b.newContext(); let p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/stories/stories.html?story=boy-who-painted-wind`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1500);
  (!(await p.$('#cmt-body')) && /sign in/i.test(await p.textContent('#comment-form-wrapper'))) ? pass('gate shown, no textarea') : fail('gate missing');
  await ctx.close();

  console.log('\n[Stories] signed in → post persists');
  ctx=await b.newContext(); await signIn(ctx); p=await ctx.newPage(); p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/stories/stories.html?story=boy-who-painted-wind`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1500);
  (await p.$('#cmt-body')) ? pass('textarea shown') : fail('no textarea when signed in');
  await p.fill('#cmt-body','Loved this story!'); await p.click('#cmt-post'); await p.waitForTimeout(700);
  /Loved this story/.test(await p.textContent('#comments-list')) ? pass('comment posted & shown') : fail('post not shown');
  // reload → persists
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1500);
  /Loved this story/.test(await p.textContent('#comments-list')) ? pass('comment persists after reload') : fail('did not persist');
  await ctx.close();

  // ---- VIDEOS (comments live in the video modal) ----
  console.log('\n[Videos] signed out → gate (in modal)');
  ctx=await b.newContext(); p=await ctx.newPage(); p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/videos/videos.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(1000);
  await p.click('.v-card'); await p.waitForTimeout(1200);
  (!(await p.$('#cmt-body')) && /sign in/i.test(await p.textContent('#comment-form-wrapper'))) ? pass('gate shown in modal') : fail('videos gate missing');
  await ctx.close();

  console.log('\n[Videos] signed in → post works');
  ctx=await b.newContext(); await signIn(ctx); p=await ctx.newPage(); p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/videos/videos.html`,{waitUntil:'domcontentloaded',timeout:20000}); await p.waitForTimeout(1000);
  await p.click('.v-card'); await p.waitForTimeout(1200);
  (await p.$('#cmt-body')) ? pass('textarea shown in modal') : fail('no textarea in modal');
  await p.fill('#cmt-body','Great clip!'); await p.click('#cmt-post'); await p.waitForTimeout(700);
  /Great clip/.test(await p.textContent('#comments-list')) ? pass('video comment posted') : fail('video post not shown');
  await ctx.close();

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL comment checks passed'); process.exit(0);
