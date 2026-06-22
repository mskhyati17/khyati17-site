// Final-touches checks: favicon present + served, home CTAs fixed (absolute),
// hub cross-navigation works, custom 404 renders.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const __dirname=join(fileURLToPath(import.meta.url),'..'); const projectDir=join(__dirname,'..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{res.writeHead(404);res.end('nf');return;}}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8142,r));
const base='http://localhost:8142';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Favicon');
  const fav=await fetch(`${base}/favicon.svg`); fav.status===200 ? pass('favicon.svg served (200)') : fail('favicon.svg '+fav.status);
  for(const u of ['/home/index.html','/fun-games/index.html','/stories/index.html','/ai-tools/index.html','/videos/videos.html','/others/others.html']){
    await p.goto(base+u,{waitUntil:'domcontentloaded',timeout:15000});
    const has=await p.$('link[rel="icon"]'); has?null:fail('no favicon link on '+u);
  }
  pass('favicon <link> present on all main pages');

  console.log('\n[2] Home CTAs fixed (absolute + resolve)');
  await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle',timeout:15000});
  const ctas=await p.$$eval('.hero-ctas a',ns=>ns.map(n=>n.getAttribute('href')));
  (ctas.includes('/admin/signup.html') && ctas.includes('/about/about.html')) ? pass('CTAs use absolute paths: '+JSON.stringify(ctas)) : fail('CTAs wrong: '+JSON.stringify(ctas));
  for(const h of ctas){ const r=await fetch(base+h); r.status===200?null:fail(`CTA ${h} -> ${r.status}`); }
  pass('both CTA targets resolve (200)');

  console.log('\n[3] Hub cross-navigation');
  for(const [u,name] of [['/fun-games/index.html','GameZone'],['/stories/index.html','Story Hub'],['/ai-tools/index.html','AI Zone']]){
    await p.goto(base+u,{waitUntil:'networkidle',timeout:15000});
    const links=await p.$$eval('.zone-nav a',ns=>ns.map(n=>({t:n.textContent.trim(),h:n.getAttribute('href')})));
    (links.length===4) ? pass(`${name}: ${links.length} cross-nav links`) : fail(`${name}: ${links.length} cross-nav links`);
  }
  // click Home from GameZone
  await p.goto(`${base}/fun-games/index.html`,{waitUntil:'networkidle',timeout:15000});
  for(const a of await p.$$('.zone-nav a')){ if((await a.textContent()).includes('Home')){ await a.click(); break; } }
  await p.waitForURL(/home\/index\.html/,{timeout:8000}).catch(()=>{});
  p.url().includes('/home/index.html') ? pass('GameZone "Home" link navigates home') : fail('Home link failed: '+p.url());

  console.log('\n[4] Custom 404 page');
  await p.goto(`${base}/404.html`,{waitUntil:'domcontentloaded',timeout:15000});
  const big=(await p.textContent('.big').catch(()=>'')).trim();
  big==='404' ? pass('404 page shows 404') : fail('404 page content: '+big);
  const homeLink=await p.$('a[href="/home/index.html"]'); homeLink?pass('404 has Home link'):fail('404 missing Home link');

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); server.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL final-touch checks passed'); process.exit(0);
