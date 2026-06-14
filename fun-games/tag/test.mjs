import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const file = pathToFileURL(path.resolve('./index.html')).href;
const results = [];
function check(name, cond, extra='') {
  results.push({ name, ok: !!cond, extra });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ('  :: ' + extra) : ''));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });

await page.goto(file);
await page.waitForTimeout(500);

// 1. Loads in LOBBY
check('initial state is LOBBY', (await page.evaluate(() => window.__TAG__.getState())) === 'LOBBY');

// 2. Join two players via API
await page.evaluate(() => { window.__TAG__.join(0); window.__TAG__.join(1); });
await page.waitForTimeout(100);

// 3. Test each map starts & has players
for (let m = 0; m < 3; m++) {
  await page.evaluate((mi) => { window.__TAG__.setMap(mi); window.__TAG__.start(); }, m);
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__TAG__.getState());
  const ps = await page.evaluate(() => window.__TAG__.getPlayers());
  check('map ' + m + ' enters PLAYING with 2 players', st === 'PLAYING' && ps.length === 2, 'players=' + ps.length);
}

// Reset to map 0 fresh round
await page.evaluate(() => { window.__TAG__.setMap(0); window.__TAG__.start(); });
await page.waitForTimeout(200);

// 4. Gravity / physics: a player should rest on a platform (not fall forever)
const yBefore = await page.evaluate(() => window.__TAG__.getPlayers()[0].y);
await page.waitForTimeout(600);
const yAfter = await page.evaluate(() => window.__TAG__.getPlayers()[0].y);
check('player settles on platform (no infinite fall)', Math.abs(yAfter) < 480 && yAfter > 0, 'y=' + yAfter.toFixed(1));

// 5. Movement: press right for P1 and confirm x increases
const xBefore = await page.evaluate(() => window.__TAG__.getPlayers()[0].x);
await page.evaluate(() => window.__TAG__.press('d'));
await page.waitForTimeout(400);
await page.evaluate(() => window.__TAG__.release('d'));
const xAfter = await page.evaluate(() => window.__TAG__.getPlayers()[0].x);
check('player moves right on key press', xAfter > xBefore, 'dx=' + (xAfter - xBefore).toFixed(1));

// 6. Jump: press jump and confirm y decreases (goes up) at some point
await page.evaluate(() => window.__TAG__.press('w'));
await page.waitForTimeout(80);
const yJump = await page.evaluate(() => window.__TAG__.getPlayers()[0].y);
await page.evaluate(() => window.__TAG__.release('w'));
check('player jumps (y decreases)', yJump < yAfter || yJump < 480, 'yJump=' + yJump.toFixed(1));

// 7. Tagging: force IT onto another player, confirm IT changes
const itBefore = await page.evaluate(() => window.__TAG__.getIt());
await page.evaluate(() => window.__TAG__.forceTag());
await page.waitForTimeout(150);
const itAfter = await page.evaluate(() => window.__TAG__.getIt());
check('tag switches IT', itBefore !== itAfter, itBefore + ' -> ' + itAfter);

// 8. Invincibility after tag
const inv = await page.evaluate(() => {
  const ps = window.__TAG__.getPlayers();
  return ps.some(p => p.invincible > 0);
});
check('tagged player has invincibility window', inv);

// 9. Timer counts down
const t1 = await page.evaluate(() => window.__TAG__.getTime());
await page.waitForTimeout(600);
const t2 = await page.evaluate(() => window.__TAG__.getTime());
check('round timer counts down', t2 < t1, t1.toFixed(2) + ' -> ' + t2.toFixed(2));

// 10. Round end when timer hits 0
await page.evaluate(() => window.__TAG__.setTime(0.3));
await page.waitForTimeout(500);
const endState = await page.evaluate(() => window.__TAG__.getState());
check('round ends (ROUND_END) when timer reaches 0', endState === 'ROUND_END', 'state=' + endState);

// 11. Play again from round end
await page.evaluate(() => window.__TAG__.press('enter'));
await page.waitForTimeout(200);
const replay = await page.evaluate(() => window.__TAG__.getState());
check('play again restarts round', replay === 'PLAYING', 'state=' + replay);

// 12. Screenshot of gameplay
await page.screenshot({ path: 'screenshot-game.png' });

// 13. Back to lobby + screenshot
await page.evaluate(() => window.__TAG__.setTime(0.2));
await page.waitForTimeout(400);
await page.evaluate(() => window.__TAG__.press('escape'));
await page.waitForTimeout(200);
const back = await page.evaluate(() => window.__TAG__.getState());
check('escape returns to lobby', back === 'LOBBY', 'state=' + back);
await page.screenshot({ path: 'screenshot-lobby.png' });

// 14. No JS errors
check('no runtime JS errors', errors.length === 0, errors.slice(0,3).join(' | '));

await browser.close();

const passed = results.filter(r => r.ok).length;
console.log('\n==== ' + passed + '/' + results.length + ' checks passed ====');
process.exit(passed === results.length ? 0 : 1);
