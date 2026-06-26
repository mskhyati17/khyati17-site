// Credit audit: confirm no game shows a creator-credit/author byline or a link
// back to the original creator. Samples the self-hosted originals + a spread of
// TurboWarp embeds and checks the rendered DOM for author text / profile links.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');

// parse GAMES from the hub
const hub = readFileSync(join(projectDir, 'fun-games', 'index.html'), 'utf8');
const GAMES = [];
for (const line of hub.split('\n')) {
  const nm = line.match(/name:\s*"([^"]+)"/);
  const url = line.match(/url:\s*"([^"]+)"/);
  if (nm && url) GAMES.push({ name: nm[1], url: url[1] });
}
const locals = GAMES.filter(g => g.url.startsWith('/fun-games/'));
const tw = GAMES.filter(g => /turbowarp\.org/.test(g.url));
// sample ~30 turbowarp embeds spread across the catalog
const step = Math.max(1, Math.floor(tw.length / 30));
const twSample = tw.filter((_, i) => i % step === 0).slice(0, 30);
console.log(`Catalog: ${GAMES.length} games (${locals.length} self-hosted, ${tw.length} TurboWarp). Auditing ${locals.length} locals + ${twSample.length} TurboWarp embeds.`);

const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{res.writeHead(404);res.end('nf');return;}}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'text/plain'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8142,r));
const base='http://localhost:8142';

// what counts as a creator credit in the rendered DOM
function auditPage(){
  return (page=>page.evaluate(()=>{
    const links = [...document.querySelectorAll('a')].map(a=>a.href);
    // links to a creator's scratch profile or "see original" style links
    const creditLinks = links.filter(h=>/scratch\.mit\.edu\/users\//i.test(h) || /turbowarp\.org\/\d+(\/fullscreen)?\b/i.test(h) || /scratch\.mit\.edu\/projects\//i.test(h));
    // visible byline text that is real DOM text (NOT inside <style>/<script>, NOT canvas pixels)
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let n, bylines=[];
    while((n=walker.nextNode())){
      const pt=n.parentElement?n.parentElement.tagName:'';
      if(pt==='STYLE'||pt==='SCRIPT')continue;
      const t=(n.textContent||'').trim();
      if(/\bcreated by\b/i.test(t)||/\bmade by\b/i.test(t)||/\bby\s+@\w/i.test(t)||/\bauthor\s*[:=]/i.test(t)||/\bcredits?\b/i.test(t))bylines.push(t.slice(0,80));
    }
    return { creditLinks:[...new Set(creditLinks)], bylines:[...new Set(bylines)] };
  }))(page);
}

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl']});
let issues=0, page;
async function check(label, url, isLocal){
  page=await browser.newPage();
  try{ await page.goto(url,{waitUntil:'load',timeout:30000}); }catch(e){ console.log('⚠  '+label+' nav fail'); await page.close(); return; }
  if(!isLocal){ try{ await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>10;},{timeout:25000}); }catch(e){} }
  await page.waitForTimeout(isLocal?1200:2500);
  const r=await auditPage();
  const bad = r.creditLinks.length>0 || r.bylines.length>0;
  if(bad){ issues++; console.log('❌ CREDIT | '+label+(r.creditLinks.length?' links:'+JSON.stringify(r.creditLinks):'')+(r.bylines.length?' text:'+JSON.stringify(r.bylines):'')); }
  else console.log('✅ clean  | '+label);
  await page.close();
}
try{
  for(const g of locals) await check(g.name+' (local)', base+g.url, true);
  for(const g of twSample) await check(g.name+' (TW)', g.url, false);
}finally{ await browser.close(); server.close(); }
console.log('\n'+(issues===0?'✅ NO CREDITS FOUND — all audited games are credit-free':'❌ '+issues+' game(s) still show a credit'));
process.exit(issues?1:0);
