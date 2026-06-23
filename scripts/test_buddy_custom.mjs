// Verify the buddy is customizable (name/animal/gender/accessory) and persists.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8152,r));
const base='http://localhost:8152';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message));
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1400);

  console.log('\n[1] Open chat + settings');
  await p.click('#cute-mascot .cm-buddy',{force:true}); await p.waitForTimeout(200);
  await p.click('#cute-mascot .cm-gear'); await p.waitForTimeout(150);
  (await p.isVisible('#cute-mascot .cm-settings')) ? pass('settings panel opens') : fail('settings did not open');

  console.log('\n[2] Customize: name, animal (dog), accessory (bow), gender (she)');
  await p.fill('#cute-mascot .cm-name','Sparky');
  for(const btn of await p.$$('#cute-mascot .cm-animals button')){ if((await btn.getAttribute('title'))==='dog'){ await btn.click(); break; } }
  for(const btn of await p.$$('#cute-mascot .cm-accs button')){ if((await btn.textContent())==='🎀'){ await btn.click(); break; } }
  for(const btn of await p.$$('#cute-mascot .cm-gen button')){ if((await btn.textContent()).includes('She')){ await btn.click(); break; } }
  await p.click('#cute-mascot .cm-done'); await p.waitForTimeout(150);
  const animal=(await p.textContent('#cute-mascot .cm-animal')).trim();
  const acc=(await p.textContent('#cute-mascot .cm-acc')).trim();
  const title=(await p.textContent('#cute-mascot .cm-title')).trim();
  (animal==='🐶') ? pass('buddy animal -> 🐶') : fail('animal='+animal);
  (acc==='🎀') ? pass('accessory -> 🎀') : fail('acc='+acc);
  (title.includes('Sparky') && title.includes('dog')) ? pass('header: "'+title+'"') : fail('title='+title);

  console.log('\n[3] Gender saved & persisted (used in AI prompt)');
  const g=await p.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('miloConfig')).gender; }catch(e){ return null; } });
  (g==='she') ? pass('gender saved as "she"') : fail('gender not saved: '+g);

  console.log('\n[4] Persists across reload');
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  const a2=(await p.textContent('#cute-mascot .cm-animal')).trim();
  const t2=(await p.textContent('#cute-mascot .cm-title')).trim();
  (a2==='🐶' && t2.includes('Sparky')) ? pass('after reload: '+a2+' / "'+t2+'"') : fail('reload lost config: '+a2+' / '+t2);

  console.log('\n[5] Persists across navigation (to GameZone hub)');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1200);
  const a3=(await p.textContent('#cute-mascot .cm-animal').catch(()=>'')).trim();
  (a3==='🐶') ? pass('config carried to another page: '+a3) : fail('nav lost config: '+a3);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL buddy-customization checks passed'); process.exit(0);
