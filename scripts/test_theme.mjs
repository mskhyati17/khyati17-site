// Verify the light/dark theme toggle on shell pages: a 🌙/☀️ button appears in
// the nav, toggles data-theme + the page background, persists across reloads
// and navigation, and produces no JS errors.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8173,r));
const base='http://localhost:8173';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const bg = p => p.evaluate(()=>getComputedStyle(document.body).backgroundImage);
try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});
  await p.evaluate(()=>localStorage.setItem('theme','light'));  // known start state (persists, not reset)
  await p.reload({waitUntil:'networkidle'});

  console.log('\n[1] Theme toggle appears in the nav');
  await p.waitForSelector('.main-nav .theme-toggle',{timeout:8000});
  const label0=await p.getAttribute('.theme-toggle','aria-label');
  pass('toggle present ("'+label0+'")');
  const lightBg=await bg(p);

  console.log('\n[2] Clicking switches to dark');
  await p.click('.theme-toggle'); await p.waitForTimeout(300);
  const theme=await p.getAttribute('html','data-theme');
  const darkBg=await bg(p);
  (theme==='dark') ? pass('data-theme="dark" applied') : fail('data-theme='+theme);
  (darkBg!==lightBg) ? pass('page background changed for dark mode') : fail('background did not change');
  (/24, 11, 34|24,11,34/.test(darkBg)) ? pass('dark background gradient applied') : fail('dark bg not applied: '+darkBg.slice(0,60));
  const glyph=await p.textContent('.theme-toggle');
  /☀/.test(glyph) ? pass('button now shows ☀️ (switch to light)') : fail('glyph not updated: '+glyph);

  console.log('\n[3] Persists across reload');
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(400);
  (await p.getAttribute('html','data-theme')==='dark') ? pass('still dark after reload') : fail('lost theme on reload');

  console.log('\n[4] Toggling back to light');
  await p.click('.theme-toggle'); await p.waitForTimeout(300);
  (await p.getAttribute('html','data-theme')==='light') ? pass('back to light') : fail('did not return to light');

  console.log('\n[5] Home page themes too (stat cards go dark)');
  await p.evaluate(()=>localStorage.setItem('theme','dark'));
  await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
  const statBg=await p.evaluate(()=>getComputedStyle(document.querySelector('.stat')).backgroundColor);
  /36, 22, 51|36,22,51/.test(statBg) ? pass('home stat cards dark ('+statBg+')') : fail('stat card not dark: '+statBg);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL theme checks passed'); process.exit(0);
