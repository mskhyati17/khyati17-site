"""
Run all Tic-Tac-Toe tests (API + Playwright UI).
"""
import sys
import os
import time
import subprocess
import urllib.request
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["PYTHONIOENCODING"] = "utf-8"


def safe_print(text):
    """Print text safely, replacing unencodable characters."""
    try:
        print(text)
    except UnicodeEncodeError:
        # Replace non-ASCII characters with safe alternatives
        safe = text.encode('ascii', 'replace').decode('ascii')
        print(safe)


def print_banner(text):
    safe_print("=" * 60)
    safe_print(f" {text}")
    safe_print("=" * 60)


def start_server():
    """Start the FastAPI server."""
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "tictactoe.server:app",
         "--host", "127.0.0.1", "--port", "8000", "--log-level", "error"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return proc


def wait_for_server(url, timeout=15):
    """Wait for server to be ready."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except (urllib.error.URLError, ConnectionResetError, ConnectionRefusedError, OSError):
            time.sleep(0.5)
    return False


def test_api():
    """Test the REST API endpoints."""
    import requests

    base = "http://127.0.0.1:8000"
    passed = 0
    total = 0

    def check(name, condition):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            safe_print(f"  [PASS] {name}")
        else:
            safe_print(f"  [FAIL] {name}")

    safe_print("\n--- API Tests ---")

    # Test 1: Initial state
    r = requests.get(f"{base}/api/state")
    data = r.json()
    check("Initial state - current_player is X", data["current_player"] == "X")
    check("Initial state - no winner", data["winner"] is None)
    check("Initial state - not game over", data["game_over"] is False)
    check("Initial state - move_count is 0", data["move_count"] == 0)

    # Test 2: Valid move
    r = requests.post(f"{base}/api/move", json={"row": 0, "col": 0})
    data = r.json()
    check("Valid move - success", data["success"] is True)
    check("Valid move - X placed", data["board"][0][0] == "X")
    check("Valid move - turn switches to O", data["current_player"] == "O")

    # Test 3: Invalid move - occupied
    r = requests.post(f"{base}/api/move", json={"row": 0, "col": 0})
    check("Occupied cell rejected", r.status_code == 400)

    # Test 4: Invalid move - out of bounds
    r = requests.post(f"{base}/api/move", json={"row": 5, "col": 5})
    check("Out of bounds rejected", r.status_code == 422)

    # Test 5: AI move
    r = requests.post(f"{base}/api/ai-move")
    data = r.json()
    check("AI move - success", data["success"] is True)
    check("AI move - O placed", any(data["board"][r][c] == "O" for r in range(3) for c in range(3)))

    # Test 6: Reset
    r = requests.post(f"{base}/api/reset")
    data = r.json()
    check("Reset - board cleared", data["board"] == [[None]*3 for _ in range(3)])
    check("Reset - current_player is X", data["current_player"] == "X")
    check("Reset - move_count is 0", data["move_count"] == 0)

    # Test 7: Win detection
    for row, col in [(0,0), (1,0), (0,1), (1,1), (0,2)]:
        r = requests.post(f"{base}/api/move", json={"row": row, "col": col})
    data = r.json()
    check("Win detection - X wins", data["winner"] == "X")
    check("Win detection - game over", data["game_over"] is True)

    # Test 8: No moves after game over
    r = requests.post(f"{base}/api/move", json={"row": 2, "col": 0})
    check("No moves after game over", r.status_code == 400)

    # Test 9: Draw detection
    requests.post(f"{base}/api/reset")
    for row, col in [(0,0),(0,1),(0,2),(1,0),(1,2),(1,1),(2,0),(2,2),(2,1)]:
        r = requests.post(f"{base}/api/move", json={"row": row, "col": col})
    data = r.json()
    check("Draw detection - is draw", data["is_draw"] is True)
    check("Draw detection - no winner", data["winner"] is None)
    check("Draw detection - game over", data["game_over"] is True)

    safe_print(f"\nAPI Results: {passed}/{total} passed")
    return passed == total


def test_ui():
    """Test the UI with Playwright."""
    from playwright.sync_api import sync_playwright

    passed = 0
    total = 0

    def check(name, condition):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            safe_print(f"  [PASS] {name}")
        else:
            safe_print(f"  [FAIL] {name}")

    safe_print("\n--- UI Tests ---")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 900})

        # Test 1: Page loads and reset game
        page.goto("http://127.0.0.1:8000/")
        page.wait_for_load_state("networkidle")
        check("Page title", "Tic-Tac-Toe" in page.title())
        cells = page.locator(".cell")
        check("9 cells on board", cells.count() == 9)

        # Reset game first to clear any state from API tests
        page.locator("#resetBtn").click()
        page.wait_for_timeout(500)

        # Test 2: Click cell
        cells.nth(0).click()
        page.wait_for_timeout(1000)
        check("X appears in cell", cells.nth(0).text_content() == "X")
        status_text = page.locator("#status").text_content()
        safe_print(f"    Status after move: '{status_text}'")
        check("Turn switches to O", "O" in status_text)

        # Test 3: Reset
        page.locator("#resetBtn").click()
        page.wait_for_timeout(500)
        all_empty = all(cells.nth(i).text_content() == "" for i in range(9))
        check("All cells cleared", all_empty)
        check("Status back to X", "X" in page.locator("#status").text_content())

        # Test 4: Win game
        for row, col in [(0,0),(1,0),(0,1),(1,1),(0,2)]:
            page.locator(f'.cell[data-row="{row}"][data-col="{col}"]').click()
            page.wait_for_timeout(300)
        status = page.locator("#status").text_content()
        check("Winner detected", "X" in status and "wins" in status)
        win_cells = page.locator(".cell.win-cell")
        check("3 winning cells highlighted", win_cells.count() == 3)

        # Test 5: AI mode
        page.locator("#resetBtn").click()
        page.wait_for_timeout(500)
        page.locator("#aiMode").check()
        page.wait_for_timeout(200)
        # Click center cell - AI should auto-respond
        page.locator('.cell[data-row="1"][data-col="1"]').click()
        page.wait_for_timeout(2000)
        o_cells = page.locator(".cell.o")
        o_count = o_cells.count()
        safe_print(f"    AI mode: found {o_count} O cells")
        check("AI responded with O", o_count >= 1)

        # Test 6: Manual AI button
        page.locator("#resetBtn").click()
        page.wait_for_timeout(500)
        page.locator("#aiMode").uncheck()
        page.wait_for_timeout(200)
        # Make a move as X
        page.locator('.cell[data-row="0"][data-col="0"]').click()
        page.wait_for_timeout(500)
        # Check AI button is enabled
        ai_btn = page.locator("#aiMoveBtn")
        safe_print(f"    AI button disabled: {ai_btn.is_disabled()}")
        ai_btn.click()
        page.wait_for_timeout(1000)
        o_cells = page.locator(".cell.o")
        o_count = o_cells.count()
        safe_print(f"    Manual AI: found {o_count} O cells")
        check("Manual AI button works", o_count >= 1)

        browser.close()

    safe_print(f"\nUI Results: {passed}/{total} passed")
    return passed == total


def main():
    print_banner("TIC-TAC-TOE TEST SUITE")

    # Start server
    print("\nStarting server...")
    server_proc = start_server()

    if not wait_for_server("http://127.0.0.1:8000/api/state"):
        print("FAILED: Server did not start")
        server_proc.terminate()
        sys.exit(1)
    print("Server is running on http://127.0.0.1:8000")

    all_passed = True

    try:
        # Run API tests
        print_banner("API TESTS")
        if not test_api():
            all_passed = False

        # Run UI tests
        print_banner("UI TESTS (Playwright)")
        if not test_ui():
            all_passed = False

    finally:
        print("\nShutting down server...")
        server_proc.terminate()
        server_proc.wait(timeout=5)

    print_banner("RESULTS")
    if all_passed:
        print("ALL TESTS PASSED!")
    else:
        print("SOME TESTS FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    main()
