import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Not Found Page Screenshots', () => {
  test('Capture 404 Page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Navigate to a non-existent page
    await page.goto('/admin/this-page-does-not-exist');

    // Wait for the "404" text or "Signal Lost" header
    await page.waitForSelector('text=Signal Lost');

    // Wait a bit for animations/rendering
    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({ path: 'docs/screenshots/not-found-page.png', fullPage: true });
  });
});
