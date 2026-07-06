// Verify Mochi's virtual-pet care + aging system:
//   - starts as a Baby (0 days old)
//   - feed / bath / brush / pet daily care actions (mark done + in-character reply)
//   - petting by tapping the puppy
//   - grows a day older when you visit the next day; shrinks when you miss days
//   - restarts to a newborn after 30+ days away
//   - growth stage scales the puppy's size
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8156,r));
const base='http://localhost:8156';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});

// helper: seed pet state as if lastDay was `gap` days ago at a given age
async function seedPet(page, gap, age){
  await page.evaluate(({gap,age})=>{
    const d=new Date(); const t=Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/86400000);
    localStorage.setItem('pomPet', JSON.stringify({born:t-gap, age, lastDay:t-gap, care:{day:-1,feed:false,bath:false,brush:false,pet:false}, hearts:0}));
  }, {gap,age});
}
const openChat = async p => { await p.click('#pom-mascot .pom-stage',{force:true}); await p.waitForSelector('#pom-mascot .pom-panel.open',{timeout:8000}); };
const lastBot = async p => (await p.$$eval('#pom-mascot .pom-msg.bot', ns=>ns.map(n=>n.textContent))).pop();

try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/others/others.html`,{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForSelector('#pom-mascot .pom-dog',{timeout:15000});
  await p.waitForTimeout(300);

  console.log('\n[1] Starts as a Baby, 0 days old');
  const badge0=(await p.textContent('#pom-mascot .pom-agebadge')).trim();
  /Baby/i.test(badge0) && /0 days old/i.test(badge0) ? pass('age badge: "'+badge0+'"') : fail('badge='+badge0);
  const babyScale=await p.$eval('#pom-mascot .pom-dogwrap', el=>getComputedStyle(el).getPropertyValue('--dogScale').trim());
  (parseFloat(babyScale)<0.8) ? pass('baby is scaled small ('+babyScale+')') : fail('baby scale='+babyScale);

  console.log('\n[2] Daily care: feed / bath / brush mark done + reply in character');
  await openChat(p);
  for(const [care,rx] of [['feed',/nom|treat|full|tummy|yum/i],['bath',/splash|clean|bath|bubbl|sparkl/i],['brush',/teeth|shiny|mint|sparkl/i]]){
    await p.click(`#pom-mascot .pom-carebtn[data-care="${care}"]`); await p.waitForTimeout(250);
    const done=await p.$eval(`#pom-mascot .pom-carebtn[data-care="${care}"]`, el=>el.classList.contains('done'));
    const reply=await lastBot(p);
    (done && rx.test(reply)) ? pass(`${care}: done ✓, reply "${reply.slice(0,40)}…"`) : fail(`${care}: done=${done} reply=${reply}`);
  }

  console.log('\n[3] Pet by tapping the puppy → love reaction + pet marked done');
  await p.click('#pom-mascot .pom-stage',{force:true}); await p.waitForTimeout(250);
  const petDone=await p.$eval('#pom-mascot .pom-carebtn[data-care="pet"]', el=>el.classList.contains('done'));
  const emo=await p.getAttribute('#pom-mascot','class');
  (petDone && /emo-love/.test(emo)) ? pass('petting works (pet done, love emotion)') : fail('pet done='+petDone+' class='+emo);

  console.log('\n[4] All four cared → bonus message');
  await p.waitForTimeout(1100);
  const bonus=(await p.$$eval('#pom-mascot .pom-msg.bot', ns=>ns.map(n=>n.textContent))).some(t=>/feel amazing|all cared|come back tomorrow/i.test(t));
  bonus ? pass('bonus "all cared for" message appeared') : fail('no bonus message after all 4 care actions');

  console.log('\n[5] Grows a day older when you visit the next day');
  await seedPet(p, 1, 5);              // last visit yesterday, was 5 days old
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('#pom-mascot .pom-dog'); await p.waitForTimeout(200);
  const grewBadge=(await p.textContent('#pom-mascot .pom-agebadge')).trim();
  /6 days old/i.test(grewBadge) ? pass('aged 5 → 6 after a next-day visit: "'+grewBadge+'"') : fail('grew badge='+grewBadge);
  await openChat(p);
  const grewStatus=(await p.$$eval('#pom-mascot .pom-msg.bot',n=>n.map(x=>x.textContent)))[0]||'';
  /came back|grew|days old now/i.test(grewStatus) ? pass('shows a "you came back / I grew" status') : fail('no grew status: '+grewStatus);

  console.log('\n[6] Shrinks when you miss days');
  await seedPet(p, 3, 10);             // 3-day gap → lost 1 net day: 10 → 9
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('#pom-mascot .pom-dog'); await p.waitForTimeout(200);
  const shrBadge=(await p.textContent('#pom-mascot .pom-agebadge')).trim();
  /9 days old/i.test(shrBadge) ? pass('shrank 10 → 9 after missing days: "'+shrBadge+'"') : fail('shrink badge='+shrBadge);
  await openChat(p);
  (await p.$$eval('#pom-mascot .pom-msg.bot',n=>n.map(x=>x.textContent)))[0].match(/smaller|missed/i) ? pass('shows a "got smaller" status') : fail('no shrink status message');

  console.log('\n[7] Restarts to a newborn after 30+ days away');
  await seedPet(p, 40, 18);           // 40-day gap → restart
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('#pom-mascot .pom-dog'); await p.waitForTimeout(200);
  const rsBadge=(await p.textContent('#pom-mascot .pom-agebadge')).trim();
  (/Baby/i.test(rsBadge) && /0 days old/i.test(rsBadge)) ? pass('restarted to Baby / 0 days: "'+rsBadge+'"') : fail('restart badge='+rsBadge);
  await openChat(p);
  (await p.$$eval('#pom-mascot .pom-msg.bot',n=>n.map(x=>x.textContent)))[0].match(/away|start over|newborn|30/i) ? pass('shows a "start over" status') : fail('no restart status message');

  console.log('\n[8] Grown-up puppy is scaled larger');
  await seedPet(p, 0, 30);            // 30 days old, no gap
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('#pom-mascot .pom-dogwrap'); await p.waitForTimeout(200);
  const grownBadge=(await p.textContent('#pom-mascot .pom-agebadge')).trim();
  const grownScale=await p.$eval('#pom-mascot .pom-dogwrap', el=>getComputedStyle(el).getPropertyValue('--dogScale').trim());
  (/Grown-up/i.test(grownBadge) && parseFloat(grownScale)>1.1) ? pass('grown-up & larger: "'+grownBadge+'" scale '+grownScale) : fail('grown badge='+grownBadge+' scale='+grownScale);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL care + aging checks passed'); process.exit(0);
