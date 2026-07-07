// Verify shareability: every main section page exposes rich Open Graph +
// Twitter card meta, and the home "Share Khyati17" widget builds correct share
// links (X, WhatsApp, Facebook) and a working copy-link button.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8176,r));
const base='http://localhost:8176';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const meta = (p,sel) => p.getAttribute(sel,'content').catch(()=>null);
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Every section page has rich OG + Twitter meta');
  const pages=['/home/index.html','/fun-games/index.html','/ai-tools/index.html','/stories/index.html','/videos/videos.html','/trading/trading.html','/others/others.html','/about/about.html'];
  for(const pg of pages){
    await p.goto(base+pg,{waitUntil:'domcontentloaded',timeout:15000});
    const ogt=await meta(p,'meta[property="og:title"]');
    const ogi=await meta(p,'meta[property="og:image"]');
    const tw =await meta(p,'meta[name="twitter:card"]');
    (ogt && ogi && tw) ? pass(pg+' → "'+ogt+'"') : fail(pg+' missing OG: title='+ogt+' img='+ogi+' card='+tw);
  }

  console.log('\n[2] Home share widget builds correct links');
  await p.goto(`${base}/home/index.html`,{waitUntil:'networkidle'}); await p.waitForTimeout(400);
  const xh=await p.getAttribute('[data-share="x"]','href');
  const wah=await p.getAttribute('[data-share="wa"]','href');
  const fbh=await p.getAttribute('[data-share="fb"]','href');
  /twitter\.com\/intent\/tweet.*khyati17\.com/i.test(decodeURIComponent(xh||'')) ? pass('X/Twitter share link ok') : fail('bad X link: '+xh);
  /wa\.me\/.*khyati17\.com/i.test(decodeURIComponent(wah||'')) ? pass('WhatsApp share link ok') : fail('bad WA link: '+wah);
  /facebook\.com\/sharer.*khyati17\.com/i.test(decodeURIComponent(fbh||'')) ? pass('Facebook share link ok') : fail('bad FB link: '+fbh);

  console.log('\n[3] Copy-link button works');
  await p.evaluate(()=>{ navigator.clipboard.writeText = t => { window.__copied=t; return Promise.resolve(); }; });
  await p.click('[data-share="copy"]'); await p.waitForTimeout(200);
  const copied=await p.evaluate(()=>window.__copied);
  const label=await p.textContent('[data-share="copy"]');
  (/khyati17\.com/.test(copied||'') && /Copied/.test(label)) ? pass('copied "'+copied+'" + button feedback') : fail('copy failed: '+copied+' / '+label);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL share + OG checks passed'); process.exit(0);
