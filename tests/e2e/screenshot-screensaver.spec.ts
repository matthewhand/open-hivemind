import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Screensaver Screenshots', () => {
  test('Capture Screensaver', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Navigate to Overview with screensaver forced
    // Using networkidle to ensure assets are loaded
    await page.goto('/admin/overview?screensaver=true', { waitUntil: 'networkidle' });

    // Wait for base layout to ensure we are on the page
    // The screensaver is an overlay, so we should target it specifically
    const screensaverLocator = page.locator('.fixed.inset-0.bg-black.z-\\[2000\\]');

    // Ensure it's visible
    await expect(screensaverLocator).toBeVisible();

    // Wait for the matrix effect to initialize and animate a bit
    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({ path: 'docs/screenshots/screensaver.png' });
  });
});
