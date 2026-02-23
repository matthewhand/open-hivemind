from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_mcp_page(page: Page):
    # 1. Arrange: Go to the MCP Servers page.
    url = "http://localhost:3028/admin/mcp/servers"
    print(f"Navigating to {url}...")
    page.goto(url)

    # 2. Act: Find the "Add Server" button and click it.
    print("Clicking Add Server button...")
    add_button = page.get_by_role("button", name="Add Server")
    add_button.click(timeout=10000)

    # 3. Assert: Verify the modal is visible and contains the API Key input.
    print("Verifying modal and API Key input...")
    # The modal structure in DaisyUI usually has a checkbox or is just a dialog
    # But here we are just looking for the visible content.

    # We use get_by_placeholder because the label is not properly associated with the input
    api_key_input = page.get_by_placeholder("Leave blank if not required or unchanged")
    expect(api_key_input).to_be_visible()

    # Fill in some dummy data to make the screenshot look populated
    # Finding inputs by proximity or placeholder since labels aren't associated

    # Name input - assuming it's the first input or near "Server Name *"
    page.locator("input[type='text']").first.fill("Test Server")

    # URL input - assuming placeholder "mcp://server-host:port"
    page.get_by_placeholder("mcp://server-host:port").fill("mcp://localhost:8000")

    api_key_input.fill("sk-test-key-123")

    # 4. Screenshot: Capture the final result for visual verification.
    print("Taking screenshot...")
    page.screenshot(path="verification/mcp_modal.png")
    print("Screenshot saved to verification/mcp_modal.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_mcp_page(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
