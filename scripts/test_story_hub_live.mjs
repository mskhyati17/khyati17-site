// Diagnostic: run the LIVE Story Hub (https://khyati17.com) in a real browser,
// capture console + page errors, and test both the empty-data case (fresh
// visitor) and the seeded-data case (admin who added stories), including the
// card click-through into the reader.
import { chromium } from 'playwright';

const BASE = 'https://khyati17.com';
const SEED = [
  { title:'The Glass Forest', slug:'the-glass-forest', excerpt:'A traveler wanders into a wood of mirrors.', body:'<p>Once upon a time…</p>', created_at:'2026-06-10T00:00:00Z' },
];

async function load(page, url){
  const consoleErrs = [], pageErrs = [];
  page.on('console', m => { if(m.type()==='error') consoleErrs.push(m.text()); });
  page.on('pageerror', e => pageErrs.push(e.message));
  await page.goto(url, { waitUntil:'networkidle', timeout:30000 });
  await page.waitForTimeout(1200); // async loadStories + admin import
  return { consoleErrs, pageErrs };
}

async function run(){
  const browser = await chromium.launch({ headless:true });
  try{
    // ---------- A: fresh visitor, no localStorage ----------
    console.log('\n[A] Fresh visitor (no stories in localStorage)');
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const { consoleErrs, pageErrs } = await load(page, `${BASE}/stories/index.html`);
      const cards = await page.$$('#grid .card');
      const emptyText = (await page.textContent('#grid .empty').catch(()=>null))?.trim();
      console.log(`  cards: ${cards.length}`);
      console.log(`  empty-state: ${emptyText ? JSON.stringify(emptyText) : '(none)'}`);
      console.log(`  pageErrors: ${pageErrs.length ? pageErrs.join(' | ') : 'none'}`);
      console.log(`  consoleErrors: ${consoleErrs.length ? consoleErrs.join(' | ') : 'none'}`);
      await ctx.close();
    }

    // ---------- B: admin with a seeded story ----------
    console.log('\n[B] Visitor WITH a story in localStorage');
    {
      const ctx = await browser.newContext();
      await ctx.addInitScript(seed => { try{ localStorage.setItem('khyati_stories_admin', seed); }catch(e){} }, JSON.stringify(SEED));
      const page = await ctx.newPage();
      const { consoleErrs, pageErrs } = await load(page, `${BASE}/stories/index.html`);
      const cards = await page.$$('#grid .card');
      console.log(`  cards: ${cards.length}`);
      console.log(`  pageErrors: ${pageErrs.length ? pageErrs.join(' | ') : 'none'}`);
      console.log(`  consoleErrors: ${consoleErrs.length ? consoleErrs.join(' | ') : 'none'}`);
      if(cards.length){
        await cards[0].click();
        await page.waitForURL(/stories\.html\?story=/, { timeout:15000 }).catch(()=>{});
        console.log(`  after click -> ${page.url().replace(BASE,'')}`);
        await page.waitForTimeout(1200);
        const t = (await page.textContent('#story-content h2').catch(()=>null))?.trim();
        console.log(`  reader shows: ${t ? JSON.stringify(t) : '(nothing)'}`);
      } else {
        console.log('  !! no cards to click — hub did not render the seeded story');
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}
run().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
