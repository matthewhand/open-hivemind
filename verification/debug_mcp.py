from playwright.sync_api import Page, expect, sync_playwright

def debug_mcp_page(page: Page):
    print("Navigating to MCP Servers page...")
    page.goto("http://localhost:3028/admin/mcp-servers")

    # Wait a bit for potential redirects or loading
    page.wait_for_timeout(2000)

    print("Taking debug screenshot...")
    page.screenshot(path="verification/debug_page.png")
    print("Debug screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            debug_mcp_page(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
