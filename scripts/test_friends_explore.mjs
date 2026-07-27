// End-to-end check of the zero-setup "Explore Together" WebRTC flow on
// friends/friends.html: two separate browser contexts (host + guest) must
// actually complete the offer/answer handshake and exchange a live chat
// message in both directions, with nothing but the page's own UI.
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

  await host.click('#startRoomBtn');
  await host.waitForFunction(() => document.getElementById('hostLink').value.length > 20, { timeout: 10000 });
  const link = await host.inputValue('#hostLink');
  link.includes('#offer=') ? pass('host: shareable link generated with offer code') : fail(`host: link missing offer code: ${link}`);

  await guest.goto(link, { waitUntil: 'networkidle', timeout: 15000 });
  const invitedVisible = await guest.isVisible('#stage-invited');
  invitedVisible ? pass('guest: invited stage shown from shared link') : fail('guest: invited stage not shown');

  await guest.click('#joinRoomBtn');
  await guest.waitForFunction(() => document.getElementById('answerCode').value.length > 20, { timeout: 10000 });
  const answerCode = await guest.inputValue('#answerCode');
  answerCode.length > 20 ? pass('guest: reply code generated') : fail('guest: reply code empty');

  await host.fill('#answerInput', answerCode);
  await host.click('#connectBtn');

  await host.waitForSelector('#stage-chat', { state: 'visible', timeout: 15000 });
  pass('host: connection completed, chat stage shown');
  await guest.waitForSelector('#stage-chat', { state: 'visible', timeout: 15000 });
  pass('guest: connection completed, chat stage shown');

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

  // Disconnect should return host to idle and tear down the connection.
  await host.click('#disconnectBtn');
  await host.waitForSelector('#stage-idle', { state: 'visible', timeout: 5000 });
  pass('host: disconnect returns to idle stage');

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
