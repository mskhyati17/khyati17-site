import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');
const MIME_TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  let filePath = join(projectDir, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(filePath) || extname(filePath) === '') {
    if (existsSync(filePath + '/index.html')) filePath = filePath + '/index.html';
    else { res.writeHead(404); res.end(); return; }
  }
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});
await new Promise(r => server.listen(8225, r));

const errors = [];
const pass = m => console.log('  ✓ ' + m);
const fail = m => { console.log('  ✗ ' + m); errors.push(m); };

const browser = await chromium.launch();

console.log('\n[1] Non-admin is gated out');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await ctx.addInitScript(() => { localStorage.setItem('khyati_session', 'randomkid@example.com'); });
  await page.goto('http://localhost:8225/admin/panel.html', { waitUntil: 'networkidle' });
  const gateVisible = await page.isVisible('#ap-gate');
  const contentVisible = await page.isVisible('#ap-content');
  gateVisible && !contentVisible ? pass('non-admin sees the gate, not the panel') : fail('non-admin gate broken');
  const msg = await page.textContent('#ap-gate-msg');
  msg.includes('randomkid@example.com') ? pass('gate message shows the signed-in non-admin email') : fail('gate message wrong: ' + msg);
  await ctx.close();
}

console.log('\n[2] Admin sees full panel with seeded users/comments/stories');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await ctx.addInitScript(() => {
    localStorage.setItem('khyati_session', 'mskhyati17@gmail.com');
    localStorage.setItem('khyati_users', JSON.stringify({
      'friend1@example.com': { level: 'user' },
      'friend2@example.com': { level: 'user', tradeAccess: true, tradeUntil: Date.now() + 1000*60*60*24*30 },
    }));
    localStorage.setItem('khyati_comments', JSON.stringify([
      { display_name: 'Friend1', content_type: 'story', content_id: 'test-slug', body: 'great story!' },
    ]));
    localStorage.setItem('khyati_stories_admin', JSON.stringify([
      { title: 'My Local Test Story', excerpt: 'a test excerpt', slug: 'my-local-test-story' },
    ]));
  });
  await page.goto('http://localhost:8225/admin/panel.html', { waitUntil: 'networkidle' });
  const contentVisible = await page.isVisible('#ap-content');
  contentVisible ? pass('admin sees the panel content') : fail('admin panel content not shown');

  // auth.js pre-seeds the 2 admin accounts into khyati_users on every load,
  // so 2 seeded test users + 2 pre-seeded admins = 4 total.
  const userCount = await page.textContent('#ap-count');
  userCount.includes('4') ? pass('4 users listed (2 seeded + 2 pre-seeded admins): ' + userCount) : fail('user count wrong: ' + userCount);

  const commentCount = await page.textContent('#ap-ccount');
  commentCount.includes('1') ? pass('1 seeded comment listed: ' + commentCount) : fail('comment count wrong: ' + commentCount);

  const storyCount = await page.textContent('#ap-scount');
  storyCount.includes('1') ? pass('1 seeded local story listed: ' + storyCount) : fail('story count wrong: ' + storyCount);

  console.log('\n[3] Grant trading access to friend1');
  const rows = await page.$$('.ap-user');
  let granted = false;
  for (const row of rows) {
    const email = await row.$eval('.ap-uemail', e => e.textContent);
    if (email.includes('friend1@example.com')) {
      const grantBtn = await row.$('[data-act="grant"]');
      if (grantBtn) { await grantBtn.click(); granted = true; }
      break;
    }
  }
  await page.waitForTimeout(200);
  granted ? pass('clicked grant on friend1') : fail('could not find grant button for friend1');
  const usersAfterGrant = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_users')));
  usersAfterGrant['friend1@example.com'].tradeAccess === true ? pass('friend1 tradeAccess now true in storage') : fail('grant did not persist');

  console.log('\n[4] Revoke trading access from friend2');
  const rows2 = await page.$$('.ap-user');
  let revoked = false;
  for (const row of rows2) {
    const email = await row.$eval('.ap-uemail', e => e.textContent);
    if (email.includes('friend2@example.com')) {
      const revokeBtn = await row.$('[data-act="revoke"]');
      if (revokeBtn) { await revokeBtn.click(); revoked = true; }
      break;
    }
  }
  await page.waitForTimeout(200);
  revoked ? pass('clicked revoke on friend2') : fail('could not find revoke button for friend2');
  const usersAfterRevoke = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_users')));
  usersAfterRevoke['friend2@example.com'].tradeAccess === false ? pass('friend2 tradeAccess now false in storage') : fail('revoke did not persist');

  console.log('\n[5] Promote friend1 to admin level');
  const rows3 = await page.$$('.ap-user');
  for (const row of rows3) {
    const email = await row.$eval('.ap-uemail', e => e.textContent);
    if (email.includes('friend1@example.com')) {
      const sel = await row.$('[data-act="level"]');
      await sel.selectOption('admin');
      break;
    }
  }
  await page.waitForTimeout(200);
  const usersAfterLevel = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_users')));
  usersAfterLevel['friend1@example.com'].level === 'admin' ? pass('friend1 level now admin in storage') : fail('level change did not persist');

  page.on('dialog', d => d.accept());

  console.log('\n[6] Delete a comment');
  await page.click('#ap-comments [data-del]');
  await page.waitForTimeout(200);
  const commentsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_comments') || '[]'));
  commentsAfter.length === 0 ? pass('comment deleted from storage') : fail('comment delete did not persist');

  console.log('\n[7] Delete the local story');
  const storyDelBtn = await page.$('#ap-stories [data-del]');
  if (storyDelBtn) { await storyDelBtn.click(); await page.waitForTimeout(200); }
  const storiesAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_stories_admin') || '[]'));
  storiesAfter.length === 0 ? pass('local story deleted from storage') : fail('local story delete did not persist');

  console.log('\n[8] Set a new password for friend2');
  const rows4 = await page.$$('.ap-user');
  let pwSet = false;
  for (const row of rows4) {
    const email = await row.$eval('.ap-uemail', e => e.textContent);
    if (email.includes('friend2@example.com')) {
      const pwInput = await row.$('[data-pw]');
      await pwInput.fill('newpass123');
      await row.$('[data-act="setpw"]').then(b => b.click());
      pwSet = true;
      break;
    }
  }
  await page.waitForTimeout(200);
  const usersAfterPw = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_users')));
  pwSet && usersAfterPw['friend2@example.com'].password === 'newpass123' ? pass('friend2 password updated in storage') : fail('setpw did not persist');

  console.log('\n[9] Delete friend2 entirely');
  const rows5 = await page.$$('.ap-user');
  let deleted = false;
  for (const row of rows5) {
    const email = await row.$eval('.ap-uemail', e => e.textContent);
    if (email.includes('friend2@example.com')) {
      await row.$('[data-act="del"]').then(b => b.click());
      deleted = true;
      break;
    }
  }
  await page.waitForTimeout(200);
  const usersAfterDel = await page.evaluate(() => JSON.parse(localStorage.getItem('khyati_users')));
  deleted && !usersAfterDel['friend2@example.com'] ? pass('friend2 removed from storage entirely') : fail('delete user did not persist');

  await ctx.close();
}

console.log('\n' + '='.repeat(50));
console.log(errors.length === 0 ? '✅ ALL ADMIN PANEL CHECKS PASSED' : `❌ ${errors.length} check(s) failed`);
await browser.close();
server.close();
process.exit(errors.length === 0 ? 0 : 1);
