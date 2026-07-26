// End-to-end check of the "Explore Together" WebRTC flow on friends/friends.html:
// two separate browser contexts (host + guest) complete the offer/answer
// handshake, exchange a live chat message in both directions, learn each
// other's name via the intro handshake, save each other to a local friends
// list on disconnect, and can reconnect later via that list — recognizing
// each other by name instead of starting over as strangers.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url==='/'?'/index.html':req.url.split('?')[0]));if(!existsSync(f)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8136,r));
const base='http://localhost:8136';
const errors=[]; const pass=m=>console.log(`  ✓ ${m}`); const fail=m=>{console.log(`  ✗ ${m}`);errors.push(m);};

const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

try{
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const hostErrors=[]; host.on('pageerror', e=>hostErrors.push(e.message));
  const guestErrors=[]; guest.on('pageerror', e=>guestErrors.push(e.message));

  await host.goto(`${base}/friends/friends.html`, { waitUntil: 'networkidle', timeout: 15000 });
  const idleVisible = await host.isVisible('#stage-idle');
  idleVisible ? pass('host: idle stage shown on load') : fail('host: idle stage not shown');
  const noFriendsYet = !(await host.isVisible('#stage-friends'));
  noFriendsYet ? pass('host: friends list hidden with no saved friends yet') : fail('friends list should be hidden before any connection ever happened');

  await host.fill('#myNameInput', 'Priya');
  await guest.goto(`${base}/friends/friends.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await guest.fill('#myNameInput', 'Dev');

  await host.click('#startRoomBtn');
  await host.waitForFunction(() => document.getElementById('hostLink').value.length > 20, { timeout: 10000 });
  const link = await host.inputValue('#hostLink');
  link.includes('#offer=') ? pass('host: shareable link generated with offer code') : fail(`host: link missing offer code: ${link}`);

  // Guest auto-joins the moment the link opens — no separate "Join" tap needed.
  await guest.goto(link, { waitUntil: 'networkidle', timeout: 15000 });
  await guest.waitForFunction(() => document.getElementById('answerCode') && document.getElementById('answerCode').value.length > 20, { timeout: 10000 });
  pass('guest: auto-joined on opening the link and generated a reply code, no extra tap');
  const answeringVisible = await guest.isVisible('#stage-answering');
  answeringVisible ? pass('guest: shows the "send this back" stage automatically') : fail('guest: answering stage not shown');
  const answerCode = await guest.inputValue('#answerCode');

  // Pasting/filling the code auto-connects (no separate "Connect" tap needed).
  await host.fill('#answerInput', answerCode);

  await host.waitForSelector('#stage-chat', { state: 'visible', timeout: 15000 });
  pass('host: pasting the reply code alone completed the connection, chat stage shown');
  await guest.waitForSelector('#stage-chat', { state: 'visible', timeout: 15000 });
  pass('guest: connection completed, chat stage shown');

  // Both sides should learn each other's name via the intro handshake.
  await host.waitForFunction(() => document.getElementById('chatTitle').textContent.includes('Dev'), { timeout: 5000 });
  pass('host: chat header shows the guest\'s name ("Dev") via the intro handshake');
  await guest.waitForFunction(() => document.getElementById('chatTitle').textContent.includes('Priya'), { timeout: 5000 });
  pass('guest: chat header shows the host\'s name ("Priya") via the intro handshake');

  await host.fill('#chatInput', 'hi from host!');
  await host.click('#sendBtn');
  await guest.waitForFunction(() => document.getElementById('chatBody').textContent.includes('hi from host!'), { timeout: 10000 });
  pass('guest received message sent by host');

  await guest.fill('#chatInput', 'hi back from guest!');
  await guest.click('#sendBtn');
  await host.waitForFunction(() => document.getElementById('chatBody').textContent.includes('hi back from guest!'), { timeout: 10000 });
  pass('host received message sent by guest');

  hostErrors.length===0 ? pass('host: no JS errors') : fail(`host JS errors: ${hostErrors.join(', ')}`);
  guestErrors.length===0 ? pass('guest: no JS errors') : fail(`guest JS errors: ${guestErrors.join(', ')}`);

  // Disconnect should return host to idle, tear down the connection, and
  // now show the friends list with the guest saved under their real name.
  await host.click('#disconnectBtn');
  await host.waitForSelector('#stage-idle', { state: 'visible', timeout: 5000 });
  pass('host: disconnect returns to idle stage');
  await host.waitForSelector('#stage-friends', { state: 'visible', timeout: 5000 });
  const friendRowText = await host.textContent('#friendsListBody');
  friendRowText.includes('Dev') ? pass('host: friends list now shows "Dev" after disconnecting') : fail(`friends list missing Dev: ${friendRowText}`);

  // The host closing the connection tears down the guest's peer connection
  // too — the guest's own UI should follow it back to idle automatically,
  // no separate disconnect click needed on their end.
  await guest.waitForSelector('#stage-idle', { state: 'visible', timeout: 5000 });
  pass('guest: connection closing on the host\'s end returns the guest to idle automatically');
  await guest.waitForSelector('#stage-friends', { state: 'visible', timeout: 5000 });
  const guestFriendRowText = await guest.textContent('#friendsListBody');
  guestFriendRowText.includes('Priya') ? pass('guest: friends list now shows "Priya" after disconnecting') : fail(`friends list missing Priya: ${guestFriendRowText}`);

  // ---- Reconnect via the friends list -----------------------------------
  await host.click('[data-reconnect]');
  await host.waitForFunction(() => document.getElementById('hostingTitle').textContent.includes('Dev'), { timeout: 5000 });
  pass('host: clicking "Reconnect" on the saved friend labels the flow "Reconnecting with Dev"');
  await host.waitForFunction(() => document.getElementById('hostLink').value.length > 20, { timeout: 10000 });
  const reconnectLink = await host.inputValue('#hostLink');
  reconnectLink.includes('#offer=') && reconnectLink !== link ? pass('host: a fresh link was generated for the reconnect (new handshake, same friend)') : fail('reconnect link looks wrong');

  await guest.goto(reconnectLink, { waitUntil: 'networkidle', timeout: 15000 });
  await guest.waitForFunction(() => document.getElementById('invitedTitle').textContent.includes('Priya'), { timeout: 10000 });
  pass('guest: recognized the reconnect invite as coming from the known friend ("Priya wants to reconnect!")');
  await guest.waitForFunction(() => document.getElementById('answerCode') && document.getElementById('answerCode').value.length > 20, { timeout: 10000 });
  const reconnectAnswerCode = await guest.inputValue('#answerCode');

  await host.fill('#answerInput', reconnectAnswerCode);
  await host.waitForSelector('#stage-chat', { state: 'visible', timeout: 15000 });
  await guest.waitForSelector('#stage-chat', { state: 'visible', timeout: 15000 });
  pass('reconnect handshake completed on both sides using the friends-list shortcut');

  await guest.fill('#chatInput', 'good to chat again!');
  await guest.click('#sendBtn');
  await host.waitForFunction(() => document.getElementById('chatBody').textContent.includes('good to chat again!'), { timeout: 10000 });
  pass('messages flow correctly after reconnecting');

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
  console.log('✅ ALL Explore Together tests PASSED!');
  process.exit(0);
}
