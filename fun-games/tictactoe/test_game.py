"""
Playwright test script for Tic-Tac-Toe game.
Tests the game through the FastAPI backend and frontend UI.
"""

import os
import sys
import time
import subprocess
import signal
import threading
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from playwright.sync_api import sync_playwright, expect


def run_server():
    """Start the FastAPI server in a subprocess."""
    server_path = Path(__file__).parent / "server.py"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "tictactoe.server:app",
         "--host", "127.0.0.1", "--port", "8000", "--log-level", "error"],
        cwd=Path(__file__).parent.parent,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return proc


def wait_for_server(url: str, timeout: int = 10):
    """Wait for the server to be ready."""
    import urllib.request
    import urllib.error

    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except (urllib.error.URLError, ConnectionResetError, ConnectionRefusedError):
            time.sleep(0.5)
    return False


def test_game_via_api():
    """Test the game logic through the FastAPI REST API."""
    import requests

    base_url = "http://127.0.0.1:8000"

    # Test 1: Initial state
    print("\n🧪 Test 1: Initial state")
    resp = requests.get(f"{base_url}/api/state")
    assert resp.status_code == 200
    data = resp.json()
    assert data["current_player"] == "X"
    assert data["winner"] is None
    assert data["is_draw"] is False
    assert data["game_over"] is False
    assert data["move_count"] == 0
    print("   ✅ Initial state is correct")

    # Test 2: Make a valid move
    print("\n🧪 Test 2: Valid move")
    resp = requests.post(f"{base_url}/api/move", json={"row": 0, "col": 0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["board"][0][0] == "X"
    assert data["current_player"] == "O"
    print("   ✅ Valid move works")

    # Test 3: Invalid move - occupied cell
    print("\n🧪 Test 3: Invalid move (occupied cell)")
    resp = requests.post(f"{base_url}/api/move", json={"row": 0, "col": 0})
    assert resp.status_code == 400
    print("   ✅ Occupied cell correctly rejected")

    # Test 4: Invalid move - out of bounds
    print("\n🧪 Test 4: Invalid move (out of bounds)")
    resp = requests.post(f"{base_url}/api/move", json={"row": 5, "col": 5})
    assert resp.status_code == 422
    print("   ✅ Out of bounds correctly rejected")

    # Test 5: AI move
    print("\n🧪 Test 5: AI move")
    resp = requests.post(f"{base_url}/api/ai-move")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["current_player"] == "X"
    print("   ✅ AI move works")

    # Test 6: Reset game
    print("\n🧪 Test 6: Reset game")
    resp = requests.post(f"{base_url}/api/reset")
    assert resp.status_code == 200
    data = resp.json()
    assert data["board"] == [[None, None, None], [None, None, None], [None, None, None]]
    assert data["current_player"] == "X"
    assert data["move_count"] == 0
    print("   ✅ Reset works")

    # Test 7: Win detection - X wins top row
    print("\n🧪 Test 7: Win detection")
    moves = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2)]
    for row, col in moves:
        resp = requests.post(f"{base_url}/api/move", json={"row": row, "col": col})
        assert resp.status_code == 200
    data = resp.json()
    assert data["winner"] == "X"
    assert data["game_over"] is True
    print("   ✅ Win detection works correctly")

    # Test 8: Game over - no more moves allowed
    print("\n🧪 Test 8: No moves after game over")
    resp = requests.post(f"{base_url}/api/move", json={"row": 2, "col": 0})
    assert resp.status_code == 400
    print("   ✅ Moves correctly rejected after game over")

    # Test 9: Draw detection
    print("\n🧪 Test 9: Draw detection")
    requests.post(f"{base_url}/api/reset")
    # Play a draw game: X O X / X O O / O X X
    draw_moves = [(0, 0), (0, 1), (0, 2), (1, 0), (1, 2), (1, 1), (2, 0), (2, 2), (2, 1)]
    for row, col in draw_moves:
        resp = requests.post(f"{base_url}/api/move", json={"row": row, "col": col})
        assert resp.status_code == 200
    data = resp.json()
    assert data["is_draw"] is True
    assert data["game_over"] is True
    assert data["winner"] is None
    print("   ✅ Draw detection works correctly")

    print("\n🎉 All API tests passed!")


def test_game_via_ui():
    """Test the game through the browser UI using Playwright."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 900})

        print("\n🧪 UI Test 1: Page loads correctly")
        page.goto("http://127.0.0.1:8000/")
        page.wait_for_load_state("networkidle")

        # Check title
        title = page.title()
        assert "Tic-Tac-Toe" in title
        print(f"   ✅ Page title: '{title}'")

        # Check status shows X's turn
        status = page.locator("#status")
        expect(status).to_be_visible()
        assert "X" in status.text_content()
        print(f"   ✅ Status shows: '{status.text_content()}'")

        # Check board has 9 cells
        cells = page.locator(".cell")
        assert cells.count() == 9
        print("   ✅ Board has 9 cells")

        print("\n🧪 UI Test 2: Click a cell to make a move")
        first_cell = cells.nth(0)
        first_cell.click()
        page.wait_for_timeout(500)

        # Check X appears in first cell
        assert first_cell.text_content() == "X"
        assert first_cell.get_attribute("class") == "cell x"
        print("   ✅ X placed in first cell")

        # Check status changed to O
        status_text = page.locator("#status").text_content()
        assert "O" in status_text
        print(f"   ✅ Status updated: '{status_text}'")

        print("\n🧪 UI Test 3: Reset game")
        reset_btn = page.locator("#resetBtn")
        reset_btn.click()
        page.wait_for_timeout(500)

        # Check all cells are empty
        for i in range(9):
            assert cells.nth(i).text_content() == ""
        print("   ✅ All cells cleared after reset")

        # Check status back to X
        assert "X" in page.locator("#status").text_content()
        print("   ✅ Status reset to X's turn")

        print("\n🧪 UI Test 4: Play a full game to win")
        # X wins: top row (0,0), (0,1), (0,2)
        # O plays (1,0), (1,1)
        click_cells = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2)]
        for row, col in click_cells:
            cell = page.locator(f".cell[data-row='{row}'][data-col='{col}']")
            cell.click()
            page.wait_for_timeout(300)

        # Check winner status
        status_text = page.locator("#status").text_content()
        assert "X" in status_text and "wins" in status_text
        print(f"   ✅ Winner detected: '{status_text}'")

        # Check winning cells are highlighted
        win_cells = page.locator(".cell.win-cell")
        assert win_cells.count() == 3
        print("   ✅ Winning cells highlighted")

        print("\n🧪 UI Test 5: AI mode toggle")
        reset_btn.click()
        page.wait_for_timeout(500)

        # Enable AI mode
        ai_checkbox = page.locator("#aiMode")
        ai_checkbox.check()
        assert ai_checkbox.is_checked()
        print("   ✅ AI mode enabled")

        # Make a move as X, AI should respond automatically
        cells.nth(4).click()  # Click center
        page.wait_for_timeout(1000)

        # Check that O has made a move (AI responded)
        o_cells = page.locator(".cell.o")
        assert o_cells.count() >= 1
        print(f"   ✅ AI responded with {o_cells.count()} O move(s)")

        print("\n🧪 UI Test 6: Manual AI move button")
        reset_btn.click()
        page.wait_for_timeout(500)
        ai_checkbox.uncheck()

        # Make a move as X
        cells.nth(0).click()
        page.wait_for_timeout(300)

        # Click AI move button
        ai_btn = page.locator("#aiMoveBtn")
        expect(ai_btn).to_be_enabled()
        ai_btn.click()
        page.wait_for_timeout(500)

        # Check AI made a move
        o_cells = page.locator(".cell.o")
        assert o_cells.count() >= 1
        print("   ✅ Manual AI move button works")

        browser.close()
        print("\n🎉 All UI tests passed!")


def main():
    """Run all tests."""
    print("=" * 60)
    print("🎮 TIC-TAC-TOE TEST SUITE")
    print("=" * 60)

    # Start server
    print("\n🚀 Starting FastAPI server...")
    server_proc = run_server()

    try:
        # Wait for server to be ready
        if not wait_for_server("http://127.0.0.1:8000/api/state"):
            print("❌ Server failed to start")
            server_proc.terminate()
            sys.exit(1)

        print("✅ Server is running on http://127.0.0.1:8000")

        # Run API tests
        print("\n" + "=" * 60)
        print("📡 API TESTS")
        print("=" * 60)
        test_game_via_api()

        # Run UI tests
        print("\n" + "=" * 60)
        print("🖥️  UI TESTS (Playwright)")
        print("=" * 60)
        test_game_via_ui()

        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED! 🎉")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        print("\n🛑 Shutting down server...")
        server_proc.terminate()
        server_proc.wait(timeout=5)
        print("Server stopped.")


if __name__ == "__main__":
    main()
