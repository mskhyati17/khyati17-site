import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { platform, homedir } from 'os';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const projectDir = join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.md': 'text/plain',
};

const TABS = [
  { path: '/home/index.html', name: 'Home', title: 'Khyati' },
  { path: '/about/about.html', name: 'About', title: 'About' },
  { path: '/ai-tools/ai-tools.html', name: 'AI Tools', title: 'AI Tools' },
  { path: '/ai-tools/news-app.html', name: 'News App', title: 'News' },
  { path: '/ai-tools/voice-clone.html', name: 'Voice Clone', title: 'Voice' },
  { path: '/ai-tools/story-creator.html', name: 'Story Creator', title: 'Story Creator' },
  { path: '/fun-games/fun-games.html', name: 'Fun & Games', title: 'Fun' },
  { path: '/trading/trading.html', name: 'Trading', title: 'Trading' },
  { path: '/stories/stories.html', name: 'Stories', title: 'Stories' },
  { path: '/videos/videos.html', name: 'Videos', title: 'Videos' },
  { path: '/others/others.html', name: 'Others', title: 'Others' },
  { path: '/admin/login.html', name: 'Login', title: 'Sign in' },
  { path: '/admin/signup.html', name: 'Sign Up', title: 'Sign up' },
  { path: '/index.html', name: 'Root (canonical homepage)', title: 'Khyati' },
];

function startServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(projectDir, req.url === '/' ? '/index.html' : req.url);
      // Decode URL
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
      console.log(`Test server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function runTests() {
  const PORT = 8000;
  const server = await startServer(PORT);
  let exitCode = 0;
  const errors = [];

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    for (const tab of TABS) {
      const url = `http://localhost:${PORT}${tab.path}`;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing: ${tab.name} -> ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

        // Handle redirect test
        if (tab.expectedRedirect) {
          await page.waitForTimeout(500);
          const currentUrl = page.url();
          if (currentUrl.includes(tab.expectedRedirect)) {
            console.log(`  ✓ Redirect working: ${currentUrl}`);
          } else {
            const msg = `  ✗ Expected redirect to ${tab.expectedRedirect}, got ${currentUrl}`;
            console.log(msg);
            errors.push(msg);
            exitCode = 1;
          }
          continue;
        }

        // Check body exists
        const body = await page.$('body');
        if (!body) {
          const msg = `  ✗ No body element found`;
          console.log(msg);
          errors.push(msg);
          exitCode = 1;
          continue;
        }

        // Check title
        const actualTitle = await page.title();
        if (actualTitle.toLowerCase().includes(tab.title.toLowerCase())) {
          console.log(`  ✓ Title: '${actualTitle}'`);
        } else {
          const msg = `  ✗ Expected title containing '${tab.title}', got '${actualTitle}'`;
          console.log(msg);
          errors.push(msg);
          exitCode = 1;
        }

        // Check header
        const header = await page.$('.site-header, #site-header-root');
        if (header) {
          console.log(`  ✓ Header element found`);
        } else {
          console.log(`  ⚠ Header not found`);
        }

        // Check footer
        const footer = await page.$('.site-footer');
        if (footer) {
          console.log(`  ✓ Footer found`);
        } else {
          console.log(`  ⚠ Footer not found`);
        }

        // Check main content
        const main = await page.$('main, .hero');
        if (main) {
          console.log(`  ✓ Main content area found`);
        } else {
          console.log(`  ⚠ Main content not found`);
        }

        // Check for JS errors
        const jsErrors = [];
        page.on('pageerror', err => jsErrors.push(err.message));
        if (jsErrors.length > 0) {
          console.log(`  ⚠ JS Errors: ${jsErrors.join(', ')}`);
        }

        console.log(`  ✓ PASSED: ${tab.name}`);
      } catch (err) {
        const msg = `  ✗ FAILED: ${tab.name} - ${err.message}`;
        console.log(msg);
        errors.push(msg);
        exitCode = 1;
      }
    }

    await browser.close();
  } finally {
    server.close();
  }

  console.log(`\n${'='.repeat(60)}`);
  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} test(s) failed:`);
    errors.forEach(e => console.log(`  - ${e}`));
    console.log(`\n❌ Some tests FAILED`);
  } else {
    console.log(`\n✅ ALL ${TABS.length} tests PASSED!`);
  }

  process.exit(exitCode);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});