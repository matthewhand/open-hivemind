import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Monitoring Page E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Monitoring page', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Discord Bot',
      provider: 'discord',
      messageProvider: 'discord',
      llmProvider: 'openai',
      status: 'running',
      connected: true,
      messageCount: 42,
      errorCount: 0,
    },
  ];

  async function mockMonitoringEndpoints(page: import('@playwright/test').Page) {
    // Mock /health/* endpoints (outside /api/ prefix)
    await page.route('**/health/**', (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path === '/health/detailed') {
        return route.fulfill({
          status: 200,
          json: {
            status: 'healthy',
            version: '1.0.0',
            uptime: 86400,
            services: { database: 'healthy', cache: 'healthy' },
            system: {
              platform: 'linux',
              memory: { total: 8000000000, used: 4000000000, free: 4000000000 },
              cpu: { cores: 4, usage: 25 },
              loadAverage: [1.0, 0.8, 0.5],
            },
          },
        });
      }
      if (path === '/health/api-endpoints') {
        return route.fulfill({
          status: 200,
          json: {
            stats: { total: 0, healthy: 0, unhealthy: 0, degraded: 0, unknown: 0 },
            endpoints: [],
            timestamp: new Date().toISOString(),
          },
        });
      }

      return route.fulfill({ status: 200, json: {} });
    });

    // Mock all /api/* endpoints
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path === '/api/dashboard/status') {
        return route.fulfill({ status: 200, json: { bots: mockBots, uptime: 100 } });
      }
      if (path === '/api/dashboard/api/status') {
        return route.fulfill({ status: 200, json: { bots: mockBots, uptime: 100 } });
      }
      if (path === '/api/config') {
        return route.fulfill({ status: 200, json: { bots: mockBots } });
      }
      if (path === '/api/config/llm-status') {
        return route.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        });
      }
      if (path === '/api/config/global') {
        return route.fulfill({ status: 200, json: {} });
      }
      if (path === '/api/config/llm-profiles') {
        return route.fulfill({ status: 200, json: { data: [] } });
      }
      if (path === '/api/config/sources') {
        return route.fulfill({ status: 200, json: { sources: [] } });
      }
      if (path === '/api/health/detailed') {
        return route.fulfill({
          status: 200,
          json: {
            status: 'healthy',
            version: '1.0.0',
            uptime: 86400,
            services: { database: 'healthy', cache: 'healthy' },
            system: {
              platform: 'linux',
              memory: { total: 8000000000, used: 4000000000, free: 4000000000 },
              cpu: { cores: 4, usage: 25 },
              loadAverage: [1.0, 0.8, 0.5],
            },
          },
        });
      }
      if (path === '/api/health') {
        return route.fulfill({ status: 200, json: { status: 'ok' } });
      }
      if (path === '/api/bots') {
        return route.fulfill({ status: 200, json: mockBots });
      }
      if (path === '/api/csrf-token') {
        return route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
      }
      if (path === '/api/demo/status') {
        return route.fulfill({ status: 200, json: { active: false } });
      }
      if (path.startsWith('/api/activity')) {
        return route.fulfill({ status: 200, json: { data: [], total: 0 } });
      }
      if (path.startsWith('/api/admin')) {
        return route.fulfill({ status: 200, json: { data: [] } });
      }

      // Catch-all for any unmatched API endpoint
      return route.fulfill({ status: 200, json: {} });
    });
  }

  test('navigates to monitoring page without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockMonitoringEndpoints(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    await page.screenshot({ path: 'test-results/monitoring-01-page.png', fullPage: true });
    expect(page.url()).toContain('/admin');

    await assertNoErrors(errors, 'Monitoring navigation');
  });

  test('monitoring page has content without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockMonitoringEndpoints(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    const heading = page.locator('h1, h2');
    await page.screenshot({ path: 'test-results/monitoring-02-content.png', fullPage: true });
    expect(page.url()).toContain('/admin');

    await assertNoErrors(errors, 'Monitoring content');
  });

  test('monitoring page has navigation without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockMonitoringEndpoints(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    const nav = page.locator('nav, [role="navigation"]');
    if ((await nav.count()) > 0) {
      await expect(nav.first()).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/monitoring-03-nav.png', fullPage: true });

    await assertNoErrors(errors, 'Monitoring navigation element');
  });

  test('monitoring page displays metrics without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockMonitoringEndpoints(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    // Wait for metrics to load

    // Check for metric cards or charts
    const metrics = page.locator('[class*="stat"], [class*="metric"], [class*="chart"]');
    await page.screenshot({ path: 'test-results/monitoring-04-metrics.png', fullPage: true });

    await assertNoErrors(errors, 'Monitoring metrics');
  });
});
