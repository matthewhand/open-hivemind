import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/admin/guard-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
    await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));
    await page.route('/api/webui/system-status', async (route) => route.fulfill({ status: 200, json: {} }));

    // Mock export endpoints to prevent errors if clicked (though we mainly just screenshot)
    await page.route('/webui/api/openapi.json', async (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ openapi: '3.0.0', info: { title: 'Mock API' } }) })
    );
    await page.route('/webui/api/openapi.yaml', async (route) =>
        route.fulfill({ status: 200, contentType: 'application/x-yaml', body: 'openapi: 3.0.0\ninfo:\n  title: Mock API' })
    );
  });

  test('capture export page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Export page
    await page.goto('/admin/export');

    // Wait for header to be visible
    await expect(page.locator('h1')).toHaveText('Export & Documentation');

    // Wait for cards to appear
    await expect(page.locator('.card').first()).toBeVisible();

    // Take full page screenshot
    await page.screenshot({ path: 'docs/screenshots/export-page.png', fullPage: true });
  });
});
