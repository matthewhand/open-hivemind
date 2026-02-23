from playwright.sync_api import Page, expect, sync_playwright

def test_sitemap_page(page: Page):
  page.goto("http://localhost:3028/admin/sitemap")
  page.wait_for_selector("text=Total Pages", timeout=10000)

  # Scroll to bottom to capture more
  page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
  page.wait_for_timeout(500) # wait for render

  # Take full page screenshot if possible, or just the viewport
  page.screenshot(path="/home/jules/verification/sitemap_page_full.png", full_page=True)

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_sitemap_page(page)
    finally:
      browser.close()
