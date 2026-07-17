// Easy approval flow: request -> auto-email (FormSubmit, mocked) + cross-device
// approved-list grants access.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8156,r));
const base='http://localhost:8156';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const sess=email=>(`(()=>{try{var u=JSON.parse(localStorage.getItem('khyati_users')||'{}');u['${email}']={password:'x',metadata:{first_name:'T'}};localStorage.setItem('khyati_users',JSON.stringify(u));localStorage.setItem('khyati_session','${email}');}catch(e){}})()`);
const b=await chromium.launch({headless:true});
try{
  console.log('\n[1] Not signed in');
  { const c=await b.newContext(); const p=await c.newPage(); await p.goto(`${base}/trading/trading.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(400);
    (await p.isVisible('#t-login'))?pass('login screen'):fail('no login screen'); await c.close(); }

  console.log('\n[2] Signed in, not approved -> Request emails owner (FormSubmit mocked)');
  { const c=await b.newContext(); await c.addInitScript(sess('member@e.com')); const p=await c.newPage();
    await p.route('https://formsubmit.co/**', route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:'true',message:'sent'})}));
    let posted=false; p.on('request',req=>{ if(req.url().includes('formsubmit.co')&&req.method()==='POST') posted=true; });
    await p.goto(`${base}/trading/trading.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(400);
    (await p.isVisible('#t-wait'))?pass('waiting screen'):fail('no waiting screen');
    await p.click('#t-request'); await p.waitForTimeout(700);
    posted?pass('posted request to FormSubmit (emails owner)'):fail('did not POST to FormSubmit');
    const msg=await p.textContent('#t-reqmsg'); /request sent/i.test(msg)?pass('shows "Request sent": "'+msg+'"'):fail('msg: '+msg);
    await c.close(); }

  console.log('\n[3] On the approved list (cross-device) -> platform unlocked');
  { const c=await b.newContext(); await c.addInitScript(sess('vip@e.com')); const p=await c.newPage();
    await p.route('**/assets/approved-users.json**', route=>route.fulfill({status:200,contentType:'application/json',body:'["vip@e.com"]'}));
    await p.goto(`${base}/trading/trading.html`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(500);
    (await p.isVisible('#t-app'))?pass('platform shown for approved-list user'):fail('app not shown');
    const src=await p.getAttribute('#t-iframe','src'); (src&&src.includes('trading-home-production.up.railway.app'))?pass('embeds Railway app'):fail('src: '+src);
    await c.close(); }
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL easy-approval checks passed'); process.exit(0);
