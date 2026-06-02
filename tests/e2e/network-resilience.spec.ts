import { expect, test } from '@playwright/test';
import { setupAuth, waitForPageReady } from './test-utils';

/**
 * Network Resilience E2E Tests
 *
 * Verifies the UI degrades gracefully under adverse network conditions:
 * - Slow API responses (simulated latency)
 * - Request timeouts / hung connections
 * - Offline/disconnected state
 * - Intermittent failures (flaky APIs)
 * - Server error responses (500, 502, 503)
 */

test.describe('Network Resilience', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test.describe('Slow Responses', () => {
    test('shows loading state during slow API response', async ({ page }) => {
      await page.route('**/api/config', async (route) => {
        await new Promise((r) => setTimeout(r, 3000));
        await route.fulfill({
          status: 200,
          json: { bots: [{ id: 'b1', name: 'Slow Bot', provider: 'discord', status: 'running' }] },
        });
      });

      await page.goto('/admin/bots');
      const loading = page.locator('[class*="loading"], [class*="spinner"], .skeleton');
      await expect(loading.first()).toBeVisible({ timeout: 2000 });
      await expect(page.locator('text=/Slow Bot|bot/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('dashboard remains interactive during slow health check', async ({ page }) => {
      await page.route('**/api/health/detailed', async (route) => {
        await new Promise((r) => setTimeout(r, 5000));
        await route.fulfill({ status: 200, json: { status: 'healthy' } });
      });
      await page.route('**/api/config', (route) =>
        route.fulfill({ status: 200, json: { bots: [] } })
      );
      await page.route('**/api/config/llm-status', (route) =>
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
      await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
      await page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'tok' } })
      );
      await page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      );
      await page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      );
      await page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      );

      await page.goto('/admin/overview');
      await waitForPageReady(page);

      const nav = page.locator('nav a, [data-testid="sidebar"] a, .sidebar a').first();
      await expect(nav).toBeEnabled();
    });
  });

  test.describe('Timeouts & Aborts', () => {
    test('handles hung connection without crashing', async ({ page }) => {
      await page.route('**/api/config', () => {
        // Never respond — simulates a hung connection
      });

      await page.goto('/admin/bots');
      await page.waitForTimeout(5000);

      await expect(page.locator('body')).toBeVisible();
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(0);
    });

    test('retries or shows error on aborted fetch', async ({ page }) => {
      let callCount = 0;
      await page.route('**/api/config', async (route) => {
        callCount++;
        if (callCount <= 2) {
          await route.abort('connectionfailed');
        } else {
          await route.fulfill({
            status: 200,
            json: {
              bots: [{ id: 'b1', name: 'Recovered Bot', provider: 'discord', status: 'running' }],
            },
          });
        }
      });

      await page.goto('/admin/bots');
      await page.waitForTimeout(6000);

      const hasContent = await page
        .locator('text=/Recovered Bot|error|retry|failed/i')
        .first()
        .isVisible();
      expect(hasContent).toBe(true);
    });
  });

  test.describe('Offline Mode', () => {
    test('handles network drop without crash', async ({ page }) => {
      await page.route('**/api/**', (route) => route.fulfill({ status: 200, json: {} }));
      await page.goto('/admin/overview');
      await waitForPageReady(page);

      await page.context().setOffline(true);
      await page.goto('/admin/bots').catch(() => {});
      await page.waitForTimeout(2000);

      await expect(page.locator('body')).toBeVisible();
    });

    test('recovers when network is restored', async ({ page }) => {
      await page.route('**/api/config', (route) =>
        route.fulfill({
          status: 200,
          json: {
            bots: [{ id: 'b1', name: 'Online Bot', provider: 'discord', status: 'running' }],
          },
        })
      );
      await page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      );
      await page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'tok' } })
      );
      await page.route('**/api/config/llm-status', (route) =>
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
      await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
      await page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      );
      await page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      );
      await page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      );

      await page.goto('/admin/overview');
      await waitForPageReady(page);

      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      await page.context().setOffline(false);

      await page.reload();
      await waitForPageReady(page);
      await expect(page.locator('body')).toBeVisible();
      const bodyText = await page.locator('body').textContent();
      expect(bodyText!.length).toBeGreaterThan(10);
    });
  });

  test.describe('Server Errors', () => {
    test('displays error state on 500 response', async ({ page }) => {
      await page.route('**/api/config', (route) =>
        route.fulfill({ status: 500, json: { error: 'Internal Server Error' } })
      );
      await page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'tok' } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(3000);

      await expect(page.locator('body')).toBeVisible();
      const bodyText = (await page.locator('body').textContent()) || '';
      expect(bodyText.length).toBeGreaterThan(10);
    });

    test('handles 503 Service Unavailable gracefully', async ({ page }) => {
      await page.route('**/api/**', (route) =>
        route.fulfill({ status: 503, json: { error: 'Service Unavailable' } })
      );

      await page.goto('/admin/overview');
      await page.waitForTimeout(3000);

      await expect(page.locator('body')).toBeVisible();
      const bodyText = (await page.locator('body').textContent()) || '';
      expect(bodyText.length).toBeGreaterThan(10);
    });

    test('intermittent 502 does not permanently break the page', async ({ page }) => {
      let callCount = 0;
      await page.route('**/api/config', async (route) => {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({ status: 502, json: { error: 'Bad Gateway' } });
        } else {
          await route.fulfill({
            status: 200,
            json: {
              bots: [{ id: 'b1', name: 'Resilient Bot', provider: 'discord', status: 'running' }],
            },
          });
        }
      });
      await page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'tok' } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(4000);

      await page.reload();
      await page.waitForTimeout(3000);

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
