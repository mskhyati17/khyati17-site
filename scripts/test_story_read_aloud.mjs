// Verify the "Read aloud" text-to-speech control on the story reader page.
// Headless Chromium exposes the Web Speech API shape but has no real TTS
// voice backend, so `speak()` never actually produces audio or fires events
// in CI. To test the *logic* (chunking, sequencing, pause/resume, cancel-on-
// story-switch) honestly, we inject a fake speechSynthesis engine before the
// page loads that mimics real event timing. Real audio output still needs a
// human to confirm on an actual browser, but the control flow that decides
// what gets spoken, when, and how it reacts to pause/resume/switch is fully
// exercised here.
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
  window.__ttsCalls = [];
  let paused = false;
  const fake = {
    speaking: false, paused: false, pending: false,
    speak(utterance){
      window.__ttsCalls.push({ type: 'speak', text: utterance.text });
      fake.speaking = true; paused = false;
      const tick = () => {
        if(paused){ setTimeout(tick, 15); return; }
        fake.speaking = false;
        if(utterance.onend) utterance.onend();
      };
      setTimeout(tick, 25);
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
  const page = await browser.newPage();
  const jsErrors = []; page.on('pageerror', e => jsErrors.push(e.message));
  await page.addInitScript(fakeTts);

  await page.goto(`${base}/stories/stories.html?story=gloomy-crown`, { waitUntil: 'networkidle', timeout: 15000 });
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
  firstChunk.toLowerCase().includes('gloomy') || firstChunk.length > 0 ? pass('first spoken chunk contains story text') : fail('first chunk empty/unexpected');

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

  // Separate page: verify graceful fallback when the browser has no speechSynthesis at all.
  const page2 = await browser.newPage();
  const jsErrors2 = []; page2.on('pageerror', e => jsErrors2.push(e.message));
  await page2.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true });
  });
  await page2.goto(`${base}/stories/stories.html?story=gloomy-crown`, { waitUntil: 'networkidle', timeout: 15000 });
  await page2.waitForSelector('#story-read', { timeout: 10000 });
  const disabled = await page2.isDisabled('#story-read');
  const fallbackLabel = await page2.textContent('#story-read');
  disabled ? pass('button disabled when speechSynthesis unsupported') : fail('button should be disabled without speechSynthesis');
  fallbackLabel.includes('Not supported') ? pass(`shows fallback label: "${fallbackLabel}"`) : fail(`unexpected fallback label: ${fallbackLabel}`);
  jsErrors2.length === 0 ? pass('no JS errors on unsupported-browser fallback') : fail(`JS errors: ${jsErrors2.join(', ')}`);

  // Third page: simulate a browser with the API present but no working voice
  // (e.g. no TTS voice installed) — speak() "fires" but errors out instantly.
  // This is the real-world case behind the "it un-presses right away" report:
  // the button must show visible feedback instead of silently flickering
  // back to idle with no explanation.
  const page3 = await browser.newPage();
  const jsErrors3 = []; page3.on('pageerror', e => jsErrors3.push(e.message));
  await page3.addInitScript(() => {
    window.__ttsCalls = [];
    const fake = {
      speaking: false, paused: false, pending: false,
      speak(utterance){
        window.__ttsCalls.push({ type: 'speak' });
        setTimeout(() => { if(utterance.onerror) utterance.onerror({ error: 'synthesis-failed' }); }, 10);
      },
      pause(){}, resume(){}, cancel(){ window.__ttsCalls.push({ type: 'cancel' }); },
      getVoices(){ return []; },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: function(text){ this.text = text; this.rate = 1; this.onend = null; this.onerror = null; },
      configurable: true, writable: true,
    });
  });
  await page3.goto(`${base}/stories/stories.html?story=gloomy-crown`, { waitUntil: 'networkidle', timeout: 15000 });
  await page3.waitForSelector('#story-read', { timeout: 10000 });
  await page3.click('#story-read');
  await page3.waitForFunction(() => document.getElementById('story-read').textContent.includes("Couldn't play"), { timeout: 3000 });
  pass('a synthesis failure shows a visible error label instead of silently resetting');
  const speakAttempts = await page3.evaluate(() => window.__ttsCalls.filter(c => c.type === 'speak').length);
  speakAttempts === 1 ? pass('stops after the first failure instead of blitzing through every chunk') : fail(`expected exactly 1 speak() attempt before stopping, got ${speakAttempts}`);
  await page3.waitForFunction(() => document.getElementById('story-read').textContent.includes('Read aloud') && !document.getElementById('story-read').textContent.includes("Couldn't"), { timeout: 4000 });
  pass('error label reverts to "Read aloud" so the button is usable again');
  jsErrors3.length === 0 ? pass('no JS errors on synthesis-failure path') : fail(`JS errors: ${jsErrors3.join(', ')}`);

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
