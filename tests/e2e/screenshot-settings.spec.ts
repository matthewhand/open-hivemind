import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation with Real API Data', async ({
    page,
  }) => {
    // Setup authentication
    await setupAuth(page);

    // Provide mocked data to ensure reliable test execution
    await page.route('**/api/config/global', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            instanceName: 'Open-Hivemind Production',
            logLevel: 'info',
            maxConcurrentBots: 100,
            allowUnknownTools: false,
          }
        });
      } else if (route.request().method() === 'PUT') {
        // Wait 3 seconds for loading state
        await new Promise((f) => setTimeout(f, 3000));
        await route.fulfill({ status: 200, json: {} });
      } else {
        await route.continue();
      }
    });

    // 1. Navigate to default settings page (General tab)
    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-general.png' });

    // Click Save Changes to trigger button loading state
    const saveButton = page.getByRole('button', { name: 'Save Settings' });

    // Trigger the save action and let it resolve
    // We don't await because we want to capture the loading state
    saveButton.click();

    // Wait for the button to have the loading class applied
    await page.waitForFunction(() => {
      const btn = document.querySelector('button.btn-primary');
      return btn && btn.classList.contains('loading');
    });

    // Screenshot while loading
    await page.screenshot({ path: 'docs/screenshots/settings-general-loading.png' });

    // Wait for loading to finish before navigating away
    await page.waitForFunction(() => {
      const btn = document.querySelector('button.btn-primary');
      return btn && !btn.classList.contains('loading');
    });

    // We can just click the security tab directly instead of full navigation
    // In DaisyUI, tabs are anchors within a div.tabs container
    await page.locator('.tabs a.tab:has-text("Security")').click();
    await page.waitForSelector('h5:has-text("Security Settings")');

    // Screenshot Security Tab
    await page.screenshot({ path: 'docs/screenshots/settings-security.png', fullPage: true });
  });
});
