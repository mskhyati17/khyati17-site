// Verify the 5 new original stories (Lantern Keeper, Recipe for a Rainy Day,
// Robot Who Planted a Forest, Whisker's Midnight Library, Boy Who Raced the
// Wind) show on the hub, open correctly in the reader, and are searchable.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const dir=join(fileURLToPath(import.meta.url),'..','..');
const MIME={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const s=createServer((q,r)=>{let f=decodeURIComponent(join(dir,q.url.split('?')[0]));if(!existsSync(f)||extname(f)===''){if(existsSync(f+'/index.html'))f=f+'/index.html';else{r.writeHead(404);r.end();return;}}r.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});r.end(readFileSync(f));});
await new Promise(r=>s.listen(8331,r));
const base='http://localhost:8331';
const errors=[]; const pass=m=>console.log('  ✓ '+m); const fail=m=>{console.log('  ✗ '+m);errors.push(m);};
const b=await chromium.launch({headless:true});
const NEW_SLUGS=['lantern-keeper-of-star-hollow','recipe-for-a-rainy-day','robot-who-planted-a-forest','whisker-and-the-midnight-library','boy-who-raced-the-wind'];
try{
  const p=await b.newPage(); const js=[]; p.on('pageerror',e=>js.push(e.message.split('\n')[0]));

  console.log('\n[1] Story Hub lists all 5 new stories');
  await p.goto(`${base}/stories/index.html`,{waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(600);
  const text=await p.evaluate(()=>document.body.innerText);
  const titles=['Lantern Keeper of Star Hollow','Recipe for a Rainy Day','Robot Who Planted a Forest','Whisker and the Midnight Library','Boy Who Raced the Wind'];
  const missing=titles.filter(t=>!text.includes(t));
  missing.length===0 ? pass('all 5 new titles appear on the hub') : fail('missing: '+missing.join(', '));

  console.log('\n[2] Reader opens each new story with its body text');
  const checks=[
    ['lantern-keeper-of-star-hollow', /Mira|Priya/],
    ['recipe-for-a-rainy-day', /Arjun|Anya/],
    ['robot-who-planted-a-forest', /Unit 7/],
    ['whisker-and-the-midnight-library', /Whisker|Pepper/],
    ['boy-who-raced-the-wind', /Ravi/],
  ];
  for(const [slug,re] of checks){
    await p.goto(`${base}/stories/stories.html?story=${slug}`,{waitUntil:'networkidle',timeout:15000}); await p.waitForTimeout(300);
    const body=await p.evaluate(()=>document.body.innerText);
    re.test(body) ? pass(slug+' body renders') : fail(slug+' body missing/wrong');
  }

  console.log('\n[3] A new story is searchable');
  await p.goto(`${base}/others/others.html`,{waitUntil:'networkidle',timeout:20000});
  await p.waitForSelector('.main-nav .ks-trigger',{timeout:8000});
  await p.keyboard.press('/'); await p.waitForSelector('#ks-overlay.open',{timeout:5000});
  await p.waitForFunction(()=>/things to search|Type to search/.test(document.getElementById('ks-count').textContent),{timeout:10000});
  await p.fill('#ks-input','lantern keeper'); await p.waitForTimeout(300);
  (await p.$$eval('#ks-results .ks-row', e=>e.some(x=>/Lantern Keeper/i.test(x.textContent)))) ? pass('search finds a new story') : fail('search miss');

  console.log('\n[4] Story count reached 210');
  await p.goto(`${base}/stories/index.html`,{waitUntil:'networkidle',timeout:20000});
  const total=await p.evaluate(async ()=>{
    const m=await import('/stories/stories-data.js');
    return m.STORIES.length;
  });
  total===210 ? pass('STORIES.length === 210') : fail('STORIES.length = '+total);

  console.log('');
  js.length ? js.forEach(e=>fail('JS error: '+e)) : pass('no uncaught JS errors');
} finally { await b.close(); s.close(); }
console.log('\n'+'='.repeat(50));
if(errors.length){ console.log('❌ '+errors.length+' failed'); process.exit(1); }
console.log('✅ ALL new-stories-batch checks passed'); process.exit(0);
