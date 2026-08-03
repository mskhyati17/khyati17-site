// Real gameplay-mechanic tests for Memory Match, Breakout, Flappy Bird,
// Tetris and Space Invaders - same previously-untested coverage gap as the
// other mini-game batches.
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
await new Promise(r=>server.listen(8228,r));
const base = 'http://localhost:8228';

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

console.log('\n[Memory Match] flip every matching pair, verify full completion');
{
  const { page, jsErrs } = await freshPage('/fun-games/memory-match.html');
  await page.evaluate(async () => {
    // cards is a shared top-level `let` in this classic (non-module) page,
    // readable from evaluate() the same as any other page-scoped global.
    const byEmoji = {};
    cards.forEach((c,i) => { (byEmoji[c.emoji] ||= []).push(i); });
    for (const pairIdxs of Object.values(byEmoji)) {
      const [a,b] = pairIdxs;
      flipCard(a);
      flipCard(b);
      await new Promise(r=>setTimeout(r,10));
    }
  });
  await page.waitForTimeout(300);
  const pairs = await page.$eval('#pairs', e=>e.textContent);
  pairs === '8/8' ? pass('all 8 pairs matched: '+pairs) : fail('pairs not complete: '+pairs);
  const complete = await page.isVisible('#completeMsg.show');
  complete ? pass('completion message shown') : fail('completion message not shown');

  await page.evaluate(() => window.resetGame());
  await page.waitForTimeout(100);
  const afterReset = await page.$eval('#pairs', e=>e.textContent);
  afterReset === '0/8' ? pass('resetGame() clears progress') : fail('progress not reset: '+afterReset);

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Breakout] ball breaks bricks or drains lives over many fast-forwarded updates');
{
  const { page, jsErrs } = await freshPage('/fun-games/breakout.html');
  await page.evaluate(() => { for(let i=0;i<3000;i++) window.update(); });
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  const gameOver = await page.isVisible('.game-over-msg.show').catch(()=>false);
  (score>0 || gameOver) ? pass(`ball physics ran (score=${score}, gameOver=${gameOver})`) : fail('no score change and no game over after 3000 updates');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Flappy Bird] survives/scores or crashes over many updates with periodic flaps');
{
  const { page, jsErrs } = await freshPage('/fun-games/flappy-bird.html');
  await page.evaluate(() => {
    for(let i=0;i<2000;i++){
      if(i%12===0) window.flap();
      window.update();
    }
  });
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  const gameOver = await page.isVisible('.game-over-msg.show, #gameOverMsg.show').catch(()=>false);
  (score>0 || gameOver) ? pass(`flight mechanic ran (score=${score}, gameOver=${gameOver})`) : fail('no score change and no crash after 2000 updates');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Tetris] repeated hard drops clear a line or eventually top out');
{
  const { page, jsErrs } = await freshPage('/fun-games/tetris.html');
  await page.evaluate(() => { for(let i=0;i<60;i++) window.hardDrop(); });
  const scoreText = await page.$eval('#score', e=>e.textContent).catch(()=>'0');
  const score = parseInt(scoreText,10) || 0;
  const gameOver = await page.isVisible('.game-over-msg.show, #gameOverMsg.show').catch(()=>false);
  (score>0 || gameOver) ? pass(`piece-locking mechanic ran (score=${score}, gameOver=${gameOver})`) : fail('no score change and no top-out after 60 hard drops');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Space Invaders] shooting over many updates hits an enemy or ends the wave');
{
  const { page, jsErrs } = await freshPage('/fun-games/space-invaders.html');
  await page.evaluate(() => {
    for(let i=0;i<1500;i++){
      if(i%20===0) window.shoot();
      window.update();
    }
  });
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  const gameOver = await page.isVisible('.game-over-msg.show, #gameOverMsg.show').catch(()=>false);
  (score>0 || gameOver) ? pass(`shooting mechanic ran (score=${score}, gameOver=${gameOver})`) : fail('no score change and no game over after 1500 updates');
  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n'+'='.repeat(50));
console.log(errors.length===0 ? '✅ ALL MINI-GAME BATCH 3 CHECKS PASSED' : `❌ ${errors.length} check(s) failed`);
await browser.close();
server.close();
process.exit(errors.length===0 ? 0 : 1);
