import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('System Health Page Screenshots', () => {
  test('capture System Health page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    await page.route('**/api/auth/check', (route) =>
      route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
    );

    await page.route('**/api/health/detailed/services', (route) =>
      route.fulfill({
        status: 200,
        json: {
          services: [
            {
              name: 'Database',
              status: 'healthy',
              latencyMs: 5,
              lastChecked: new Date().toISOString(),
              details: 'Connected and responding',
            },
            {
              name: 'LLM Providers',
              status: 'healthy',
              latencyMs: 12,
              lastChecked: new Date().toISOString(),
              details: '2/2 providers active',
            },
            {
              name: 'Memory Provider',
              status: 'healthy',
              latencyMs: 3,
              lastChecked: new Date().toISOString(),
              details: '1 active memory provider',
            },
            {
              name: 'Message Providers',
              status: 'degraded',
              latencyMs: 8,
              lastChecked: new Date().toISOString(),
              details: '1/2 providers connected',
            },
          ],
        },
      })
    );

    await page.route('**/health/detailed', (route) =>
      route.fulfill({
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
      })
    );

    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 86400,
          checks: {
            database: { status: 'healthy' },
            configuration: { status: 'healthy' },
            services: { status: 'healthy' },
          },
          memory: { used: 256, total: 512, usage: 50, percentage: 50 },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '6.0.0',
            hostname: 'test-host',
            loadAverage: [0.5, 0.3, 0.2],
            nodeVersion: 'v20.0.0',
          },
        },
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
      route.fulfill({ status: 200, json: { token: 'mock-csrf' } })
    );
    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );

    // Navigate to System Health page
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/admin/health');

    // Wait for the page to load
    await expect(page.getByText('System Health', { exact: true })).toBeVisible();
    await expect(page.getByText('Service Health')).toBeVisible();

    // Give it a moment to render widgets
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/admin-health-page.png', fullPage: true });
  });
});
