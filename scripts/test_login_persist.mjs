// Re-login must work after logout (bug: "invalid credentials" / forced re-signup).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8160,r));
const base='http://localhost:8160';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const sessionOf = p => p.evaluate(()=>localStorage.getItem('khyati_session'));
async function signup(p, {first='A',last='B',user='u',email,pw}){ await p.goto(`${base}/admin/signup.html`,{waitUntil:'networkidle',timeout:15000}); await p.fill('#first_name',first); await p.fill('#last_name',last); await p.fill('#username',user); await p.fill('#email',email); await p.fill('#password',pw); await p.fill('#confirm',pw); await p.click('button[type=submit]'); await p.waitForTimeout(1300); }
async function login(p, email, pw){ await p.evaluate(()=>localStorage.removeItem('khyati_session')); await p.goto(`${base}/admin/login.html`,{waitUntil:'networkidle',timeout:15000}); await p.fill('#email',email); await p.fill('#password',pw); await p.click('button[type=submit]'); await p.waitForTimeout(1300); return await sessionOf(p); }
try{
  console.log('\n[1] Normal user: signup -> logout -> login (case-insensitive)');
  { const c=await b.newContext(); const p=await c.newPage();
    await signup(p,{email:'Neha.Test@Example.com',pw:'secret123'});
    (await sessionOf(p))==='neha.test@example.com' ? pass('signup normalized email to lowercase') : fail('signup session wrong');
    (await login(p,'neha.test@example.com','secret123')) ? pass('login with lowercase works') : fail('lowercase login failed');
    (await login(p,'Neha.Test@Example.com','secret123')) ? pass('login with original case works') : fail('mixed-case login failed');
    (!(await login(p,'neha.test@example.com','WRONG'))) ? pass('wrong password rejected') : fail('wrong password got in');
    await c.close(); }

  console.log('\n[2] ADMIN account: signup with a custom password -> logout -> login (the reported bug)');
  { const c=await b.newContext(); const p=await c.newPage();
    const ADM='mskhyati17@gmail.com', APW='myadminpass1';
    await signup(p,{first:'Khyati',last:'S',user:'khyati',email:ADM,pw:APW});
    (await sessionOf(p))===ADM ? pass('admin signup signed in') : fail('admin signup session wrong');
    const s2=await login(p, ADM, APW);
    s2===ADM ? pass('admin can log back in with the password they chose ✅') : fail('admin re-login FAILED with chosen password (session='+s2+')');
    await c.close(); }

  console.log('');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL login-persistence checks passed'); process.exit(0);
