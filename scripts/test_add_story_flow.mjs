// Verify the "Add Story" admin flow: a title + description + uploaded .txt
// file produces a normal, read-only story page (paragraphs of real HTML,
// not an embedded/editable Google Doc), and that locally-added stories can
// be deleted again — both from the Admin Panel and with a one-click delete
// button right on the story's own page.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=decodeURIComponent(join(projectDir,req.url==='/'?'/index.html':req.url.split('?')[0]));if(!existsSync(f)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[extname(f).toLowerCase()]||'application/octet-stream'});res.end(readFileSync(f));});
await new Promise(r=>server.listen(8175,r));
const base='http://localhost:8175';
const errors=[]; const pass=m=>console.log(`  ✓ ${m}`); const fail=m=>{console.log(`  ✗ ${m}`);errors.push(m);};

const ADMIN = 'mskhyati17@gmail.com';
const seedAdmin = `(()=>{try{
  var u=JSON.parse(localStorage.getItem('khyati_users')||'{}');
  u['${ADMIN}']={password:'x',metadata:{first_name:'Khyati'}};
  localStorage.setItem('khyati_users',JSON.stringify(u));
  localStorage.setItem('khyati_session','${ADMIN}');
}catch(e){}})()`;

// A story file with an intentional blank-line paragraph break, a literal
// "&" (a real HTML-escaping trap), and a trailing single-line paragraph.
const storyText = `Stubby trotted into camp like he owned the place, tail high, utterly unbothered by the noise & chaos around him.

He'd learned, somewhere along the way, exactly which soldiers kept spare rations in their left pocket.

Nobody ever taught him that. He just paid attention.`;

const tmpDir = mkdtempSync(join(tmpdir(), 'ks-story-'));
const txtPath = join(tmpDir, 'stubby.txt');
writeFileSync(txtPath, storyText, 'utf8');

const browser = await chromium.launch({ headless: true });
try{
  // ---- 1. Add a story via title + description + .txt file -------------
  const ctx = await browser.newContext();
  await ctx.addInitScript(seedAdmin);
  const page = await ctx.newPage();
  const jsErrors = []; page.on('pageerror', e => jsErrors.push(e.message));
  await page.goto(`${base}/stories/index.html`, { waitUntil: 'networkidle', timeout: 15000 });

  await page.waitForSelector('#admin-story-title', { timeout: 10000 });
  pass('admin "Add Story" form renders for a signed-in admin');
  const noSlugField = !(await page.$('#admin-story-slug'));
  const noDocUrlField = !(await page.$('#admin-story-doc-url'));
  (noSlugField && noDocUrlField) ? pass('no slug field or Google Doc URL field — title/description/file only') : fail('old slug/Google-Doc fields are still present');

  await page.fill('#admin-story-title', 'Stubby the Dog');
  await page.fill('#admin-story-excerpt', 'A stray who became a hero.');
  await page.setInputFiles('#admin-story-file', txtPath);
  await page.click('#admin-add-story');
  await page.waitForFunction(() => location.pathname.includes('index.html'), { timeout: 10000 }).catch(()=>{});
  await page.waitForTimeout(500);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_stories_admin') || '[]'));
  const saved = stored.find(s => s.title === 'Stubby the Dog');
  saved ? pass('story saved with title "Stubby the Dog"') : fail('story was not saved to localStorage');
  if(saved){
    !/<iframe/i.test(saved.body) ? pass('body contains no Google Doc iframe embed') : fail('body still embeds an iframe — readers could still land on an editable doc');
    const pCount = (saved.body.match(/<p>/g) || []).length;
    pCount >= 3 ? pass(`text file split into ${pCount} real <p> paragraphs`) : fail(`expected >= 3 paragraphs, got ${pCount}`);
    saved.body.includes('&amp;') ? pass('literal "&" in the story text was safely HTML-escaped') : fail('"&" was not escaped — real HTML-escaping bug');
    saved.body.includes('Stubby trotted into camp') ? pass('actual story text made it into the saved body') : fail('story text missing from saved body');
  }

  // ---- 2. The story renders as a normal, read-only page -----------------
  const slug = saved && saved.slug;
  if(slug){
    await page.goto(`${base}/stories/stories.html?story=${encodeURIComponent(slug)}`, { waitUntil: 'networkidle', timeout: 15000 });
    const h2 = await page.textContent('#story-content h2').catch(()=>null);
    h2 && h2.trim() === 'Stubby the Dog' ? pass('story opens normally in the reader') : fail(`reader did not show the story, got "${h2}"`);
    const hasIframeOnPage = await page.$('#story-content iframe');
    !hasIframeOnPage ? pass('no editable iframe present on the actual page — readers cannot edit it') : fail('an iframe is present on the reader page');
    const bodyText = await page.textContent('#story-content');
    bodyText.includes('utterly unbothered') ? pass('real story paragraphs are visible as normal text') : fail('story paragraphs not visible as text');
  } else {
    fail('no slug available — cannot test the reader page');
  }

  // ---- 3. One-click delete right on the story's own page ---------------
  if(slug){
    const delBtn = await page.$('#story-delete-local');
    delBtn ? pass('admin sees a "Delete this story" button on the story page') : fail('delete button missing on the story page for an admin');
    if(delBtn){
      page.once('dialog', d => d.accept());
      await page.click('#story-delete-local');
      await page.waitForFunction(() => location.pathname.includes('/stories/index.html'), { timeout: 10000 });
      const afterDelete = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_stories_admin') || '[]'));
      !afterDelete.some(s => s.title === 'Stubby the Dog') ? pass('story removed from localStorage after clicking delete') : fail('story still present after delete');
    }
  }

  // ---- 3b. The same deletion is also available from the Admin Panel -----
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('khyati_stories_admin')||'[]');
    list.push({ title:'Stubby the Dog (panel test)', slug:'stubby-panel-test', excerpt:'x', body:'<p>x</p>', created_at:new Date().toISOString() });
    localStorage.setItem('khyati_stories_admin', JSON.stringify(list));
  });
  await page.goto(`${base}/admin/panel.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('#ap-stories', { timeout: 10000 });
  const panelListText = await page.textContent('#ap-stories');
  panelListText.includes('Stubby the Dog (panel test)') ? pass('Admin Panel lists locally-added stories too') : fail('Admin Panel does not list the local story');
  page.once('dialog', d => d.accept());
  await page.click('#ap-stories [data-del]');
  await page.waitForTimeout(300);
  const panelListAfter = await page.textContent('#ap-stories');
  !panelListAfter.includes('Stubby the Dog (panel test)') ? pass('deleting from the Admin Panel also removes it from localStorage') : fail('story still listed after deleting from the Admin Panel');

  // ---- 4. A non-admin visitor never sees the delete button or add form -
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  // No admin session in this context — seed the local story via addInitScript
  // so it's present before the page's own scripts run, same as a real visitor
  // who simply has this story cached locally but isn't signed in as admin.
  await ctx2.addInitScript(() => { try{
    const list = JSON.parse(localStorage.getItem('khyati_stories_admin')||'[]');
    if(!list.some(s=>s.slug==='visible-to-everyone-test')) list.push({ title:'Visible To Everyone', slug:'visible-to-everyone-test', excerpt:'x', body:"<p style='color:#6a4b8f;font-style:italic;margin-bottom:18px'>By Khyati Srivastava</p><p>Hello.</p>", created_at:new Date().toISOString() });
    localStorage.setItem('khyati_stories_admin', JSON.stringify(list));
  }catch(e){} });
  await page2.goto(`${base}/stories/stories.html?story=visible-to-everyone-test`, { waitUntil: 'networkidle', timeout: 15000 });
  const noAdminForm = !(await page2.$('#admin-story-title'));
  const noDeleteBtn = !(await page2.$('#story-delete-local'));
  (noAdminForm && noDeleteBtn) ? pass('a non-admin visitor sees the story normally with no add-form or delete button') : fail('non-admin saw admin-only controls');

  jsErrors.length === 0 ? pass('no JS errors across the whole flow') : fail(`JS errors: ${jsErrors.join(', ')}`);

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
  console.log('✅ ALL Add Story flow tests PASSED!');
  process.exit(0);
}
