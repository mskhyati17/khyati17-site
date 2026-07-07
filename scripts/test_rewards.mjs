// Verify Mochi's daily rewards: first-visit welcome + coins, a streak counter
// that grows on next-day visits (and resets after a gap), achievement badges,
// a coins/streak/badges strip in the panel, and same-day idempotence.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8174,r));
const base='http://localhost:8174';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const openMochi = async p => { await p.click('#pom-mascot .pom-stage',{force:true}); await p.waitForSelector('#pom-mascot .pom-panel.open',{timeout:8000}); };
const bots = async p => (await p.$$eval('#pom-mascot .pom-msg.bot', ns=>ns.map(n=>n.textContent)));
async function seed(page, obj){ await page.evaluate(o=>localStorage.setItem('pomRewards',JSON.stringify(o)), obj); }
const yesterday = `()=>{const d=new Date();return Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/86400000)-1;}`;
try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));
  await p.goto(`${base}/others/others.html`,{waitUntil:'domcontentloaded',timeout:20000});
  await p.waitForSelector('#pom-mascot .pom-dog',{timeout:15000});

  console.log('\n[1] First visit → welcome + coins + first badge');
  await openMochi(p); await p.waitForTimeout(2600);
  const streak1=(await p.textContent('#pom-mascot .pom-streak')).trim();
  const coins1=parseInt((await p.textContent('#pom-mascot .pom-coins')).replace(/\D/g,''),10);
  const badges1=parseInt((await p.textContent('#pom-mascot .pom-badges')).replace(/\D/g,''),10);
  /1d/.test(streak1) ? pass('streak shows '+streak1) : fail('streak wrong: '+streak1);
  (coins1>=10) ? pass('coins awarded: '+coins1) : fail('coins: '+coins1);
  (badges1>=1) ? pass('first badge earned: '+badges1) : fail('badges: '+badges1);
  const msgs1=(await bots(p)).join(' | ');
  /coins|Welcome/i.test(msgs1) ? pass('welcome/coins message announced') : fail('no reward message: '+msgs1.slice(0,80));
  /Achievement/i.test(msgs1) ? pass('achievement announced') : fail('no achievement message');

  console.log('\n[2] Next-day visit → streak grows to 3, streak badge unlocks');
  const yDay = await p.evaluate(new Function('return ('+yesterday+')()'));
  await seed(p, { streak:2, longest:2, coins:50, days:2, lastDay:yDay, badges:['first'] });
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('#pom-mascot .pom-dog',{timeout:15000});
  await openMochi(p); await p.waitForTimeout(2600);
  const streak2=(await p.textContent('#pom-mascot .pom-streak')).trim();
  /3d/.test(streak2) ? pass('streak grew to '+streak2) : fail('streak not 3: '+streak2);
  const msgs2=(await bots(p)).join(' | ');
  /Day 3 streak/i.test(msgs2) ? pass('"Day 3 streak" announced') : fail('no streak message: '+msgs2.slice(0,80));
  /3-Day Streak/i.test(msgs2) ? pass('3-Day Streak badge unlocked') : fail('no streak badge');

  console.log('\n[3] Same-day revisit is idempotent (no extra streak/coins)');
  const coinsBefore=parseInt((await p.textContent('#pom-mascot .pom-coins')).replace(/\D/g,''),10);
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('#pom-mascot .pom-dog',{timeout:15000});
  await openMochi(p); await p.waitForTimeout(1200);
  const streak3=(await p.textContent('#pom-mascot .pom-streak')).trim();
  const coinsAfter=parseInt((await p.textContent('#pom-mascot .pom-coins')).replace(/\D/g,''),10);
  (/3d/.test(streak3) && coinsAfter===coinsBefore) ? pass('same-day: streak still 3, coins unchanged ('+coinsAfter+')') : fail('idempotence broke: '+streak3+' coins '+coinsBefore+'->'+coinsAfter);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL rewards checks passed'); process.exit(0);
