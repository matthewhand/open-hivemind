import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation', async ({ page }) => {
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

    // Mock API response for messaging config
    await page.route('**/api/config/messaging', async (route) => {
      await route.fulfill({
        json: {
          MESSAGE_ONLY_WHEN_SPOKEN_TO: true,
          MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: false,
          MESSAGE_UNSOLICITED_ADDRESSED: true,
          MESSAGE_UNSOLICITED_UNADDRESSED: false,
          MESSAGE_UNSOLICITED_BASE_CHANCE: 0.05,
          MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: 300000,
        }
      });
    });

    // 1. Navigate to default settings page (General tab)
    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Wait a bit for UI to settle
    await page.waitForTimeout(1000);

    // Screenshot Default (General) Page
    await page.screenshot({ path: 'docs/screenshots/settings-general.png', fullPage: true });

    // 2. Click on "Security" tab and verify
    await page.click('a.tab:has-text("Security")');

    // Verify URL update
    await expect(page).toHaveURL(/.*tab=security/);

    // Verify content update
    await page.waitForSelector('h5:has-text("Security Settings")');

    // 3. Test Deep Linking to Messaging tab
    await page.goto('/admin/settings?tab=messaging');
    await expect(page).toHaveURL(/.*tab=messaging/);

    // Verify messaging tab is active and content is shown
    await page.waitForSelector('h5:has-text("Messaging Behavior")');
    await expect(page.locator('a.tab-active')).toHaveText('Messaging');
  });
});
