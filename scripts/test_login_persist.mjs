// Bug: after logout, signing back in said "invalid credentials". Verify a user
// can sign up, log out, and log back in — even with different email casing.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8159,r));
const base='http://localhost:8159';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const sessionOf = p => p.evaluate(()=>localStorage.getItem('khyati_session'));
try{
  const ctx=await b.newContext(); const p=await ctx.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message));
  const SIGNUP_EMAIL='Neha.Test@Example.com', LOGIN_EMAIL='neha.test@example.com', PW='secret123';

  console.log('\n[1] Sign up (mixed-case email)');
  await p.goto(`${base}/admin/signup.html`,{waitUntil:'networkidle',timeout:15000});
  await p.fill('#first_name','Neha'); await p.fill('#last_name','Test'); await p.fill('#username','neha');
  await p.fill('#email',SIGNUP_EMAIL); await p.fill('#password',PW); await p.fill('#confirm',PW);
  await p.click('button[type=submit]'); await p.waitForTimeout(1300);
  const s1=await sessionOf(p);
  (s1==='neha.test@example.com') ? pass('signed up; email normalized to lowercase ('+s1+')') : fail('signup session: '+s1);

  async function tryLogin(email, pw){
    await p.evaluate(()=>localStorage.removeItem('khyati_session'));
    await p.goto(`${base}/admin/login.html`,{waitUntil:'networkidle',timeout:15000});
    await p.fill('#email',email); await p.fill('#password',pw); await p.click('button[type=submit]');
    await p.waitForTimeout(1300);
    return await sessionOf(p);
  }

  console.log('\n[2] Log out, sign back in with LOWERCASE email (the reported bug)');
  const s2=await tryLogin(LOGIN_EMAIL, PW);
  s2 ? pass('signed back in OK (session: '+s2+')') : fail('login failed (invalid credentials bug)');

  console.log('\n[3] Sign in with the ORIGINAL mixed-case too');
  const s3=await tryLogin(SIGNUP_EMAIL, PW);
  s3 ? pass('mixed-case login also works (session: '+s3+')') : fail('mixed-case login failed');

  console.log('\n[4] Wrong password is still rejected');
  const s4=await tryLogin(LOGIN_EMAIL, 'WRONGpw');
  (!s4) ? pass('wrong password rejected (no session)') : fail('wrong password got in!');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL login-persistence checks passed'); process.exit(0);
