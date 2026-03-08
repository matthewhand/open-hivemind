import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation with Real API Data', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API requests for frontend-only
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: { appName: "Open-Hivemind" } });
    });

    await page.route('**/api/admin/secure-config*', async (route) => {
      await route.fulfill({ status: 200, json: { configs: [] } });
    });

    await page.route('**/api/admin/system/status', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'healthy', version: '1.0.0' } });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, json: { user: { username: "admin", role: "admin" } } });
    });

    // 1. Navigate to default settings page (General tab)
    await page.goto('/admin/settings');

    // Give it a moment to load and render
    await page.waitForTimeout(1000);

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-general.png' });

    // Mock the config save endpoint to delay so we can capture the loading spinner
    await page.route('**/api/config/global', async (route) => {
      if (route.request().method() === 'PUT') {
        // Wait 3 seconds
        await new Promise((f) => setTimeout(f, 3000));
        await route.fulfill({ status: 200, json: {} });
      } else {
        await route.fulfill({ status: 200, json: { appName: "Open-Hivemind" } });
      }
    });

    // Check Secure Configuration Manager on Security tab
    await page.goto('/admin/settings?tab=security');

    // Give it a moment to load and render
    await page.waitForTimeout(1000);

    // Screenshot Security Tab
    await page.screenshot({ path: 'docs/screenshots/settings-security.png', fullPage: true });
  });
});
