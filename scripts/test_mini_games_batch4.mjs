// Real gameplay-mechanic tests for the 4 largest/most complex previously-
// untested mini-games: Global Tag (local hot-seat chase game), Lego Build
// (3D creative sandbox, no score/win concept), Parenting Simulator and
// WW1 Trench Run (both choice-driven narrative games).
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
await new Promise(r=>server.listen(8229,r));
const base = 'http://localhost:8229';

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

console.log('\n[Global Tag] local same-keyboard multiplayer - movement input actually moves each player');
{
  // This is pure local hot-seat multiplayer (its own startup console.log says
  // "Up to 4 players, same keyboard") - there is no bot/AI fallback, so
  // nothing moves without real key input. Verify P1 (WASD) and P2 (arrows)
  // each actually respond to their own keys, via gameState.keys + update(),
  // which is what the real keydown/keyup listeners do.
  const { page, jsErrs } = await freshPage('/fun-games/global-tag.html');
  await page.click('#startBtn');
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => gameState.players.map(p => ({x:p.x, y:p.y})));

  await page.evaluate(() => {
    gameState.keys['d'] = true;          // P1 move right
    gameState.keys['ArrowLeft'] = true;  // P2 move left
    for(let i=0;i<60;i++) window.update(0.05);
    gameState.keys['d'] = false;
    gameState.keys['ArrowLeft'] = false;
  });
  const after = await page.evaluate(() => gameState.players.map(p => ({x:p.x, y:p.y})));

  const p1Moved = after[0].x > before[0].x;
  const p2Moved = after[1].x < before[1].x;
  p1Moved ? pass(`P1 (WASD) moved right: x ${before[0].x.toFixed(3)} -> ${after[0].x.toFixed(3)}`) : fail('P1 did not respond to the "d" key');
  p2Moved ? pass(`P2 (arrows) moved left: x ${before[1].x.toFixed(3)} -> ${after[1].x.toFixed(3)}`) : fail('P2 did not respond to ArrowLeft');

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Lego Build] starter demo loads, Undo is a safe no-op on it, Reset clears everything');
{
  // The whole game is a `(function(){ 'use strict'; ... })()` IIFE with 3D
  // raycasted placement on mousedown/mouseup - nothing placement-related is
  // exposed on window, and reliably driving perspective-camera raycasting
  // via synthetic clicks isn't practical here, so this sticks to what's
  // deterministically verifiable through the real UI.
  const { page, jsErrs } = await freshPage('/fun-games/lego-build.html');
  await page.waitForTimeout(500); // let the Three.js scene finish setting up
  const initial = await page.$eval('#brick-count', e=>parseInt(e.textContent,10));
  initial === 15 ? pass('pre-built starter house loaded (15 bricks)') : fail('expected 15 demo bricks, got '+initial);

  // The demo bricks are deliberately pushed with pushUndo=false and the undo
  // stack is cleared right after ("don't allow undoing the demo"), so Undo
  // here must be a safe no-op, not an error and not a decrement.
  await page.click('#btn-undo');
  await page.waitForTimeout(100);
  const afterUndo = await page.$eval('#brick-count', e=>parseInt(e.textContent,10));
  afterUndo === initial ? pass('Undo on the protected demo bricks is a safe no-op') : fail(`Undo changed count: ${initial} -> ${afterUndo}`);

  page.once('dialog', d => d.accept());
  await page.click('#btn-reset');
  await page.waitForTimeout(100);
  const afterClear = await page.$eval('#brick-count', e=>e.textContent).catch(()=>null);
  afterClear === '0' ? pass('Reset button empties the scene') : fail('reset did not zero the count: '+afterClear);

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[Parenting Simulator] play through all 12 days to an ending');
{
  // Also wrapped in a `(function(){...})()` IIFE, so this drives the real UI
  // and reads visible DOM state rather than internal `state`.
  const { page, jsErrs } = await freshPage('/fun-games/parenting-simulator.html');
  page.on('dialog', d => d.accept(''));  // chooseParent() prompts for a name
  await page.click('#startBtn');
  await page.waitForTimeout(100);
  await page.click('.choice-btn');       // "I'll be the Mom!"
  await page.waitForTimeout(150);

  let days = 0;
  for(let i=0;i<14;i++){
    const restartVisible = await page.isVisible('#restartBtn:not(.hidden)').catch(()=>false);
    if(restartVisible) break;
    const choiceBtn = await page.$('.choice-btn:not([disabled])');
    if(!choiceBtn) break;
    await choiceBtn.click();
    days++;
    await page.waitForTimeout(80);
    const nextBtn = await page.$('#nextBtn:not(.hidden)');
    if(nextBtn){ await nextBtn.click(); await page.waitForTimeout(80); }
  }
  const finalRestartVisible = await page.isVisible('#restartBtn:not(.hidden)').catch(()=>false);
  const ageText = await page.textContent('#ageDisplay').catch(()=>'');
  (finalRestartVisible || days>=12) ? pass(`reached an ending after ${days} choices (${ageText})`) : fail(`stuck after ${days} choices (${ageText})`);
  const stats = await Promise.all(
    ['statHappinessVal','statHealthVal','statSmartsVal','statDisciplineVal'].map(id => page.textContent('#'+id).catch(()=>null))
  );
  const anyChanged = stats.some(v => v !== '100');
  anyChanged ? pass('at least one stat changed from the default 100: '+JSON.stringify(stats)) : fail('no stat ever changed from 100 across 12 days: '+JSON.stringify(stats));

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n[WW1 Trench Run] play through choices to an ending or extended survival');
{
  const { page, jsErrs } = await freshPage('/fun-games/ww1-trench-run.html');
  page.on('dialog', d => d.accept());
  await page.click('.start-btn');       // "ENLIST" - dismisses the intro overlay
  await page.waitForTimeout(1200);      // startGame() waits 1000ms into the fade before scene_intro() runs
  let clicks = 0;
  for(let i=0;i<50;i++){
    const gameOver = await page.evaluate(() => state.gameOver).catch(()=>false);
    if(gameOver) break;
    const btn = await page.$('.choice-btn:not([disabled])');
    if(!btn) break;
    await btn.click();
    clicks++;
    await page.waitForTimeout(120);
  }
  const finalState = await page.evaluate(() => ({ gameOver: state.gameOver, day: state.day, health: state.health, morale: state.morale }));
  const progressed = finalState.gameOver || finalState.day > 1 || finalState.health !== 100 || finalState.morale !== 100;
  progressed ? pass(`choices had real consequences (gameOver=${finalState.gameOver}, day=${finalState.day}, health=${finalState.health}, morale=${finalState.morale}) after ${clicks} choices`) : fail(`no progression after ${clicks} choices: ${JSON.stringify(finalState)}`);

  jsErrs.length===0 ? pass('no JS errors') : fail('JS errors: '+jsErrs.join(', '));
  await page.close();
}

console.log('\n'+'='.repeat(50));
console.log(errors.length===0 ? '✅ ALL MINI-GAME BATCH 4 CHECKS PASSED' : `❌ ${errors.length} check(s) failed`);
await browser.close();
server.close();
process.exit(errors.length===0 ? 0 : 1);
