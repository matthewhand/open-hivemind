import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Demo Mode Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
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

    // Mock Demo Mode Status to be ACTIVE
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          isDemoMode: true,
          botCount: 3,
          conversationCount: 15,
          messageCount: 142,
          isSimulationRunning: true,
        },
      })
    );

    // Mock bots response for dashboard
    await page.route('**/api/bots', async (route) =>
      route.fulfill({ status: 200, json: { data: { bots: [] } } })
    );
    await page.route('**/api/dashboard/summary', async (route) =>
      route.fulfill({
        status: 200,
        json: { totalBots: 3, activeBots: 3, providers: { llms: 2, message: 2 } },
      })
    );
    await page.route('**/api/dashboard/recent-activity*', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
  });

  test('capture Demo Mode Banner screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to dashboard
    await page.goto('/admin');

    // Wait for banner to appear
    await expect(page.getByText('Demo Mode Active')).toBeVisible({ timeout: 10000 });

    // Take screenshot of just the banner element
    const banner = page.locator('.bg-primary.text-primary-content');
    await banner.screenshot({ path: 'docs/screenshots/demo-mode-banner.png' });

    // Also take full page screenshot to show it in context
    await page.screenshot({ path: 'docs/screenshots/demo-mode-dashboard.png', fullPage: true });
  });
});
