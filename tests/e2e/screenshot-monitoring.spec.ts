import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Monitoring Dashboard Screenshots', () => {
  test('capture monitoring dashboard screenshot', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );

    // Mock Monitoring specific endpoints

    // 1. System Health (used by SystemHealth component)
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600 * 24 * 5, // 5 days
          memory: {
            used: 8 * 1024, // 8GB in MB
            total: 16 * 1024, // 16GB in MB
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
        },
      })
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
            {
              name: 'InternalHelper',
              provider: 'slack',
              llmProvider: 'anthropic',
              status: 'active',
              connected: true,
              messageCount: 89,
              errorCount: 0,
            },
            {
              name: 'DevBot',
              provider: 'mattermost',
              llmProvider: 'local',
              status: 'warning',
              connected: true,
              messageCount: 12,
              errorCount: 5,
            },
          ],
          uptime: 3600 * 24 * 5,
        },
      })
    );

    // 3. Config (used by MonitoringDashboard to get bot list)
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              name: 'CustomerSupportBot',
              messageProvider: 'discord',
              llmProvider: 'openai',
              persona: 'Customer Service',
            },
            {
              name: 'InternalHelper',
              messageProvider: 'slack',
              llmProvider: 'anthropic',
              persona: 'Assistant',
            },
            {
              name: 'DevBot',
              messageProvider: 'mattermost',
              llmProvider: 'local',
              persona: 'Developer',
            },
          ],
        },
      })
    );

    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    // Mock Dashboard Status (Bot Statuses)
    // We want a mix of statuses but overall healthy enough or at least clear
    await page.route('**/api/dashboard/api/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              name: 'CustomerSupportBot',
              status: 'healthy',
              connected: true,
              messageCount: 1542,
              errorCount: 0,
            },
            {
              name: 'InternalHelper',
              status: 'healthy',
              connected: true,
              messageCount: 89,
              errorCount: 0,
            },
            {
              name: 'DevBot',
              status: 'warning', // Warning to show it handles it, but not error
              connected: true,
              messageCount: 12,
              errorCount: 1,
            },
          ],
          uptime: 3600 * 24 * 5,
        },
      })
    );

    // Mock Activity
    await page.route('**/api/dashboard/api/activity*', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          events: [],
          timeline: [],
          agentMetrics: []
        },
      })
    );

    // Mock System Health (Infrastructure)
    await page.route('**/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600 * 24 * 5,
          memory: {
            used: 4096, // 4GB in MB
            total: 16384, // 16GB in MB
            usage: 25,
          },
          cpu: {
            user: 15000,
            system: 5000,
          },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '5.15.0',
            hostname: 'hivemind-server',
            loadAverage: [0.5, 0.4, 0.3],
          },
        },
      })
    );

    // Mock API Endpoints Status
    await page.route('**/health/api-endpoints', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          overall: {
            status: 'healthy',
            message: 'All systems operational',
            stats: { total: 3, online: 3, slow: 0, offline: 0, error: 0 },
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

    // Navigate to Monitoring Dashboard
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/monitoring');

    // Verification
    // Check for renamed card
    await expect(page.getByText('Ecosystem Status')).toBeVisible();

    // Check for renamed section - Verify both Tab and Header exist
    await expect(page.getByRole('tab', { name: 'Infrastructure Health' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Infrastructure Health' })).toBeVisible();

    // Check for correct memory formatting (approx 4.0 GB)
    // Use .last() or more specific locator to avoid matching parent card
    await expect(page.locator('.card', { hasText: 'Memory Usage' }).last()).toContainText('GB');

    // Check Status is Warning (because DevBot is warning)
    await expect(page.getByText('warning', { exact: true }).first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });
  });
});
