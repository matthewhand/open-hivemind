import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Static Pages Screenshots', () => {
  test('Capture Static Pages', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Static Pages
    await navigateAndWaitReady(page, '/admin/static');

    // Wait for content to load properly
    await page.waitForSelector('h1:has-text("Static Pages")');

    // Wait a bit for UI to settle
    await page.waitForLoadState('networkidle');

    // Screenshot Static Pages
    await page.screenshot({ path: 'docs/screenshots/static-pages.png', fullPage: true });
  });
});
