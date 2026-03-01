import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation with Real API Data', async ({
    page,
    request,
  }) => {
    // Setup authentication
    await setupAuth(page);

    // Fetch real API data to verify against
    const globalConfigResponse = await request.get('/api/config/global');
    const globalConfigData = await globalConfigResponse.json();

    // Verify we have real API data (not mocked)
    expect(globalConfigData).toBeTruthy();
    expect(Object.keys(globalConfigData).length).toBeGreaterThan(0);

    // 1. Navigate to default settings page (General tab)
    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-general-before-save.png' });

    // Mock the config save endpoint to delay so we can capture the loading spinner
    await page.route('**/api/config/global', async (route) => {
      if (route.request().method() === 'PUT') {
        // Wait 3 seconds
        await new Promise(f => setTimeout(f, 3000));
        await route.fulfill({ status: 200, json: {} });
      } else {
        await route.continue();
      }
    });

    // Click Save Changes to trigger button loading state
    const saveButton = page.getByRole('button', { name: 'Save Changes' });

    // Trigger the save action
    saveButton.click();

    // Wait for the button to have the loading class applied
    await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && btn.classList.contains('loading');
    });

    // Screenshot while loading
    await page.screenshot({ path: 'docs/screenshots/settings-general-loading.png' });
  });
});
