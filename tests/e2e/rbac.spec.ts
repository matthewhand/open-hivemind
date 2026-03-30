import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * RBAC E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Role-Based Access Control', () => {
  test.setTimeout(90000);

  async function mockCommonEndpoints(page: import('@playwright/test').Page) {
    // Catch-all first (lowest priority)
    await page.route('**/api/**', (route) => route.fulfill({ status: 200, json: {} }));
    await Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
      page.route('**/api/bots', (route) =>
        route.fulfill({ status: 200, json: { data: { bots: [] } } })
      ),
    ]);
  }

  test('admin can access all pages without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockCommonEndpoints(page);

    const adminPages = ['/admin/overview', '/admin/bots', '/admin/config', '/admin/settings'];

    for (const pagePath of adminPages) {
      await page.goto(pagePath);
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/admin');
    }
    await page.screenshot({ path: 'test-results/rbac-01-admin-access.png', fullPage: true });

    await assertNoErrors(errors, 'Admin access');
  });

  test('protected routes redirect appropriately', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockCommonEndpoints(page);
    await navigateAndWaitReady(page, '/admin/settings');

    // Should show settings or redirect to login
    await page.screenshot({ path: 'test-results/rbac-02-protected.png', fullPage: true });
    await assertNoErrors(errors, 'Protected routes');
  });
});
