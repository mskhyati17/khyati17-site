import time
import sys
import json
from playwright.sync_api import sync_playwright


def run_tests():
    # brief pause to allow server to start
    time.sleep(0.5)
    with sync_playwright() as p:
        req = p.request.new_context()
        tests = [
            ({"op": "add", "a": 1, "b": 2}, 3),
            ({"op": "sub", "a": 5, "b": 3}, 2),
            ({"op": "mul", "a": 4, "b": 3}, 12),
            ({"op": "div", "a": 8, "b": 2}, 4),
            ({"op": "pow", "a": 2, "b": 5}, 32),
            ({"op": "sqrt", "a": 9}, 3),
        ]
        for payload, expected in tests:
            r = req.post(
                "http://127.0.0.1:8001/calc",
                data=json.dumps(payload),
                headers={"Content-Type": "application/json"},
            )
            if r.status != 200:
                print("Request failed:", r.status, r.text())
                sys.exit(2)
            data = r.json()
            if abs(data.get("result", 0) - expected) > 1e-9:
                print("Unexpected result for", payload, "->", data)
                sys.exit(3)
        print("All Playwright tests passed")
        req.dispose()


if __name__ == "__main__":
    run_tests()
