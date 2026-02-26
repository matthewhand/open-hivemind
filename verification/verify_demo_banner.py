from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    # Intercept API calls to mock backend responses
    page.route("**/api/demo/status", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"isDemoMode": true, "botCount": 2, "conversationCount": 0, "messageCount": 0}'
    ))

    page.route("**/api/auth/check", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"authenticated": true, "user": {"role": "admin"}}'
    ))

    page.route("**/api/config/llm-status", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"configured": true}'
    ))

    page.route("**/api/health/detailed", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"status": "ok", "memory": {"heapUsed": 50, "heapTotal": 100, "rss": 200}}'
    ))

    page.route("**/api/bot-config/templates", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{}'
    ))

    # Navigate to the bots page
    print("Navigating to http://localhost:3028/#/admin/bots...")
    try:
        page.goto("http://localhost:3028/#/admin/bots", wait_until="domcontentloaded", timeout=10000)
    except Exception as e:
        print(f"Navigation warning: {e}")

    # Wait for the banner to be visible
    print("Waiting for banner...")
    banner = page.locator("text=Demo Mode Active")
    try:
        banner.wait_for(state="visible", timeout=5000)
        print("Banner found.")
    except Exception as e:
        print(f"Banner not found: {e}")

    # Take screenshot
    screenshot_path = "/home/jules/verification/verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
