from playwright.sync_api import sync_playwright
import time
import os

def run():
    print("Starting verification...")
    # Ensure verification directory exists
    os.makedirs("verification", exist_ok=True)

    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        print("Mocking API responses...")
        # Mock API responses to inject sample data
        page.route("**/api/admin/mcp-servers", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"data": {"servers": [{"name": "Demo Server", "serverUrl": "http://demo.com", "connected": true, "description": "A demo server for testing search", "tools": ["tool1", "tool2"], "lastConnected": "2023-01-01T00:00:00Z"}, {"name": "Test Server", "serverUrl": "http://test.com", "connected": false, "description": "Another server", "tools": [], "lastConnected": null}], "configurations": []}}'
        ))

        # Mock other config calls to prevent 404s
        page.route("**/api/config/global", lambda route: route.fulfill(body='{}'))
        page.route("**/api/personas", lambda route: route.fulfill(body='[]'))
        page.route("**/api/config/llm-profiles", lambda route: route.fulfill(body='{"profiles": {"llm": []}}'))
        page.route("**/api/config/llm-status", lambda route: route.fulfill(body='{"defaultConfigured": true, "defaultProviders": [], "botsMissingLlmProvider": []}'))
        page.route("**/api/notifications", lambda route: route.fulfill(body='[]'))

        # Inject auth token that bypasses expiration check
        page.add_init_script("""
            localStorage.setItem('auth_tokens', JSON.stringify({
                accessToken: 'dev-token-auto-login',
                refreshToken: 'dev-refresh-token',
                expiresIn: 86400
            }));
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'admin',
                username: 'admin',
                email: 'admin@open-hivemind.com',
                role: 'owner',
                permissions: ['*']
            }));
        """)

        print("Navigating to MCP Servers page...")
        try:
            page.goto("http://localhost:3028/admin/mcp/servers")
            print(f"Current URL: {page.url}")

            # Wait for the table/grid to load
            print("Waiting for server list...")
            page.wait_for_selector("text=Demo Server", timeout=10000)
            print("Page loaded successfully.")

            # Interact with search
            print("Typing search query 'Demo'...")
            page.fill("input[placeholder='Search servers...']", "Demo")
            time.sleep(1) # Wait for debounce/render

            # Verify filtering (Test Server should be hidden)
            if page.is_visible("text=Test Server"):
                print("WARNING: Test Server is still visible!")
            else:
                print("SUCCESS: Test Server is hidden.")

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/mcp_search_verification.png")
            print("Screenshot saved to verification/mcp_search_verification.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            print(f"Current URL at error: {page.url}")
            page.screenshot(path="verification/error_screenshot.png")
            print("Error screenshot saved to verification/error_screenshot.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    run()
