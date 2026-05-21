import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Help Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints to prevent errors/warnings
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
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
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
  });

  test('Help Page List', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Help page. The router puts it under /admin/help because of the nested routes
    await page.goto('/admin/help');

    // Wait for the page to load
    await expect(page.locator('text=Help & FAQ').first()).toBeVisible();

    // Take screenshot of the entire page
    await page.screenshot({
      path: 'docs/screenshots/help-page.png',
      fullPage: true,
    });
  });
});
