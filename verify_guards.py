from playwright.sync_api import Page, expect, sync_playwright
import time

def test_guards_page(page: Page):
    print("Navigating to guards page...")
    # 1. Arrange: Go to Guards Page
    page.goto("http://localhost:3028/admin/guards")

    # 2. Act & Assert: Check if Guards page loads
    print("Waiting for Guards header...")
    expect(page.get_by_role("heading", name="Guards", exact=True)).to_be_visible(timeout=30000)

    # Check if the guards are visible.
    # We found 1 Access Control heading. The other one is "Access Control Configuration".
    # Since match logic for name is substring by default if not exact.
    # It seems "Access Control Configuration" heading matches "Access Control".
    # And the card heading "Access Control" also matches.
    # But it only found 1.
    # Maybe the card heading is NOT a heading role?
    # In GuardsPage.tsx: <h3 className="font-semibold">{guard.name}</h3>
    # That is definitely a heading.

    # Maybe the guards are NOT loaded?
    # If the guards list is empty, then only "Access Control Configuration" is visible.
    # That would explain count=1.

    # Let's check for "Total Guards" stat.
    print("Checking Total Guards stat...")
    # <div class="stat-value text-primary">{guards.length}</div>
    # We expect 3.
    expect(page.locator(".stat-value.text-primary")).to_have_text("3")

    # Take a screenshot of the initial state
    page.screenshot(path="/home/jules/verification/guards_initial.png")

    # 3. Toggle a guard
    print("Toggling Content Filter...")

    # Locate the toggle for Content Filter.
    # Find the card containing "Content Filter"
    card = page.locator(".card").filter(has_text="Content Filter").first
    toggle = card.locator("input[type=checkbox]")

    # Click it
    toggle.click()

    # Wait a bit for API call
    time.sleep(1)

    # Take screenshot after toggle
    page.screenshot(path="/home/jules/verification/guards_toggled.png")

    # 4. Add a user to Access Control
    print("Adding user to Access Control...")
    user_input = page.get_by_placeholder("user@example.com")
    user_input.fill("testuser@example.com")
    user_input.press("Enter")

    # Verify badge appears
    # The badge contains the user email and a close button.
    expect(page.get_by_text("testuser@example.com")).to_be_visible()

    # Save Access Control
    print("Saving Access Control...")
    save_btn = page.get_by_role("button", name="Save Access Control")
    save_btn.click()

    # Verify success message
    expect(page.get_by_text("Access control saved successfully")).to_be_visible()

    # Take final screenshot
    page.screenshot(path="/home/jules/verification/guards_final.png")
    print("Verification complete!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_guards_page(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise
        finally:
            browser.close()
