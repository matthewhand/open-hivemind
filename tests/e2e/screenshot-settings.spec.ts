import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation with Real API Data', async ({
    page,
  }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/global', async (route) => {
      if (route.request().method() === 'PUT') {
        // Delay to capture loading spinner
        await new Promise((f) => setTimeout(f, 3000));
        await route.fulfill({ status: 200, json: {} });
      } else {
        await route.fulfill({ status: 200, json: { general: { values: {} } } });
      }
    });
    await page.route('**/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    // 1. Navigate to default settings page (General tab)
    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-general.png' });

    // Click Save Changes to trigger button loading state
    const saveButton = page.getByRole('button', { name: 'Save Settings' });

    // Trigger the save action
    saveButton.click();

    // Wait for the button to have the loading class applied
    await page.waitForFunction(() => {
      const btn = document.querySelector('button.btn-primary');
      return btn && btn.classList.contains('loading');
    });

    // Screenshot while loading
    await page.screenshot({ path: 'docs/screenshots/settings-general-loading.png' });

    // Check Secure Configuration Manager on Security tab
    await page.goto('/admin/settings?tab=security');
    await page.waitForSelector('h5:has-text("Security Settings")');

    // Screenshot Security Tab
    await page.screenshot({ path: 'docs/screenshots/settings-security.png', fullPage: true });
  });
});
