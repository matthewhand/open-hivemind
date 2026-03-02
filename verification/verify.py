from playwright.sync_api import sync_playwright, expect

def verify_openwebui_auth_header():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use add_init_script to set localstorage to bypass login, as noted in memory
        context = browser.new_context()
        context.add_init_script("""
            localStorage.setItem('auth_tokens', JSON.stringify({accessToken: 'dummy'}));
            localStorage.setItem('auth_user', JSON.stringify({id: 1, role: 'admin', username: 'admin'}));
            localStorage.setItem('auth_state', JSON.stringify({isAuthenticated: true}));
        """)

        page = context.new_page()

        # Go to a page first to set localStorage
        page.goto("http://localhost:3028")

        # Wait for either login or initializing
        try:
            expect(page.get_by_text("Initializing AI Network Dashboard")).not_to_be_visible(timeout=30000)
        except Exception as e:
            pass

        page.goto("http://localhost:3028/admin/llm-providers")

        # Let's see what buttons are available
        try:
            page.get_by_role("button", name="Add Profile").click(timeout=5000)
        except Exception as e:
            print(f"Failed to click Add Profile: {e}")

        # wait a bit for modal
        page.wait_for_timeout(1000)
        page.screenshot(path="/app/verification/llm-providers-modal.png", full_page=True)

        # Select OpenWebUI
        try:
             page.locator('select').first.select_option("openwebui")
        except Exception as e:
             print(f"Failed to select openwebui: {e}")

        page.wait_for_timeout(1000)
        page.screenshot(path="/app/verification/llm-providers-modal-openwebui.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    verify_openwebui_auth_header()