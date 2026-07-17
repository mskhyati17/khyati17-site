import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir = join(fileURLToPath(import.meta.url), '..', '..');
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const s = createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8172,r));
const base='http://localhost:8172';
const cases=[
  ['/ai-tools/color-palette.html','AI Tools'],
  ['/ai-tools/password-generator.html','AI Tools'],
  ['/videos/videos.html','Videos'],
  ['/trading/trading.html','Trading'],
  ['/others/others.html','Others'],
  ['/me/index.html','My Stuff'],
];
const b=await chromium.launch({headless:true});
for(const [url,want] of cases){
  const p=await b.newPage();
  await p.goto(base+url,{waitUntil:'domcontentloaded',timeout:15000});
  await p.waitForSelector('.main-nav a',{timeout:8000}).catch(()=>{});
  await p.waitForTimeout(500);
  const cur=await p.$$eval('.main-nav a[aria-current="page"]',els=>els.map(e=>e.textContent.trim()));
  const ok=cur.length===1 && cur[0].includes(want);
  console.log((ok?'✓':'✗')+' '+url+' → current: ['+cur.join(', ')+']  want "'+want+'"');
  await p.close();
}
s.close(); await b.close();
