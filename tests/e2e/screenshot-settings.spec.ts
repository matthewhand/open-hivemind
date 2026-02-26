import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page with Deep Linking', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API response for global config
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        json: {
          config: {
            app: {
              timezone: { value: 'UTC' }
            }
          },
          _userSettings: {
            values: {}
          }
        }
      });
    });

    // 1. Verify Default Tab (General)
    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');
    const generalTab = page.locator('.tab:has-text("General")');
    await expect(generalTab).toHaveClass(/tab-active/);

    // 2. Verify Deep Linking (Security)
    await page.goto('/admin/settings?tab=security');
    await page.waitForSelector('h5:has-text("Security Settings")');
    const securityTab = page.locator('.tab:has-text("Security")');
    await expect(securityTab).toHaveClass(/tab-active/);

    // 3. Go back to General for screenshot
    await page.goto('/admin/settings?tab=general');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Wait a bit for the select to populate and UI to settle
    await page.waitForTimeout(1000);

    // Screenshot Settings Page
    await page.screenshot({ path: 'docs/screenshots/settings-general.png', fullPage: true });
  });
});
