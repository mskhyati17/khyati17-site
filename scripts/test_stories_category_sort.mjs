// Verify the Story Hub's genre browsing: category chips work, and selecting
// a genre (Horror, Comedy, etc.) orders that genre's stories shortest to
// longest (shown via the "X min" badge on each card).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url==='/'?'/index.html':req.url.split('?')[0]));if(!existsSync(f)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8139,r));
const base='http://localhost:8139';
const errors=[]; const pass=m=>console.log(`  ✓ ${m}`); const fail=m=>{console.log(`  ✗ ${m}`);errors.push(m);};

function wordsFromBadges(list){ return list.map(t => parseInt(t.match(/(\d+)\s*words/)[1], 10)); }
function isNonDecreasing(arr){ return arr.every((v,i) => i===0 || arr[i-1] <= v); }

const browser = await chromium.launch({ headless: true });
try{
  const page = await browser.newPage();
  const jsErrors = []; page.on('pageerror', e => jsErrors.push(e.message));
  await page.goto(`${base}/stories/index.html`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('.chip', { timeout: 10000 });

  const chipLabels = await page.$$eval('.chip', ns => ns.map(n => n.textContent.trim()));
  ['Horror','Comedy'].every(c => chipLabels.includes(c)) ? pass(`genre chips present: ${chipLabels.join(', ')}`) : fail(`missing expected chips, got: ${chipLabels.join(', ')}`);

  for(const genre of ['Horror','Comedy','Fantasy']){
    const chip = page.locator('.chip', { hasText: new RegExp(`^${genre}$`) });
    await chip.click();
    await page.waitForTimeout(150);
    const activeText = await page.locator('.chip.active').textContent();
    activeText.trim() === genre ? pass(`"${genre}" chip becomes active on click`) : fail(`expected active chip "${genre}", got "${activeText.trim()}"`);

    const badges = await page.$$eval('.badge-cat', ns => ns.map(n => n.textContent));
    badges.length > 0 ? pass(`${genre}: ${badges.length} cards shown`) : fail(`${genre}: no cards shown`);
    badges.every(b => b.startsWith(genre)) ? pass(`${genre}: all cards actually tagged ${genre}`) : fail(`${genre}: found cards from other genres: ${badges.filter(b=>!b.startsWith(genre))}`);

    const words = wordsFromBadges(badges);
    isNonDecreasing(words) ? pass(`${genre}: cards ordered shortest → longest (${words.slice(0,6).join(',')}…${words.slice(-3).join(',')})`) : fail(`${genre}: not sorted shortest-to-longest: ${words.join(',')}`);
  }

  // "All" should not be forced into shortest-first order (keeps newest-first / featured behavior).
  await page.locator('.chip', { hasText: /^All$/ }).click();
  await page.waitForTimeout(150);
  const allBadges = await page.$$eval('.badge-cat', ns => ns.map(n => n.textContent));
  allBadges.length > 0 ? pass(`All: ${allBadges.length} cards shown`) : fail('All: no cards shown');

  jsErrors.length === 0 ? pass('no JS errors') : fail(`JS errors: ${jsErrors.join(', ')}`);
  await browser.close();
}catch(err){
  fail(`Fatal: ${err.message}`);
  await browser.close().catch(()=>{});
}finally{
  server.close();
}

console.log(`\n${'='.repeat(60)}`);
if(errors.length){
  console.log(`❌ ${errors.length} test(s) failed:`); errors.forEach(e=>console.log(`  - ${e}`));
  process.exit(1);
}else{
  console.log('✅ ALL genre sort tests PASSED!');
  process.exit(0);
}
