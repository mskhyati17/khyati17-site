// Verify the "Read aloud" text-to-speech control on the story reader page,
// including the automatic backup voice (meSpeak.js, loaded from a CDN) that
// kicks in when the native browser/OS voice doesn't actually work.
//
// Headless Chromium exposes the Web Speech API shape but has no real TTS
// voice backend, so native `speak()` never actually produces audio or fires
// events in CI. To test the *native-path logic* (chunking, pause/resume,
// cancel-on-switch) honestly, we inject a fake speechSynthesis engine that
// mimics real event timing. To test the *backup-voice path*, we let it hit
// the real CDN — that's a genuine integration, not something worth faking.
// All fallback-triggering scenarios share one browser context so the ~3MB
// library only downloads once (subsequent navigations hit HTTP cache).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url==='/'?'/index.html':req.url.split('?')[0]));if(!existsSync(f)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8138,r));
const base='http://localhost:8138';
const errors=[]; const pass=m=>console.log(`  ✓ ${m}`); const fail=m=>{console.log(`  ✗ ${m}`);errors.push(m);};

const fakeTts = () => {
  // window.speechSynthesis is a getter-only IDL attribute in real Chromium,
  // so a plain `window.speechSynthesis = ...` silently no-ops. Use
  // defineProperty to actually replace it with our fake engine.
  // The production code rejects any chunk that "finishes" faster than a real
  // voice plausibly could, so this fake must take a proportional amount of
  // (fake) time per chunk too — a flat short delay would itself get flagged.
  window.__ttsCalls = [];
  let paused = false;
  const fake = {
    speaking: false, paused: false, pending: false,
    speak(utterance){
      window.__ttsCalls.push({ type: 'speak', text: utterance.text });
      fake.speaking = true; paused = false;
      const duration = Math.max(350, utterance.text.length * 10); // safely above the 8ms/char production floor
      const tick = () => {
        if(paused){ setTimeout(tick, 15); return; }
        fake.speaking = false;
        if(utterance.onend) utterance.onend();
      };
      setTimeout(tick, duration);
    },
    pause(){ window.__ttsCalls.push({ type: 'pause' }); paused = true; fake.paused = true; },
    resume(){ window.__ttsCalls.push({ type: 'resume' }); paused = false; fake.paused = false; },
    cancel(){ window.__ttsCalls.push({ type: 'cancel' }); paused = false; fake.speaking = false; },
    getVoices(){ return []; },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: function(text){ this.text = text; this.rate = 1; this.pitch = 1; this.onend = null; this.onerror = null; },
    configurable: true, writable: true,
  });
};

const browser = await chromium.launch({ headless: true });
try{
  // ---- Test 1: native engine present and working (fake) ----------------
  const page = await browser.newPage();
  const jsErrors = []; page.on('pageerror', e => jsErrors.push(e.message));
  await page.addInitScript(fakeTts);

  // A short story (5 chunks) keeps the "let it finish" step fast even though
  // the fake engine's per-chunk timing must stay above the production
  // plausibility floor (see fakeTts above).
  await page.goto(`${base}/stories/stories.html?story=the-weather-of-growing-older`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#story-read', { timeout: 10000 });
  pass('Read aloud button rendered');

  const initialLabel = await page.textContent('#story-read');
  initialLabel.includes('Read aloud') ? pass('starts in idle "Read aloud" state') : fail(`unexpected initial label: ${initialLabel}`);

  await page.click('#story-read');
  await page.waitForFunction(() => document.getElementById('story-read').textContent.includes('Pause'), { timeout: 3000 });
  pass('clicking starts speech and label switches to Pause');

  const callsAfterStart = await page.evaluate(() => window.__ttsCalls.filter(c => c.type === 'speak').length);
  callsAfterStart > 0 ? pass(`speak() invoked (${callsAfterStart} chunk(s) queued so far)`) : fail('speak() was never called');

  const firstChunk = await page.evaluate(() => window.__ttsCalls.find(c => c.type === 'speak').text);
  firstChunk.length > 0 ? pass('first spoken chunk contains story text') : fail('first chunk empty/unexpected');

  await page.click('#story-read'); // pause
  await page.waitForFunction(() => document.getElementById('story-read').textContent.includes('Resume'), { timeout: 3000 });
  pass('second click pauses, label switches to Resume');
  const pausedCalled = await page.evaluate(() => window.__ttsCalls.some(c => c.type === 'pause'));
  pausedCalled ? pass('speechSynthesis.pause() was called') : fail('pause() was never called');

  await page.click('#story-read'); // resume
  await page.waitForFunction(() => document.getElementById('story-read').textContent.includes('Pause'), { timeout: 3000 });
  pass('third click resumes, label switches back to Pause');
  const resumedCalled = await page.evaluate(() => window.__ttsCalls.some(c => c.type === 'resume'));
  resumedCalled ? pass('speechSynthesis.resume() was called') : fail('resume() was never called');

  // Let the fake engine run the whole queue to completion.
  await page.waitForFunction(() => document.getElementById('story-read').textContent.includes('Read aloud'), { timeout: 15000 });
  pass('label returns to "Read aloud" once the whole story has been read');
  const totalChunks = await page.evaluate(() => window.__ttsCalls.filter(c => c.type === 'speak').length);
  totalChunks > 1 ? pass(`long story was split into ${totalChunks} chunks (chaining works)`) : fail(`expected multiple chunks, got ${totalChunks}`);

  // Start again, then switch stories mid-speech — must cancel the old speech.
  await page.click('#story-read');
  await page.waitForFunction(() => document.getElementById('story-read').textContent.includes('Pause'), { timeout: 3000 });
  await page.evaluate(() => window.__ttsCalls.length = 0);
  await page.click('#story-another');
  await page.waitForTimeout(200);
  const cancelledOnSwitch = await page.evaluate(() => window.__ttsCalls.some(c => c.type === 'cancel'));
  cancelledOnSwitch ? pass('switching to another story cancels the in-progress speech') : fail('speech was not cancelled on story switch');
  const newLabel = await page.textContent('#story-read');
  newLabel.includes('Read aloud') ? pass('new story\'s button resets to idle "Read aloud"') : fail(`new story button label wrong: ${newLabel}`);

  jsErrors.length === 0 ? pass('no JS errors') : fail(`JS errors: ${jsErrors.join(', ')}`);

  // ---- Tests 2-4: backup voice, real CDN, shared context for cache -----
  const ctx = await browser.newContext();

  // Test 2: native completely absent — this is the main end-to-end proof
  // that the real backup voice actually loads and engages.
  const pageA = await ctx.newPage();
  const jsErrorsA = []; pageA.on('pageerror', e => jsErrorsA.push(e.message));
  await pageA.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true });
  });
  await pageA.goto(`${base}/stories/stories.html?story=the-weather-of-growing-older`, { waitUntil: 'networkidle', timeout: 15000 });
  await pageA.waitForSelector('#story-read', { timeout: 10000 });
  const disabledA = await pageA.isDisabled('#story-read');
  !disabledA ? pass('button stays enabled with no native voice at all (backup voice can still read)') : fail('button should not be disabled — backup voice should cover this case');

  await pageA.click('#story-read');
  await pageA.waitForFunction(() => document.getElementById('story-read').textContent.includes('Pause reading (backup voice)'), { timeout: 30000 });
  pass('backup voice engages and starts reading (real meSpeak.js load + speak over the network)');
  const meSpeakLoaded = await pageA.evaluate(() => typeof window.meSpeak !== 'undefined');
  meSpeakLoaded ? pass('meSpeak.js actually loaded into the page') : fail('window.meSpeak never appeared');
  jsErrorsA.length === 0 ? pass('no JS errors using the backup voice') : fail(`JS errors: ${jsErrorsA.join(', ')}`);

  // Test 3: native fires a genuine error — should recover via the backup voice too.
  const pageB = await ctx.newPage();
  const jsErrorsB = []; pageB.on('pageerror', e => jsErrorsB.push(e.message));
  await pageB.addInitScript(() => {
    window.__ttsCalls = [];
    const fake = {
      speaking: false, paused: false, pending: false,
      speak(utterance){ window.__ttsCalls.push({ type: 'speak' }); setTimeout(() => { if(utterance.onerror) utterance.onerror({ error: 'synthesis-failed' }); }, 10); },
      pause(){}, resume(){}, cancel(){}, getVoices(){ return []; },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function(text){ this.text = text; this.onend = null; this.onerror = null; }, configurable: true, writable: true });
  });
  await pageB.goto(`${base}/stories/stories.html?story=gloomy-crown`, { waitUntil: 'networkidle', timeout: 15000 });
  await pageB.waitForSelector('#story-read', { timeout: 10000 });
  await pageB.click('#story-read');
  await pageB.waitForFunction(() => document.getElementById('story-read').textContent.includes('Pause reading (backup voice)'), { timeout: 30000 });
  pass('a native synthesis error also recovers via the backup voice instead of just failing');
  jsErrorsB.length === 0 ? pass('no JS errors on the native-error-then-backup path') : fail(`JS errors: ${jsErrorsB.join(', ')}`);

  // Test 4: native "ends" suspiciously fast (the original reported bug) — same recovery.
  const pageC = await ctx.newPage();
  const jsErrorsC = []; pageC.on('pageerror', e => jsErrorsC.push(e.message));
  await pageC.addInitScript(() => {
    window.__ttsCalls = [];
    const fake = {
      speaking: false, paused: false, pending: false,
      speak(utterance){ window.__ttsCalls.push({ type: 'speak' }); setTimeout(() => { if(utterance.onend) utterance.onend(); }, 2); },
      pause(){}, resume(){}, cancel(){}, getVoices(){ return []; },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function(text){ this.text = text; this.onend = null; this.onerror = null; }, configurable: true, writable: true });
  });
  await pageC.goto(`${base}/stories/stories.html?story=gloomy-crown`, { waitUntil: 'networkidle', timeout: 15000 });
  await pageC.waitForSelector('#story-read', { timeout: 10000 });
  await pageC.click('#story-read');
  await pageC.waitForFunction(() => document.getElementById('story-read').textContent.includes('Pause reading (backup voice)'), { timeout: 30000 });
  pass('the original "instant end, no voice" bug now also recovers via the backup voice');
  jsErrorsC.length === 0 ? pass('no JS errors on the instant-end-then-backup path') : fail(`JS errors: ${jsErrorsC.join(', ')}`);

  // ---- Test 5: genuine total failure (native broken AND backup blocked) ----
  const pageD = await ctx.newPage();
  const jsErrorsD = []; pageD.on('pageerror', e => jsErrorsD.push(e.message));
  await pageD.route('https://cdn.jsdelivr.net/npm/mespeak**', route => route.abort());
  await pageD.addInitScript(() => {
    const fake = {
      speaking: false, paused: false, pending: false,
      speak(utterance){ setTimeout(() => { if(utterance.onend) utterance.onend(); }, 2); },
      pause(){}, resume(){}, cancel(){}, getVoices(){ return []; },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function(text){ this.text = text; this.onend = null; this.onerror = null; }, configurable: true, writable: true });
  });
  await pageD.goto(`${base}/stories/stories.html?story=gloomy-crown`, { waitUntil: 'networkidle', timeout: 15000 });
  await pageD.waitForSelector('#story-read', { timeout: 10000 });
  await pageD.click('#story-read');
  await pageD.waitForFunction(() => document.getElementById('story-read').textContent.includes('No voice found'), { timeout: 15000 });
  pass('when both native AND the backup voice fail, shows the final "No voice found" message');
  const helpVisibleD = await pageD.isVisible('#read-aloud-help');
  helpVisibleD ? pass('help panel with OS fix instructions appears on total failure') : fail('help panel did not appear');
  jsErrorsD.length === 0 ? pass('no JS errors on the total-failure path') : fail(`JS errors: ${jsErrorsD.join(', ')}`);

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
  console.log('✅ ALL Read Aloud tests PASSED!');
  process.exit(0);
}
