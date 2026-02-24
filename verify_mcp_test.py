from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock API
        page.route("**/api/admin/mcp-servers", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "data": {"servers": [], "configurations": []}}'
        ))

        page.route("**/api/admin/mcp-servers/test", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "message": "Successfully tested connection", "toolCount": 5, "tools": [{"name": "tool1"}, {"name": "tool2"}, {"name": "tool3"}, {"name": "tool4"}, {"name": "tool5"}]}'
        ))

        page.route("**/api/user/me", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id": "user1", "username": "admin", "role": "admin"}'
        ))

        print("Navigating...")
        page.goto("http://localhost:3028/admin/mcp/servers")

        # Click Add Server
        page.wait_for_selector("button:has-text('Add Server')", timeout=5000)
        page.click("button:has-text('Add Server')")

        # Wait for modal
        page.wait_for_selector(".modal-box", state="visible")

        # Fill details
        inputs = page.locator(".modal-box input")
        inputs.nth(0).fill("Test Server")
        inputs.nth(1).fill("http://localhost:3000")

        # Click Test Connection
        print("Clicking Test Connection...")
        page.click("button:has-text('Test Connection')")

        # Wait for result
        print("Waiting for alert...")
        try:
            # Look for the alert div inside the modal
            # It has 'alert' class and 'bg-green-600' class
            alert = page.wait_for_selector(".modal-box .alert", timeout=10000)
            alert_text = alert.text_content()
            print(f"Alert found: {alert_text}")

            if "Found 5 tools" in alert_text:
                print("SUCCESS: Tool count found in alert.")
            else:
                print("FAILURE: Tool count NOT found in alert.")

            page.screenshot(path="verification_success.png")
            print("Screenshot saved to verification_success.png")

        except Exception as e:
            print(f"Timeout waiting for alert: {e}")
            page.screenshot(path="verification_fail.png")

        browser.close()

if __name__ == "__main__":
    run()
