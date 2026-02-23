from playwright.sync_api import Page, expect, sync_playwright

def test_sitemap_page(page: Page):
  # 1. Arrange: Go to the Sitemap page.
  page.goto("http://localhost:3028/admin/sitemap")

  # Wait for the data to load
  page.wait_for_selector("text=Total Pages", timeout=10000)

  # 2. Assert: Check if the page title is correct.
  expect(page.get_by_role("heading", name="Dynamic Sitemap")).to_be_visible()

  # 3. Assert: Check if the categories are present (e.g., AI Features, Bot Management)
  # Target heading specifically
  expect(page.get_by_role("heading", name="AI Features")).to_be_visible()
  expect(page.get_by_role("heading", name="Bot Management")).to_be_visible()

  # 4. Assert: Check if specific links are present under the categories
  # Use text locator with exact match or similar if needed, or check link href
  expect(page.get_by_text("/admin/ai/dashboard")).to_be_visible()
  expect(page.get_by_text("/admin/bots", exact=True)).to_be_visible()

  # 5. Screenshot: Capture the sitemap page.
  page.screenshot(path="/home/jules/verification/sitemap_page.png")

  # 6. Verify XML sitemap
  # Just load and verify status code 200
  response = page.goto("http://localhost:3028/sitemap.xml")
  assert response.status == 200
  content = page.content()
  # Basic check for XML structure in returned content (browser might wrap it)
  # Alternatively, fetch directly

  # 7. Verify JSON sitemap
  response = page.goto("http://localhost:3028/sitemap.json")
  assert response.status == 200
  content = page.content() # This will be the JSON string in body
  assert '/admin/bots' in content

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_sitemap_page(page)
    finally:
      browser.close()
