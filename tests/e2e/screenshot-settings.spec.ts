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
              name: { value: 'Open-Hivemind Instance' },
              description: { value: 'Multi-agent AI coordination platform' },
              timezone: { value: 'UTC' },
              language: { value: 'en' }
            },
            webui: {
              theme: { value: 'auto' },
              notifications: { value: true },
              advancedMode: { value: false }
            },
            logging: {
              enabled: { value: true },
              level: { value: 'info' }
            },
            limits: {
              maxBots: { value: 10 },
              timeout: { value: 30 }
            },
            health: {
              enabled: { value: true },
              interval: { value: 60 }
            }
          },
          _userSettings: {
            values: {}
          }
        }
      });
    });

    // Navigate to Settings page
    await page.goto('/admin/settings');

    // Wait for content to load properly
    await page.waitForSelector('h5:has-text("General Settings")');

    // Wait a bit for the select to populate and UI to settle
    await page.waitForTimeout(1000);

    // Screenshot Settings Page
    await page.screenshot({ path: 'docs/screenshots/settings-general.png', fullPage: true });
  });
});
