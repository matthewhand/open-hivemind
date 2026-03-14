from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 375, 'height': 667})
    page = context.new_page()

    # Try to open the static build of the frontend just to see if we can render the components
    # The frontend runs on 3000 normally but we failed to build it.
    # Let's start the server if possible or skip.
    print("Skipping playwright test as we established pnpm install failed due to missing internal registry package @hivemind/shared-types")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
