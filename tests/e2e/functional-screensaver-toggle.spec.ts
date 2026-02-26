import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Screensaver Settings', () => {
  test('should toggle screensaver functionality', async ({ page }) => {
    await setupAuth(page);

    // 1. Initially, screensaver should be enabled by default
    await page.goto('/admin/overview?screensaver=true');
    await page.waitForTimeout(1000);

    // Check for screensaver element
    const screensaver = page.locator('.fixed.inset-0.bg-black');
    await expect(screensaver).toBeVisible();

    // 2. Navigate to Settings and disable it
    await page.goto('/admin/settings');

    // Wait for header to ensure page loaded
    await expect(page.locator('h1', { hasText: 'Settings' })).toBeVisible();

    // Find the toggle. The label text is "Enable Screensaver"
    const span = page.locator('span.label-text', { hasText: 'Enable Screensaver' });
    await expect(span).toBeVisible();

    // Click the toggle
    await span.click();

    // Now wait a bit and check persistence if needed, but the click handles the change.

    // 3. Verify it is disabled
    await page.goto('/admin/overview?screensaver=true');
    await page.waitForTimeout(1000);

    await expect(screensaver).not.toBeVisible();

    // 4. Re-enable it
    await page.goto('/admin/settings');
    await expect(page.locator('h1', { hasText: 'Settings' })).toBeVisible();

    const span2 = page.locator('span.label-text', { hasText: 'Enable Screensaver' });
    await span2.click();

    // 5. Verify it is enabled again
    await page.goto('/admin/overview?screensaver=true');
    await page.waitForTimeout(1000);
    await expect(screensaver).toBeVisible();
  });
});
