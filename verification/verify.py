from playwright.sync_api import sync_playwright
import time

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock API responses
        page.route("**/api/config/global", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"config": {"llm": {"values": {"LLM_PROVIDER": "openai", "LLM_PARALLEL_EXECUTION": false}, "schema": {"LLM_PROVIDER": {}, "LLM_PARALLEL_EXECUTION": {}}}}, "_userSettings": {"values": {"webui.advancedMode": true}}}'
        ))
        page.route("**/api/dashboard/api/status", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"bots": []}'
        ))
        page.route("**/api/config/llm-profiles", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"profiles": {"llm": [{"key": "test-profile", "name": "Test Profile", "provider": "openai", "config": {}}]}}'
        ))

        # 1. Verify Integrations Panel
        print("Navigating to /admin/config...")
        page.goto("http://localhost:3028/admin/config")

        # Wait for "LLM Providers" heading
        try:
            page.wait_for_selector("text=LLM Providers", timeout=5000)
            page.wait_for_selector("text=Test Profile", timeout=5000)
        except:
            print("Timeout waiting for selectors in integrations panel")

        page.screenshot(path="verification/integrations_panel_advanced.png")
        print("Screenshot saved: verification/integrations_panel_advanced.png")

        # 2. Verify System Settings
        print("Navigating to /uber/settings...")
        page.goto("http://localhost:3028/uber/settings")

        # Wait for "Advanced Settings" or "Enable Advanced Mode"
        try:
            page.wait_for_selector("text=Advanced Settings", timeout=5000)
            page.wait_for_selector("text=Enable Advanced Mode", timeout=5000)
        except:
            print("Timeout waiting for selectors in settings")

        page.screenshot(path="verification/system_settings.png")
        print("Screenshot saved: verification/system_settings.png")

        browser.close()

if __name__ == "__main__":
    verify_ui()
