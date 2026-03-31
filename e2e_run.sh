#!/bin/bash
pnpm run dev &
DEV_PID=$!
echo "Waiting for server on 3028..."
while ! curl -s http://localhost:3028/api-docs > /dev/null; do
  sleep 1
done
echo "Server is up!"

cat << 'PYEOF' > e2e_run.py
from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3028/api-docs", timeout=60000)
    page.wait_for_timeout(2000)

    # Expand first item
    page.locator('.collapse-title').first.click()
    page.wait_for_timeout(1000)

    # Click Try it out
    page.locator('button:has-text("Send Request")').first.click()
    page.wait_for_timeout(2000)

    # Take screenshot
    page.screenshot(path="/home/jules/verification/screenshots/verification.png", full_page=True)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={'width': 1280, 'height': 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
PYEOF

python3 e2e_run.py
kill $DEV_PID
