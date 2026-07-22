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
  cards.length===14 ? pass(`${cards.length} advice cards`) : fail(`expected 14 cards, got ${cards.length}`);
  const titles=await p.$$eval('#adviceGrid .ka-card h3',ns=>ns.map(n=>n.textContent.trim()));
  ['Study Smart','Stay Safe Online','Believe in Yourself','Good Sportsmanship','Family Time'].every(t=>titles.includes(t)) ? pass('key advice topics present') : fail(`topics missing: ${JSON.stringify(titles)}`);
  const t1=await p.textContent('#tipText');
  let changed=false; for(let i=0;i<10;i++){ await p.click('#tipBtn'); await p.waitForTimeout(20); if((await p.textContent('#tipText'))!==t1){changed=true;break;} }
  (t1 && t1!=='—') ? pass(`tip of the day shows: "${t1.slice(0,40)}…"`) : fail('tip of the day empty');
  changed ? pass('"Another tip" rotates the tip') : fail('tip did not change');

  const minis=await p.$$('.ka-mini');
  minis.length===6 ? pass(`${minis.length} mini-widget cards (joke/riddle/fact/would-you-rather/kindness/affirmation)`) : fail(`expected 6 mini widgets, got ${minis.length}`);

  const joke1=await p.textContent('#jokeText');
  await p.click('#jokeBtn'); await p.waitForTimeout(20);
  (joke1 && joke1!=='—') ? pass(`joke of the day shows: "${joke1.slice(0,40)}…"`) : fail('joke empty');

  const riddleQ=await p.textContent('#riddleQ');
  const riddleAHiddenBefore = await p.getAttribute('#riddleA','hidden');
  await p.click('#riddleReveal');
  const riddleA=await p.textContent('#riddleA');
  const riddleAHiddenAfter = await p.getAttribute('#riddleA','hidden');
  (riddleQ && riddleQ!=='—') ? pass(`riddle shows: "${riddleQ.slice(0,40)}…"`) : fail('riddle question empty');
  (riddleAHiddenBefore!==null && riddleAHiddenAfter===null && riddleA && riddleA!=='—') ? pass(`riddle answer hidden until revealed: "${riddleA}"`) : fail('riddle reveal did not work as expected');

  const fact1=await p.textContent('#factText');
  (fact1 && fact1!=='—') ? pass(`fun fact shows: "${fact1.slice(0,40)}…"`) : fail('fun fact empty');

  const wyr1=await p.textContent('#wyrText');
  (wyr1 && wyr1.toLowerCase().startsWith('would you rather')) ? pass(`would-you-rather shows: "${wyr1.slice(0,40)}…"`) : fail('would-you-rather empty or malformed');

  const kind1=await p.textContent('#kindText');
  (kind1 && kind1!=='—') ? pass(`kindness challenge shows: "${kind1.slice(0,40)}…"`) : fail('kindness challenge empty');

  const affirm1=await p.textContent('#affirmText');
  (affirm1 && affirm1!=='—') ? pass(`affirmation shows: "${affirm1.slice(0,40)}…"`) : fail('affirmation empty');

  js.length ? js.forEach(e=>fail(`JS error: ${e}`)) : pass('no uncaught JS errors');
} finally { await b.close(); server.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log(`❌ ${errors.length} failed`); process.exit(1); }
console.log('✅ ALL Others (Kid Advice) checks passed'); process.exit(0);
