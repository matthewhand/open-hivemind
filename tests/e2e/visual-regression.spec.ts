import { expect, test } from '@playwright/test';
import { setupAuth, waitForPageReady } from './test-utils';

/**
 * Visual Regression Tests
 *
 * Uses Playwright's built-in toHaveScreenshot() to detect unintended UI changes.
 * On first run, baseline screenshots are generated in tests/e2e/visual-regression.spec.ts-snapshots/.
 * Subsequent runs compare against baselines and fail on pixel drift beyond threshold.
 *
 * Update baselines: npx playwright test visual-regression --update-snapshots
 */

const CRITICAL_PAGES = [
  { path: '/admin/overview', name: 'dashboard' },
  { path: '/admin/bots', name: 'bots-list' },
  { path: '/admin/providers/llm', name: 'llm-providers' },
  { path: '/admin/providers/message', name: 'message-providers' },
  { path: '/admin/guards', name: 'guards' },
  { path: '/admin/settings', name: 'settings' },
  { path: '/admin/monitoring', name: 'monitoring' },
  { path: '/admin/personas', name: 'personas' },
];

test.describe('Visual Regression', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy', uptime: 86400 } })
    );
    await page.route('**/api/config', (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              id: 'vr-bot-1',
              name: 'Visual Bot',
              provider: 'discord',
              status: 'running',
              connected: true,
              messageCount: 10,
              errorCount: 0,
            },
          ],
        },
      })
    );
    await page.route('**/api/personas', (route) =>
      route.fulfill({
        status: 200,
        json: [{ id: 'p1', name: 'Default Persona', description: 'A test persona' }],
      })
    );
    await page.route('**/api/guards', (route) =>
      route.fulfill({
        status: 200,
        json: { guards: [{ id: 'g1', name: 'Rate Limiter', enabled: true }] },
      })
    );
    await page.route('**/api/admin/llm-profiles', (route) =>
      route.fulfill({
        status: 200,
        json: [{ id: 'llm1', name: 'OpenAI', provider: 'openai', model: 'gpt-4' }],
      })
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
      route.fulfill({ status: 200, json: { token: 'vr-csrf' } })
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
    await page.route('**/api/monitoring/**', (route) =>
      route.fulfill({ status: 200, json: { metrics: [], events: [] } })
    );
    await page.route('**/api/message-providers', (route) =>
      route.fulfill({
        status: 200,
        json: [{ id: 'mp1', name: 'Discord', type: 'discord', status: 'connected' }],
      })
    );
  });

  for (const { path, name } of CRITICAL_PAGES) {
    test(`${name} page has no visual regression`, async ({ page }) => {
      await page.goto(path);
      await waitForPageReady(page);

      // Mask dynamic content to reduce flakiness
      await page.evaluate(() => {
        document
          .querySelectorAll('time, [data-testid*="timestamp"], [class*="uptime"]')
          .forEach((el) => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
      });

      await expect(page).toHaveScreenshot(`${name}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
        mask: [page.locator('[class*="spinner"], [class*="loading"]')],
      });
    });
  }

  test('responsive layout - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/overview');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('responsive layout - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/overview');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('dark mode toggle visual consistency', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/overview');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});
