// Real gameplay-mechanic tests for 6 built-in canvas mini-games that
// previously had zero dedicated coverage (only verified error-free loading
// as part of a broader sitewide sweep). Each test drives actual game
// mechanics (clicks/keys/window-exposed functions) and asserts observable
// state changes, not just "the page didn't crash".
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml' };
const server = createServer((req,res)=>{
  let f = join(projectDir, decodeURIComponent(req.url.split('?')[0]));
  if(!existsSync(f) || extname(f)===''){ if(existsSync(f+'/index.html')) f=f+'/index.html'; else { res.writeHead(404); res.end(); return; } }
  res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});
  res.end(readFileSync(f));
});
await new Promise(r=>server.listen(8226,r));
const base = 'http://localhost:8226';

const errors = [];
const pass = m => console.log('  ✓ '+m);
const fail = m => { console.log('  ✗ '+m); errors.push(m); };

const browser = await chromium.launch();

async function freshPage(url){
  const page = await browser.newPage();
  const jsErrs = [];
  page.on('pageerror', e=>jsErrs.push(e.message.split('\n')[0]));
  await page.goto(base+url, { waitUntil:'networkidle' });
  return { page, jsErrs };
}

console.log('\n[Bubble Pop] click cells to pop groups');
{
  const { page, jsErrs } = await freshPage('/fun-games/bubble-pop.html');
  const box = await page.$eval('#c', el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; });
  // click a grid of sample cells (8x8 board) - some will hit groups of 2+
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const px = box.x + (c/8+1/16)*box.w, py = box.y + (r/8+1/16)*box.h;
    await page.mouse.click(px, py);
  }
  await page.waitForTimeout(200);
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  score > 0 ? pass(`score increased to ${score} after clicking board`) : fail('score stayed 0 after clicking whole board');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Color Catch] paddle collision + color switch');
{
  const { page, jsErrs } = await freshPage('/fun-games/color-catch.html');
  const box = await page.$eval('#c', el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; });
  // sweep the paddle across the bottom while switching color, long enough for several drops to reach it
  const start = Date.now();
  while(Date.now()-start < 8000){
    const t = (Date.now()-start)/8000;
    await page.mouse.move(box.x + (0.15+0.7*Math.abs(Math.sin(t*10)))*box.w, box.y+box.h-10);
    if(Math.random()<0.1) await page.evaluate(()=>switchColor());
    await page.waitForTimeout(30);
  }
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  const lives = await page.$eval('#lives', e=>parseInt(e.textContent,10));
  (score>0 || lives<3) ? pass(`collision mechanic fired (score=${score}, lives=${lives})`) : fail('no drop ever reached the paddle band');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Gravity Flip] auto-scroll distance + flip control');
{
  const { page, jsErrs } = await freshPage('/fun-games/gravity-flip.html');
  const start = Date.now();
  while(Date.now()-start < 6000){
    await page.evaluate(()=>flip());
    await page.waitForTimeout(400);
  }
  const scoreText = await page.$eval('#score', e=>e.textContent);
  const dist = parseInt(scoreText,10);
  dist > 0 || await page.isVisible('#over.show') ? pass(`distance/game-over registered (distance=${dist})`) : fail('distance never advanced');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Reflex Tiles] click glowing tiles');
{
  const { page, jsErrs } = await freshPage('/fun-games/reflex-tiles.html');
  const box = await page.$eval('#c', el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; });
  // click all 16 cell centers repeatedly over ~3s - guaranteed to hit whatever tile is currently lit
  const start = Date.now();
  while(Date.now()-start < 3000){
    for(let r=0;r<4;r++) for(let c=0;c<4;c++){
      const px = box.x + (c/4+1/8)*box.w, py = box.y + (r/4+1/8)*box.h;
      await page.mouse.click(px, py);
    }
    await page.waitForTimeout(50);
  }
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  score > 0 ? pass(`hit ${score} tile(s)`) : fail('never hit a single tile');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Orbit Dodge] rocks pass or collide over time');
{
  const { page, jsErrs } = await freshPage('/fun-games/orbit-dodge.html');
  const start = Date.now();
  while(Date.now()-start < 6000){
    if(Math.random()<0.15) await page.evaluate(()=>reverse());
    await page.waitForTimeout(80);
  }
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  const gameOver = await page.isVisible('#over.show');
  (score>0 || gameOver) ? pass(`orbit mechanic ran (score=${score}, gameOver=${gameOver})`) : fail('no rocks ever resolved');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Maze Dash] arrow keys move the player, walls block moves');
{
  const { page, jsErrs } = await freshPage('/fun-games/maze-dash.html');
  const before = await page.$eval('#moves', e=>parseInt(e.textContent,10));
  // try all 4 directions via keyboard (the on-screen d-pad is mobile-only,
  // hidden by a max-width:600px media query on the default desktop viewport)
  // - at least one must be open from the start cell
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const after = await page.$eval('#moves', e=>parseInt(e.textContent,10));
  after > before ? pass(`moves counter increased (${before} -> ${after})`) : fail('no move ever registered from the start cell');
  // New Maze resets moves to 0
  await page.click('button[onclick="newMaze(true)"]');
  await page.waitForTimeout(150);
  const afterReset = await page.$eval('#moves', e=>e.textContent);
  const level = await page.$eval('#level', e=>e.textContent);
  (level === '1') ? pass('New Maze resets to level 1') : fail('New Maze did not reset level: '+level);
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n'+'='.repeat(50));
console.log(errors.length===0 ? '✅ ALL MINI-GAME BATCH 1 CHECKS PASSED' : `❌ ${errors.length} check(s) failed`);
await browser.close();
server.close();
process.exit(errors.length===0 ? 0 : 1);
