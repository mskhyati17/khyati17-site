// End-to-end: sign up -> signed-in state -> post a comment -> persists ->
// logout -> sign-in prompt -> log back in. Demo auth uses localStorage.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const __dirname=join(fileURLToPath(import.meta.url),'..'); const projectDir=join(__dirname,'..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{res.writeHead(404);res.end('Not Found');return;}}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8140,r));
const base='http://localhost:8140';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const ctx=await b.newContext(); // single context => localStorage persists
const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
try{
  const email='tester'+Date.now()+'@example.com', pw='secret123';

  console.log('\n[1] Sign up');
  await p.goto(`${base}/admin/signup.html`,{waitUntil:'networkidle',timeout:15000});
  await p.fill('#first_name','Tess'); await p.fill('#last_name','Tester'); await p.fill('#username','tess');
  await p.fill('#email',email); await p.fill('#password',pw); await p.fill('#confirm',pw);
  await p.click('button[type=submit]');
  await p.waitForURL(/home\/index\.html/,{timeout:8000}).catch(()=>{});
  const session=await p.evaluate(()=>localStorage.getItem('khyati_session'));
  session===email ? pass('account created & signed in (session set)') : fail('signup did not sign in (session='+session+')');
  await p.waitForTimeout(600);
  const greet=await p.textContent('#header-greeting').catch(()=>null);
  (greet && /Tess/.test(greet)) ? pass('header shows greeting: "'+greet.trim()+'"') : fail('no signed-in greeting in header (got '+JSON.stringify(greet)+')');

  console.log('\n[2] Comment on a story while signed in');
  await p.goto(`${base}/stories/stories.html?story=gloomy-crown`,{waitUntil:'networkidle',timeout:15000});
  await p.waitForTimeout(700);
  const hasBox=await p.isVisible('#comment-form-wrapper #cmt-body').catch(()=>false);
  hasBox ? pass('comment textarea shown for signed-in user') : fail('no comment textarea for signed-in user');
  if(hasBox){
    const text='Loved this story! '+Date.now();
    await p.fill('#cmt-body',text); await p.click('#cmt-post'); await p.waitForTimeout(600);
    const listed=(await p.textContent('#comments-list')).includes(text);
    listed ? pass('posted comment appears in the list') : fail('posted comment not shown');
    // persistence
    await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(700);
    const persisted=(await p.textContent('#comments-list')).includes(text);
    persisted ? pass('comment persists after reload') : fail('comment did not persist');
  }

  console.log('\n[3] Logout -> sign-in prompt on comments');
  // click logout in header
  const logout=await p.$('#logout-btn'); if(logout){ await logout.click(); await p.waitForTimeout(800); }
  await p.goto(`${base}/stories/stories.html?story=gloomy-crown`,{waitUntil:'networkidle',timeout:15000});
  await p.waitForTimeout(700);
  const prompt=await p.textContent('#comment-form-wrapper').catch(()=>'');
  /sign in/i.test(prompt) ? pass('signed-out users see a sign-in prompt') : fail('no sign-in prompt when logged out (got '+JSON.stringify(prompt.slice(0,40))+')');

  console.log('\n[4] Log back in');
  await p.goto(`${base}/admin/login.html`,{waitUntil:'networkidle',timeout:15000});
  await p.fill('#email',email); await p.fill('#password',pw); await p.click('button[type=submit]');
  await p.waitForURL(/home\/index\.html/,{timeout:8000}).catch(()=>{});
  const s2=await p.evaluate(()=>localStorage.getItem('khyati_session'));
  s2===email ? pass('login works (session restored)') : fail('login failed (session='+s2+')');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); server.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL auth + comments checks passed'); process.exit(0);
