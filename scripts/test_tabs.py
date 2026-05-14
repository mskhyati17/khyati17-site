import time
import sys
import subprocess
import signal
import os
from playwright.sync_api import sync_playwright

# Tab pages to test
TABS = [
    {"path": "/home/index.html", "name": "Home", "title": "Khyati"},
    {"path": "/about/about.html", "name": "About", "title": "About"},
    {"path": "/ai-tools/ai-tools.html", "name": "AI Tools", "title": "AI Tools"},
    {"path": "/fun-games/fun-games.html", "name": "Fun & Games", "title": "Fun"},
    {"path": "/trading/trading.html", "name": "Trading", "title": "Trading"},
    {"path": "/stories/stories.html", "name": "Stories", "title": "Stories"},
    {"path": "/videos/videos.html", "name": "Videos", "title": "Videos"},
    {"path": "/others/others.html", "name": "Others", "title": "Others"},
    {"path": "/admin/login.html", "name": "Login", "title": "Sign in"},
    {"path": "/admin/signup.html", "name": "Sign Up", "title": "Sign up"},
    {"path": "/index.html", "name": "Redirect", "expected_redirect": "/home/index.html"},
]


def start_server(project_dir):
    """Start a simple HTTP server for the project."""
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8000", "--directory", project_dir],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1)
    return proc


def run_tests(project_dir):
    server = start_server(project_dir)
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                ignore_https_errors=True,
            )
            page = context.new_page()

            for tab in TABS:
                url = f"http://localhost:8000{tab['path']}"
                print(f"\n{'='*60}")
                print(f"Testing: {tab['name']} -> {url}")
                try:
                    page.goto(url, wait_until="networkidle", timeout=15000)

                    # Check for redirect
                    if "expected_redirect" in tab:
                        time.sleep(0.5)
                        current = page.url
                        if tab["expected_redirect"] in current:
                            print(f"  ✓ Redirect working: {current}")
                        else:
                            msg = f"  ✗ Expected redirect to {tab['expected_redirect']}, got {current}"
                            print(msg)
                            errors.append(msg)
                        continue

                    # Check page loaded (no crash, body present)
                    body = page.query_selector("body")
                    if not body:
                        msg = f"  ✗ No body element found"
                        print(msg)
                        errors.append(msg)
                        continue

                    # Check title contains expected text
                    actual_title = page.title()
                    if tab["title"].lower() in actual_title.lower():
                        print(f"  ✓ Title matches: '{actual_title}'")
                    else:
                        msg = f"  ✗ Expected title containing '{tab['title']}', got '{actual_title}'"
                        print(msg)
                        errors.append(msg)

                    # Check header is loaded (site-header class)
                    header = page.query_selector(".site-header")
                    if header:
                        print(f"  ✓ Header loaded")
                    else:
                        print(f"  ⚠ Header not found (may be loaded via JS)")

                    # Check footer is present
                    footer = page.query_selector(".site-footer")
                    if footer:
                        print(f"  ✓ Footer loaded")
                    else:
                        print(f"  ⚠ Footer not found")

                    # Check main content area
                    main = page.query_selector("main")
                    if main:
                        print(f"  ✓ Main content area found")
                    else:
                        print(f"  ⚠ Main element not found")

                    print(f"  ✓ OK - Page loaded successfully")

                except Exception as e:
                    msg = f"  ✗ FAILED: {tab['name']} - {str(e)}"
                    print(msg)
                    errors.append(msg)

            browser.close()

        print(f"\n{'='*60}")
        if errors:
            print(f"\n❌ {len(errors)} test(s) failed:")
            for e in errors:
                print(f"  - {e}")
            print(f"\n❌ Some tests FAILED")
            sys.exit(1)
        else:
            print(f"\n✅ ALL {len(TABS)} tests PASSED!")
            sys.exit(0)

    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except:
            server.kill()


if __name__ == "__main__":
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Project directory: {project_dir}")
    run_tests(project_dir)