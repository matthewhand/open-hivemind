import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Static Pages Screenshots', () => {
  test('Capture Static Pages', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

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
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
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

    // Navigate to Static Pages
    await navigateAndWaitReady(page, '/admin/static');

    // Wait for content to load properly - page might be at /admin/static or redirected
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState('networkidle');

    // Screenshot Static Pages
    await page.screenshot({ path: 'docs/screenshots/static-pages.png', fullPage: true });
  });
});
