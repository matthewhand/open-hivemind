from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console logs and errors
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    # Navigate to the Providers page
    print("Navigating to /admin/providers...")
    page.goto("http://localhost:5173/admin/providers")

    # Wait for the page content to load
    print("Waiting for page content...")
    expect(page.get_by_role("heading", name="Provider Management", level=1)).to_be_visible(timeout=10000)

    # Test navigation to Message Providers
    print("Testing navigation to Message Providers...")
    page.get_by_role("button", name="Configure Message").click()

    # Wait for navigation
    print("Waiting for URL...")
    try:
        page.wait_for_url("**/admin/providers/message", timeout=5000)
        print("URL changed.")

        # Expect H1
        print("Waiting for H1...")
        expect(page.get_by_role("heading", name="Message Providers", level=1)).to_be_visible()

        # Take a screenshot
        page.screenshot(path="verification/message_providers_success.png")
        print("Success! Screenshot saved.")
    except Exception as e:
        print(f"Error during Message Providers test: {e}")
        page.screenshot(path="verification/message_providers_fail.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
