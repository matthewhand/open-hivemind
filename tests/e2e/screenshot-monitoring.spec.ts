import { expect, test } from '@playwright/test';
import { setupAuth, setupErrorCollection } from './test-utils';

test.describe('Monitoring Dashboard Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    setupErrorCollection(page);
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock layout dependencies
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );
    await page.route(
      '/api/config/global',
      async (route) => route.fulfill({ status: 200, json: { bots: [] } }) // config/global returns object with sections
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Monitoring specific endpoints

    // 1. System Health (used by SystemHealth component)
    // Note: The app requests /health/detailed, but in some configs it might be proxied or prefixed.
    // We mock both to be safe.
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 3600 * 24 * 5, // 5 days
      memory: {
        used: 8 * 1024, // 8GB (Server returns MB) - Adjusted to match server behavior (MB) so frontend converts it back to GB
        total: 16 * 1024, // 16GB (Server returns MB)
        usage: 50,
      },
      cpu: {
        user: 15,
        system: 5,
      },
      system: {
        platform: 'linux',
        arch: 'x64',
        release: '5.15.0',
        hostname: 'prod-server-01',
        loadAverage: [0.5, 0.4, 0.3],
      },
    };

    await page.route('**/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: healthData })
    );

    // Also mock /api/health/detailed for backward compatibility or proxy config
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: healthData })
    );

    // 2. Dashboard Status (used by MonitoringDashboard to get bot statuses)
    await page.route('/api/dashboard/api/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              name: 'CustomerSupportBot',
              provider: 'discord',
              llmProvider: 'openai',
              status: 'active',
              connected: true,
              messageCount: 1542,
              errorCount: 2,
            },
          ],
          uptime: 3600 * 24 * 5,
        },
      })
    );

    // 5. API Endpoints Status (used by SystemHealth)
    await page.route('**/health/api-endpoints', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          overall: {
            status: 'healthy',
            message: 'All systems operational',
            stats: {
              total: 3,
              online: 3,
              slow: 0,
              offline: 0,
              error: 0,
            },
          },
          endpoints: [
            {
              id: '1',
              name: 'Database',
              url: 'postgres://localhost:5432',
              status: 'online',
              responseTime: 5,
              lastChecked: new Date().toISOString(),
            },
            {
              id: '2',
              name: 'Redis',
              url: 'redis://localhost:6379',
              status: 'online',
              responseTime: 2,
              lastChecked: new Date().toISOString(),
            },
            {
              id: '3',
              name: 'LLM API',
              url: 'https://api.openai.com',
              status: 'online',
              responseTime: 150,
              lastChecked: new Date().toISOString(),
            },
          ],
          timestamp: new Date().toISOString(),
        },
      })
    );
  });

  test('capture monitoring dashboard screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/monitoring');

    // Wait for key elements to be visible
    // 1. The main dashboard header
    await expect(page.getByText('Monitoring Dashboard', { exact: true })).toBeVisible();

    // 2. Status Cards (populated from health data)
    await expect(page.getByText('System Health', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('CPU Load', { exact: true })).toBeVisible();
    await expect(page.getByText('Memory', { exact: true }).first()).toBeVisible();

    // 3. System Health Component (Detailed info)
    await expect(page.getByText('System Health Monitor', { exact: true })).toBeVisible();

    // Expand the accordion to show details
    await page.getByText('Detailed System Information').click({ force: true });

    // Check for specific system info (platform, hostname)
    await expect(page.getByText('linux', { exact: true })).toBeVisible();
    await expect(page.getByText('prod-server-01', { exact: true })).toBeVisible();

    // 4. Check API endpoints are listed
    await expect(page.getByText('Database', { exact: true })).toBeVisible();
    await expect(page.getByText('Redis', { exact: true })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });
  });
});
