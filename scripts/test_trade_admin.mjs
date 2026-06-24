// Trade-tab gating + admin panel + admin-only nav link.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8155,r));
const base='http://localhost:8155';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const ADMIN='mskhyati17@gmail.com';
const b=await chromium.launch({headless:true});
async function ctxWith(seed){ const c=await b.newContext(); if(seed) await c.addInitScript(seed); return c; }
const seedUser=(email,extra)=>(`(()=>{try{var u=JSON.parse(localStorage.getItem('khyati_users')||'{}');u['${email}']=Object.assign({password:'x',metadata:{first_name:'Tester'}}, ${JSON.stringify(extra||{})});localStorage.setItem('khyati_users',JSON.stringify(u));localStorage.setItem('khyati_session','${email}');}catch(e){}})()`);
try{
  console.log('\n[1] Trade tab — not signed in');
  { const c=await b.newContext(); const p=await c.newPage(); await p.goto(`${base}/trading/trading.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(400);
    (await p.isVisible('#t-login')) ? pass('shows "please sign in"') : fail('login state not shown'); await c.close(); }

  console.log('\n[2] Trade tab — signed in, NOT approved');
  { const c=await ctxWith(seedUser('member@e.com')); const p=await c.newPage(); await p.goto(`${base}/trading/trading.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(500);
    (await p.isVisible('#t-wait')) ? pass('shows "waiting for approval"') : fail('wait state not shown');
    ((await p.textContent('#t-email'))||'').includes('member@e.com') ? pass('shows the user email') : fail('email missing');
    const href=await p.getAttribute('#t-request','href'); (href&&href.startsWith('mailto:mskhyati17@gmail.com')) ? pass('request emails the owner') : fail('request href: '+href);
    await c.close(); }

  console.log('\n[3] Trade tab — signed in + approved');
  { const c=await ctxWith(seedUser('vip@e.com',{tradeAccess:true,tradeUntil:Date.now()+9e10})); const p=await c.newPage(); await p.goto(`${base}/trading/trading.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(500);
    (await p.isVisible('#t-app')) ? pass('shows the platform') : fail('app state not shown');
    const src=await p.getAttribute('#t-iframe','src'); (src&&src.includes('trading-home-production.up.railway.app')) ? pass('embeds the Railway app: '+src) : fail('iframe src: '+src);
    await c.close(); }

  console.log('\n[4] Admin panel — non-admin blocked');
  { const c=await ctxWith(seedUser('member@e.com')); const p=await c.newPage(); await p.goto(`${base}/admin/panel.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(500);
    (await p.isVisible('#ap-gate')) ? pass('non-admin sees "admin only" gate') : fail('gate not shown for non-admin'); await c.close(); }

  console.log('\n[5] Admin panel — admin manages users (grant trading)');
  { const c=await ctxWith(`(()=>{try{var u=JSON.parse(localStorage.getItem('khyati_users')||'{}');u['member@e.com']={password:'x',metadata:{first_name:'Member'}};localStorage.setItem('khyati_users',JSON.stringify(u));localStorage.setItem('khyati_session','${ADMIN}');}catch(e){}})()`);
    const p=await c.newPage(); p.on('dialog',d=>d.accept());
    await p.goto(`${base}/admin/panel.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(600);
    (await p.isVisible('#ap-content')) ? pass('admin sees the panel') : fail('panel not shown for admin');
    const users=await p.$$eval('#ap-users .ap-user .ap-uemail', ns=>ns.map(n=>n.textContent));
    users.some(u=>u.includes('member@e.com')) ? pass('member listed ('+users.length+' users)') : fail('member not listed: '+JSON.stringify(users));
    // click Grant trading on the member row
    const rows=await p.$$('#ap-users .ap-user');
    for(const row of rows){ const em=(await row.$eval('.ap-uemail',n=>n.textContent)); if(em.includes('member@e.com')){ const gb=await row.$('button[data-act="grant"]'); if(gb) await gb.click(); break; } }
    await p.waitForTimeout(300);
    const granted=await p.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('khyati_users'))['member@e.com'].tradeAccess===true; }catch(e){ return false; } });
    granted ? pass('Grant trading set tradeAccess=true (with 1-yr expiry)') : fail('grant did not persist');
    await c.close(); }

  console.log('\n[6] Admin nav link visibility');
  { const c=await ctxWith(`localStorage.setItem('khyati_session','${ADMIN}')`); const p=await c.newPage(); await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(700);
    (await p.isVisible('#nav-admin')) ? pass('admin sees the 🛠️ Admin link') : fail('admin link hidden for admin'); await c.close(); }
  { const c=await ctxWith(seedUser('member@e.com')); const p=await c.newPage(); await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(700);
    (!(await p.isVisible('#nav-admin').catch(()=>true))) ? pass('non-admin does NOT see Admin link') : fail('admin link shown to non-admin'); await c.close(); }
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL trade-gate + admin checks passed'); process.exit(0);
