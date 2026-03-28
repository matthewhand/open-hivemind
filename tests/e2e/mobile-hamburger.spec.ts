import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Mobile Viewport & Touch Targets Baseline', () => {
  test('Capture Mobile Header Navigation', async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 375, height: 667 });

    // Mock API endpoints
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
    await page.route('**/api/csrf-token', (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
    );
    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );
    await page.route('**/api/dashboard/api/status', (route) =>
      route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
    );

    await page.goto('/admin/overview');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header, [role="banner"]').first();
    await expect(header).toBeVisible();

    await page.screenshot({ path: 'test-results/mobile-viewport-baseline-after.png' });
  });
});
