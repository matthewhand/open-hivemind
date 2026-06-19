import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation with Real API Data', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    let resolvePutPromise: () => void;
    const putPromise = new Promise<void>((resolve) => {
      resolvePutPromise = resolve;
    });

    await page.route('**/api/config/global', async (route) => {
      if (route.request().method() === 'PUT') {
        // Wait indefinitely until resolvePutPromise is called to capture loading spinner
        await putPromise;
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
    // Heading is tag-agnostic (General Settings is an <h2>, others <h5>)
    await page.getByRole('heading', { name: 'General Settings' }).waitFor({ state: 'visible' });

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-general.png' });

    // Click Save Changes to trigger button loading state
    const saveButton = page.getByRole('button', { name: 'Save Settings' });

    // Trigger the save action
    await saveButton.click();

    // Button signals loading via aria-busy (a child spinner), not a class on the button
    await expect(saveButton).toHaveAttribute('aria-busy', 'true');

    // Screenshot while loading
    await page.screenshot({ path: 'docs/screenshots/settings-general-loading.png' });

    // Resolve the promise to let the request complete
    resolvePutPromise!();

    // Loading cleared once the request completes
    await expect(saveButton).toHaveAttribute('aria-busy', 'false');

    // Check Secure Configuration Manager on Security tab
    await page.goto('/admin/settings?tab=security');
    await page.getByRole('heading', { name: 'Security Settings' }).waitFor({ state: 'visible' });

    // Screenshot Security Tab
    await page.screenshot({ path: 'docs/screenshots/settings-security.png', fullPage: true });
  });
});
