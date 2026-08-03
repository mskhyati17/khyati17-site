// Real gameplay-mechanic tests for Tic-Tac-Toe, Snake, and Pong — previously
// zero dedicated coverage (only confirmed error-free loading). Where the game
// exposes its step function on window, we call it directly in a tight loop
// instead of waiting on real wall-clock animation timers, which is faster
// and avoids flaky real-time-dependent assertions.
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
await new Promise(r=>server.listen(8227,r));
const base = 'http://localhost:8227';

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

console.log('\n[Tic-Tac-Toe] X wins top row, board resets, draw detected');
{
  const { page, jsErrs } = await freshPage('/fun-games/tictactoe.html');
  const cell = (r,c) => `.cell[data-row="${r}"][data-col="${c}"]`;
  // X: (0,0) (0,1) (0,2) win top row; O: (1,0) (1,1) in between
  await page.click(cell(0,0)); // X
  await page.click(cell(1,0)); // O
  await page.click(cell(0,1)); // X
  await page.click(cell(1,1)); // O
  await page.click(cell(0,2)); // X wins
  await page.waitForTimeout(150);
  const status = await page.textContent('#status');
  status.toLowerCase().includes('x') && status.toLowerCase().includes('win') ? pass(`win detected: "${status}"`) : fail(`no win message: "${status}"`);
  const disabled = await page.$$eval('.cell.disabled, .cell:disabled', els => els.length);
  disabled > 0 ? pass('board locks after a win') : fail('cells still clickable after win');

  await page.click('#resetBtn');
  await page.waitForTimeout(100);
  const afterReset = await page.textContent('#status');
  const cellsEmpty = await page.$$eval('.cell', els => els.every(e => !e.textContent.trim()));
  cellsEmpty ? pass('New Game clears the board') : fail('board not cleared after reset');
  afterReset.toLowerCase().includes('x') ? pass(`status reset: "${afterReset}"`) : fail('status not reset to X\'s turn: '+afterReset);

  // draw scenario: X O X / X O O / O X X -> no winner
  const seq = [[0,0],[0,1],[0,2],[1,1],[1,0],[1,2],[2,1],[2,0],[2,2]];
  for(const [r,c] of seq){ await page.click(cell(r,c)); await page.waitForTimeout(20); }
  await page.waitForTimeout(150);
  const drawStatus = await page.textContent('#status');
  /draw|tie/i.test(drawStatus) ? pass(`draw detected: "${drawStatus}"`) : fail(`expected draw, got: "${drawStatus}"`);

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Snake] eats food via a deterministic step sequence');
{
  const page = await browser.newPage();
  const jsErrs = [];
  page.on('pageerror', e=>jsErrs.push(e.message.split('\n')[0]));
  // Pin Math.random for exactly the first 2 calls (spawnFood()'s x and y for
  // the INITIAL food) so it lands on grid cell (0,0) - not on the snake's
  // starting body, so no infinite retry there. Must restore real randomness
  // after that: once the snake eats (0,0), the *next* spawnFood() re-rolls
  // while excluding cells the snake occupies, and a food cell (0,0) now
  // permanently that IS on the snake would infinite-loop the game's own
  // do/while placement loop forever if Math.random stayed pinned.
  await page.addInitScript(() => {
    const real = Math.random.bind(Math);
    let n = 0;
    Math.random = () => (n++ < 2 ? 0 : real());
  });
  await page.goto(base+'/fun-games/snake.html', { waitUntil:'networkidle' });
  // The game's own real-time setTimeout loop starts running immediately on
  // load, so by the time this evaluate() runs the snake has already moved
  // some unknown number of steps - read the LIVE head position (top-level
  // `let` bindings in a classic <script> are visible to page.evaluate) and
  // compute the exact path to the food cell dynamically instead of assuming
  // the documented starting position. snake/food/dir/gameLoop are globals
  // shared across script tags in this classic (non-module) page.
  await page.evaluate(() => {
    clearTimeout(gameLoop);                          // stop the real-time auto-loop from racing us
    const stepsToWrapX = (20 - snake[0].x) % 20;      // steps moving right until x wraps to 0
    for(let i=0;i<stepsToWrapX;i++){ step(); clearTimeout(gameLoop); }
    setDir('up');
    const stepsUp = snake[0].y;                       // steps moving up until y reaches 0
    for(let i=0;i<stepsUp;i++){ step(); clearTimeout(gameLoop); }
  });
  const score = await page.$eval('#score', e=>parseInt(e.textContent,10));
  score > 0 ? pass(`snake ate food, score=${score}`) : fail('score stayed 0 after the deterministic path to the food cell');

  await page.evaluate(() => window.resetGame());
  await page.waitForTimeout(100);
  const afterReset = await page.$eval('#score', e=>e.textContent);
  afterReset === '0' ? pass('resetGame() zeroes the score') : fail('score not reset: '+afterReset);

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Pong] rallies to a score change or game over via fast-forwarded update()');
{
  const { page, jsErrs } = await freshPage('/fun-games/pong.html');
  await page.evaluate(() => { for(let i=0;i<3000;i++) window.update(); });
  const playerScore = await page.$eval('#playerScore', e=>parseInt(e.textContent,10));
  const cpuScore = await page.$eval('#cpuScore', e=>parseInt(e.textContent,10));
  const gameOver = await page.isVisible('.game-over-msg.show').catch(()=>false);
  (playerScore>0 || cpuScore>0 || gameOver) ? pass(`rally resolved (player=${playerScore}, cpu=${cpuScore}, gameOver=${gameOver})`) : fail('no score change after 3000 update() calls');

  await page.evaluate(() => window.resetGame());
  await page.waitForTimeout(100);
  const afterReset = await page.$eval('#playerScore', e=>e.textContent);
  afterReset === '0' ? pass('resetGame() zeroes the score') : fail('score not reset: '+afterReset);

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n'+'='.repeat(50));
console.log(errors.length===0 ? '✅ ALL MINI-GAME BATCH 2 CHECKS PASSED' : `❌ ${errors.length} check(s) failed`);
await browser.close();
server.close();
process.exit(errors.length===0 ? 0 : 1);
