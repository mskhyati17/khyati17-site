// Verify Mochi — the AI Talking Teacup Pomeranian corner buddy.
// Checks: renders, opens, replies in-character, emotion classes + bubbles,
// lip-sync "talking" state, accessory customization, and cross-page persistence.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8153,r));
const base='http://localhost:8153';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message));
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1400);

  console.log('\n[1] Puppy renders');
  (await p.isVisible('#pom-mascot .pom-dog')) ? pass('SVG puppy is on the page') : fail('puppy SVG missing');
  const parts=await p.$$eval('#pom-mascot .pom-dog *',ns=>({tail:!!document.querySelector('.pom-tail'),ear:document.querySelectorAll('.pom-ear').length,mouth:!!document.querySelector('.pom-mouth-open'),eyes:!!document.querySelector('.pom-eyes-round')}));
  (parts.ear===2 && parts.tail && parts.mouth && parts.eyes) ? pass('has 2 ears, tail, mouth, eyes') : fail('missing parts '+JSON.stringify(parts));

  console.log('\n[2] Opens chat + greets in character');
  await p.click('#pom-mascot .pom-stage',{force:true}); await p.waitForTimeout(400);
  (await p.isVisible('#pom-mascot .pom-panel.open')) ? pass('panel opens on tap') : fail('panel did not open');
  const greet=(await p.$$eval('#pom-mascot .pom-msg.bot', ns=>ns.map(n=>n.textContent))).join(' ');
  /days old|🍖|Mochi|Ruff|Arf|Woof|🐾/i.test(greet) ? pass('greeting in character: "'+greet.slice(0,60)+'…"') : fail('greeting: '+greet);

  console.log('\n[3] Reply + emotion + speech bubble + lip-sync');
  await p.fill('#pom-mascot .pom-input input','tell me a joke'); await p.click('.pom-send');
  await p.waitForTimeout(700);
  const last=(await p.$$eval('#pom-mascot .pom-msg.bot', ns=>ns.map(n=>n.textContent))).pop();
  pass('reply: "'+last.slice(0,70)+'…"');
  (await p.isVisible('#pom-mascot .pom-speech.show')) ? pass('animated speech bubble shown') : fail('speech bubble not shown');
  const emoClass=await p.getAttribute('#pom-mascot','class');
  /emo-/.test(emoClass) ? pass('emotion class applied: '+emoClass.split(' ').filter(c=>c.startsWith('emo-')).join(',')) : fail('no emotion class: '+emoClass);
  // lip-sync: capture whether "talking" toggles during the reply window
  let sawTalking=false;
  for(let i=0;i<25;i++){ if(/(^| )talking( |$)/.test(await p.getAttribute('#pom-mascot','class'))){sawTalking=true;break;} await p.waitForTimeout(80); }
  sawTalking ? pass('mouth lip-sync engaged (talking state)') : fail('never entered talking/lip-sync state');
  const emoBubble=(await p.textContent('#pom-mascot .pom-emobubble')).trim();
  emoBubble ? pass('emotion bubble emoji: '+emoBubble) : fail('emotion bubble empty');

  console.log('\n[4] Ruff system fires across several replies');
  let ruffs=0;
  for(const msg of ['hi there','are you cute','i love you','goodbye']){
    await p.fill('#pom-mascot .pom-input input',msg); await p.click('.pom-send'); await p.waitForTimeout(550);
  }
  const bots=(await p.$$eval('#pom-mascot .pom-msg.bot', ns=>ns.map(n=>n.textContent)));
  bots.forEach(t=>{ if(/^(Ruff|Arf|Woof|Bark|Yip|Rrrf)/i.test(t)) ruffs++; });
  (ruffs>=1) ? pass(ruffs+' replies start with a ruff/bark') : fail('no ruffs across replies');

  console.log('\n[5] Learn-as-you-go memory');
  await p.fill('#pom-mascot .pom-input input','my favorite treat is bacon'); await p.click('.pom-send'); await p.waitForTimeout(500);
  await p.fill('#pom-mascot .pom-input input',"what's my favorite treat"); await p.click('.pom-send'); await p.waitForTimeout(500);
  const memLast=(await p.$$eval('#pom-mascot .pom-msg.bot', ns=>ns.map(n=>n.textContent))).pop();
  /bacon/i.test(memLast) ? pass('remembered favorite: "'+memLast.slice(0,50)+'…"') : fail('did not remember: '+memLast);

  console.log('\n[6] Accessory customization (wizard hat)');
  await p.click('#pom-mascot .pom-gear'); await p.waitForTimeout(150);
  (await p.isVisible('#pom-mascot .pom-settings')) ? pass('settings open') : fail('settings did not open');
  for(const btn of await p.$$('#pom-mascot .pom-accs button')){ if(/Wizard/.test(await btn.textContent())){ await btn.click(); break; } }
  await p.fill('#pom-mascot .pom-name','Biscuit');
  await p.click('#pom-mascot .pom-done'); await p.waitForTimeout(200);
  (await p.getAttribute('#pom-mascot','class')).includes('acc-wizard') ? pass('wizard hat applied') : fail('accessory not applied');
  (await p.isVisible('#pom-mascot .acc-wizard')) ? pass('wizard hat SVG visible') : fail('wizard hat SVG hidden');
  (await p.textContent('#pom-mascot .pom-title')).includes('Biscuit') ? pass('renamed to Biscuit') : fail('rename failed');

  console.log('\n[7] Persists across navigation');
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(1200);
  const cls=await p.getAttribute('#pom-mascot','class').catch(()=>'');
  const title=await p.textContent('#pom-mascot .pom-title').catch(()=>'');
  (cls.includes('acc-wizard') && title.includes('Biscuit')) ? pass('config carried across pages') : fail('nav lost config: '+cls+' / '+title);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL Mochi (Pomeranian buddy) checks passed'); process.exit(0);
