import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page', async ({ page }) => {
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

    // Test Deep Linking: Navigate to Security tab
    await page.goto('/admin/settings?tab=security');
    await expect(page.locator('.tab-active')).toHaveText('Security');

    // Navigate to General Settings (default) for screenshot
    await page.goto('/admin/settings?tab=general');

    // Wait for content to load properly
    await expect(page.locator('.tab-active')).toHaveText('General');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Wait a bit for the select to populate and UI to settle
    await page.waitForTimeout(1000);

    // Screenshot Settings Page
    await page.screenshot({ path: 'docs/screenshots/settings-general.png', fullPage: true });
  });
});
