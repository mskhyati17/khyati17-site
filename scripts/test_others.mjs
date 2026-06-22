// Verify the Others "Kid Advice" page: advice cards render, Tip of the Day
// rotates, and there are no JS errors.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url==='/'?'/index.html':req.url.split('?')[0]));if(!existsSync(f)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8135,r));
const base='http://localhost:8135';
const errors=[]; const pass=m=>console.log(`  ✓ ${m}`); const fail=m=>{console.log(`  ✗ ${m}`);errors.push(m);};
const b=await chromium.launch({headless:true});
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message));
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:15000});
  await p.waitForTimeout(150);
  const cards=await p.$$('#adviceGrid .ka-card');
  cards.length===10 ? pass(`${cards.length} advice cards`) : fail(`expected 10 cards, got ${cards.length}`);
  const titles=await p.$$eval('#adviceGrid .ka-card h3',ns=>ns.map(n=>n.textContent.trim()));
  ['Study Smart','Stay Safe Online','Believe in Yourself'].every(t=>titles.includes(t)) ? pass('key advice topics present') : fail(`topics missing: ${JSON.stringify(titles)}`);
  const t1=await p.textContent('#tipText');
  let changed=false; for(let i=0;i<10;i++){ await p.click('#tipBtn'); await p.waitForTimeout(20); if((await p.textContent('#tipText'))!==t1){changed=true;break;} }
  (t1 && t1!=='—') ? pass(`tip of the day shows: "${t1.slice(0,40)}…"`) : fail('tip of the day empty');
  changed ? pass('"Another tip" rotates the tip') : fail('tip did not change');
  js.length ? js.forEach(e=>fail(`JS error: ${e}`)) : pass('no uncaught JS errors');
} finally { await b.close(); server.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log(`❌ ${errors.length} failed`); process.exit(1); }
console.log('✅ ALL Others (Kid Advice) checks passed'); process.exit(0);
