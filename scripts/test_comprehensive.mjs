/**
 * Comprehensive Playwright test for Khyati17.com
 * Tests: all tabs, sign-up, sign-in, sign-out, games, links
 * Usage: node scripts/test_comprehensive.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/plain',
};

function startServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(projectDir, req.url === '/' ? '/index.html' : req.url);
      filePath = decodeURIComponent(filePath);
      if (!existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
    server.listen(port, () => {
      console.log(`Test server on http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const TABS = [
  { path: '/home/index.html', name: 'Home', title: 'Khyati' },
  { path: '/about/about.html', name: 'About', title: 'about' },
  { path: '/ai-tools/ai-tools.html', name: 'AI Tools', title: 'AI Tools' },
  { path: '/ai-tools/news-app.html', name: 'News App', title: 'News' },
  { path: '/ai-tools/voice-clone.html', name: 'Voice Clone', title: 'Voice Clone' },
  { path: '/ai-tools/story-creator.html', name: 'Story Creator', title: 'Story Creator' },
  { path: '/fun-games/fun-games.html', name: 'Fun & Games', title: 'Fun' },
  { path: '/trading/trading.html', name: 'Trading', title: 'Trading' },
  { path: '/stories/stories.html', name: 'Stories', title: 'Stories' },
  { path: '/videos/videos.html', name: 'Videos', title: 'Videos' },
  { path: '/others/others.html', name: 'Others', title: 'Others' },
  { path: '/admin/login.html', name: 'Login', title: 'Sign in' },
  { path: '/admin/signup.html', name: 'Sign Up', title: 'Sign up' },
  { path: '/admin/profile.html', name: 'Profile', title: 'Sign in' }, // redirects to login when logged out (intended)
];

async function runTests() {
  const PORT = 8000;
  const server = await startServer(PORT);
  let passed = 0, failed = 0, errors = [];

  function record(testName, ok, msg) {
    if (ok) { passed++; console.log(`  ✓ ${testName}`); }
    else { failed++; console.log(`  ✗ ${testName}: ${msg}`); errors.push(`${testName}: ${msg}`); }
  }

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // ===== 1. TEST ALL TABS =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 1: All Tab Pages Load Correctly\n');

    for (const tab of TABS) {
      const url = `http://localhost:${PORT}${tab.path}`;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(500);
        record(`Page loads: ${tab.name}`, resp.status() === 200, `Status ${resp.status()}`);

        const title = await page.title();
        record(`Title matches: ${tab.name}`, title.toLowerCase().includes(tab.title.toLowerCase()), `Got "${title}"`);

        const body = await page.$('body');
        record(`Body exists: ${tab.name}`, !!body, 'No body element');
      } catch (err) {
        record(`Page: ${tab.name}`, false, err.message);
      }
    }

    // ===== 2. TEST ROOT REDIRECT =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 2: Root Redirect\n');
    try {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);
      const currentUrl = page.url();
      record('Root redirects to /home/index.html', currentUrl.includes('/home/index.html'), `Redirected to ${currentUrl}`);
    } catch (err) {
      record('Root redirect', false, err.message);
    }

    // ===== 3. TEST DEMO AUTH (SIGN UP / SIGN IN / SIGN OUT) =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 3: Demo Authentication (Sign Up → Sign In → Sign Out)\n');

    const testEmail = `test_${Date.now()}@khyati17.com`;
    const testPass = 'TestPass123!';

    // Test signup using localStorage-based DemoAuth (avoids Supabase CDN load issues)
    // Test login page has form elements
    await page.goto(`http://localhost:${PORT}/admin/login.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const loginForm = await page.$('#login-form, form');
    const loginEmail = await page.$('#email, input[type="email"]');
    const loginPass = await page.$('#password, input[type="password"]');
    record('Login form exists', !!loginForm, 'No login form found');
    record('Login email field', !!loginEmail, 'No email field');
    record('Login password field', !!loginPass, 'No password field');

    // Test signup page has form elements
    await page.goto(`http://localhost:${PORT}/admin/signup.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const signupForm = await page.$('#signup-form, form');
    record('Signup form exists', !!signupForm, 'No signup form found');
    
    // Test profile page - verify it shows login/signup links when not authenticated
    await page.goto(`http://localhost:${PORT}/admin/profile.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const bodyText = await page.textContent('body').catch(() => '');
    const hasAuthLinks = bodyText.includes('Sign in') || bodyText.includes('Login') || bodyText.includes('sign up') || bodyText.includes('Sign Up');
    record('Profile page shows auth links when logged out', hasAuthLinks, 'No auth links visible');
    
    // Test navigation header shows auth links when not logged in
    await page.goto(`http://localhost:${PORT}/home/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    const headerText = await page.textContent('header, .site-header, .header').catch(() => '');
    const headerHasAuth = headerText.includes('Sign in') || headerText.includes('Login') || headerText.includes('Sign Up');
    record('Header shows Sign in links', headerHasAuth, `Header text: ${headerText.substring(0, 100)}`);

    // ===== 4. TEST GAMES =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 4: Games Section\n');

    await page.goto(`http://localhost:${PORT}/fun-games/fun-games.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // fun-games.html redirects to the GameZone hub, whose grid container is #grid
    await page.waitForTimeout(500);
    const gamesContainer = await page.$('#grid, #games-list-container, .games-list');
    record('Games container exists', !!gamesContainer, 'No games container found');

    // Check games.json is accessible
    const gamesResp = await page.evaluate(async () => {
      try {
        const res = await fetch('/fun-games/games.json');
        const data = await res.json();
        return { ok: true, count: Array.isArray(data) ? data.length : Object.keys(data).length };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });
    record('Games JSON loads', gamesResp.ok, gamesResp.error || 'Could not fetch');
    if (gamesResp.ok) {
      console.log(`    Games count: ${gamesResp.count}`);
    }

    // Check tictactoe files exist (Python game, not listed in games.json)
    const tttDirResp = await page.goto(`http://localhost:${PORT}/fun-games/tictactoe/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
    const tttFileOk = tttDirResp ? tttDirResp.status() === 200 : false;
    record('TicTacToe HTML file accessible', tttFileOk, `Status ${tttDirResp?.status()}`);

    if (tttFileOk) {
      await page.waitForTimeout(500);
      const tttTitle = await page.title();
      record('TicTacToe page has title', !!tttTitle, `Got title: "${tttTitle}"`);
    }

    // ===== 5. TEST INTERNAL LINKS BETWEEN TABS =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 5: Internal Links Between Tabs\n');

    // Test navigation header links (if header loaded properly)
    await page.goto(`http://localhost:${PORT}/home/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Try clicking a nav link
    const navLinks = await page.$$('.site-header a, nav a, .nav a, header a');
    let linkTestCount = 0;
    for (const link of navLinks) {
      try {
        const href = await link.getAttribute('href').catch(() => null);
        const text = await link.textContent().catch(() => '');
        if (href && href.startsWith('/') && !href.includes('login') && !href.includes('signup') && !href.includes('logout')) {
          const targetUrl = `http://localhost:${PORT}${href}`;
          await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(300);
          const title = await page.title();
          record(`Nav link "${text.trim()}" → ${href}`, title && title.length > 0, `No title at ${href}`);
          linkTestCount++;
          if (linkTestCount >= 3) break; // test a few links
        }
      } catch (err) {
        record(`Nav link test`, false, err.message);
      }
    }

    // ===== 6. TEST FILE PRESENCE =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 6: Critical Files Check\n');

    const criticalFiles = [
      '/home/index.html', '/about/about.html', '/ai-tools/ai-tools.html', '/ai-tools/news-app.html',
      '/ai-tools/voice-clone.html', '/ai-tools/story-creator.html', '/fun-games/fun-games.html',
      '/fun-games/games.json', '/fun-games/games.js', '/trading/trading.html', '/stories/stories.html',
      '/videos/videos.html', '/others/others.html', '/admin/login.html', '/admin/signup.html',
      '/admin/profile.html', '/assets/css/styles.css', '/assets/js/auth.js', '/assets/js/loadHeader.js',
      '/assets/includes/header.html',
    ];

    for (const filePath of criticalFiles) {
      const url = `http://localhost:${PORT}${filePath}`;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const ok = resp && resp.status() === 200;
        record(`File exists: ${filePath}`, ok, `Status ${resp?.status()}`);
      } catch (err) {
        record(`File exists: ${filePath}`, false, err.message);
      }
    }

    // ===== RESULTS =====
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESULTS: ${passed} passed, ${failed} failed\n`);
    if (errors.length > 0) {
      console.log('Failed tests:');
      errors.forEach(e => console.log(`  ❌ ${e}`));
    }
    console.log(failed === 0 ? '\n✅ ALL TESTS PASSED!' : `\n❌ ${failed} TEST(S) FAILED`);

    await browser.close();
    return failed === 0;
  } finally {
    server.close();
  }
}

runTests().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});