import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation with Real API Data', async ({
    page,
    request,
  }) => {
    // Setup authentication
    await setupAuth(page);

    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');
    await page.waitForTimeout(1000);

    // Click on "Security" tab and verify
    await page.click('a.tab:has-text("Security")');

    // Verify URL update
    await expect(page).toHaveURL(/.*tab=security/);

    // Verify content update
    await page.waitForSelector('h5:has-text("Security Settings")');

    // FORCE Disable Rate Limiting
    const rateLimitToggle = page.locator('div.form-control:has-text("Enable rate limiting") input[type="checkbox"]');
    const isChecked = await rateLimitToggle.isChecked();
    if (isChecked) {
      // Need to uncheck it to test our disabled state visual styles
      await rateLimitToggle.uncheck({ force: true });
    }

    // Wait for state to settle
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/settings-security.png', fullPage: true });
  });
});
