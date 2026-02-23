import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Mock API endpoints
    def handle_mcp_servers(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "data": {"servers": [], "configurations": []}}'
        )

    def handle_test_connection(route):
        # Add delay to show loading state if needed, but for screenshot we want final state
        time.sleep(0.5)
        route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "message": "Connection successful!"}'
        )

    page.route("**/api/admin/mcp-servers", handle_mcp_servers)
    page.route("**/api/admin/mcp-servers/test", handle_test_connection)

    # Navigate to MCP Servers page
    # The URL is likely http://localhost:3028/admin/mcp/servers
    try:
        print("Navigating to MCP Servers page...")
        page.goto("http://localhost:3028/admin/mcp/servers", timeout=60000)
    except Exception as e:
        print(f"Error navigating: {e}")
        # Retry once
        time.sleep(5)
        page.goto("http://localhost:3028/admin/mcp/servers")

    # Wait for page to load
    print("Waiting for Add Server button...")
    page.wait_for_selector("text=Add Server")

    # Click Add Server
    print("Clicking Add Server...")
    page.click("text=Add Server")

    # Fill form
    print("Filling form...")
    page.fill('input[type="text"] >> nth=0', "Test Server")
    page.fill('input[type="text"] >> nth=1', "mcp://valid-server")

    # Click Test Connection
    print("Clicking Test Connection...")
    page.click("text=Test Connection")

    # Wait for success message
    print("Waiting for success message...")
    page.wait_for_selector(".alert-success")

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification_mcp_test.png")

    browser.close()
    print("Done.")

with sync_playwright() as playwright:
    run(playwright)
