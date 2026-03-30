import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('verify SpecsPage UX', async ({ page }) => {
  await setupAuth(page);

  // Mock background polling and page endpoints
  await page.route('**/api/health/**', async (route) =>
    route.fulfill({ status: 200, json: { status: 'ok' } })
  );
  await page.route('**/api/config/**', async (route) => route.fulfill({ status: 200, json: {} }));
  await page.route('**/api/specs', async (route) =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );

  await page.goto('/admin/specs');

  // Wait for the main heading to appear to ensure the page has loaded
  await expect(page.locator('h1', { hasText: 'Specifications' })).toBeVisible();

  // Take the baseline screenshot (empty state)
  await page.screenshot({ path: 'docs/screenshots/specs-baseline.png', fullPage: true });

  // Try to click "Add Specification" or "Create Specification"
  const createButton = page.getByRole('button', { name: /Create Specification/i });
  if (await createButton.isVisible()) {
    await createButton.click();
  } else {
    const addButton = page.getByRole('button', { name: /Add Specification/i });
    if (await addButton.isVisible()) {
      await addButton.click();
    }
  }

  // Assert that the toast actually appears
  await expect(page.getByText('Coming Soon')).toBeVisible({ timeout: 5000 });

  // Take a screenshot to show the result of clicking
  await page.screenshot({ path: 'docs/screenshots/specs-action-clicked.png', fullPage: true });
});
