import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Help & FAQ Screenshots', () => {
  test('Capture Help & FAQ page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock background polling endpoints
    await page.route('**/api/health/**', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );

    // Navigate to Help & FAQ page
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/help');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Help & FAQ' })).toBeVisible();
    await expect(page.getByText('What is Open-Hivemind?')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/help-page.png', fullPage: true });

    // Open the first accordion
    await page.getByText('What is Open-Hivemind?').click({ force: true });
    await expect(page.getByText('Open-Hivemind is a multi-agent orchestration framework')).toBeVisible();

    await page.screenshot({ path: 'docs/screenshots/help-page-expanded.png', fullPage: true });
  });
});
