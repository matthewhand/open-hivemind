import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Messaging Screenshots', () => {
  test('Capture Settings Messaging Page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock settings API data
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          defaultPersona: 'Assistant',
          maxMessageLength: 2000,
          allowMarkdown: true,
          enableThreadHistory: true,
          typingIndicator: true
        }
      });
    });

    // Navigate to settings page and switch to messaging tab
    await page.goto('/admin/settings');
    await page.locator('.tabs a.tab:has-text("Messaging")').click();

    // Wait for the UI to be ready
    await page.waitForFunction(() => !document.querySelector('.loading'));

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-messaging.png', fullPage: true });
  });
});
