import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Monitoring Dashboard Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock System Status (for Overall Health and Bot Status)
    await page.route('/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          uptime: 123456,
          bots: [
            {
              name: 'Support Bot',
              provider: 'slack',
              llmProvider: 'openai',
              status: 'active',
              connected: true,
              messageCount: 1542,
              errorCount: 3,
              healthDetails: { latency: '45ms' },
            },
            {
              name: 'Dev Assistant',
              provider: 'discord',
              llmProvider: 'anthropic',
              status: 'warning',
              connected: true,
              messageCount: 89,
              errorCount: 12,
              healthDetails: { latency: '120ms' },
            },
          ],
        },
      });
    });

    // Mock Config (for Bot List in Dashboard)
    await page.route('/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              name: 'Support Bot',
              messageProvider: 'slack',
              llmProvider: 'openai',
              persona: 'Customer Support',
            },
            {
              name: 'Dev Assistant',
              messageProvider: 'discord',
              llmProvider: 'anthropic',
              persona: 'Developer Helper',
            },
          ],
        },
      });
    });

    // Mock Detailed System Health
    await page.route('/health/detailed', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          uptime: 123456,
          memory: {
            used: 8500 * 1024 * 1024, // 8.5GB
            total: 16000 * 1024 * 1024, // 16GB
            usage: 53.1,
          },
          cpu: {
            user: 12.5,
            system: 4.2,
          },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '5.15.0',
            hostname: 'prod-server-01',
            loadAverage: [1.2, 0.8, 0.5],
          },
        },
      });
    });

    // Mock API Endpoints Status
    await page.route('/health/api-endpoints', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          overall: { status: 'healthy', message: 'All systems operational', stats: {} },
          endpoints: [
            {
              id: '1',
              name: 'OpenAI API',
              url: 'https://api.openai.com',
              status: 'online',
              responseTime: 145,
              lastChecked: new Date().toISOString(),
            },
            {
              id: '2',
              name: 'Discord Gateway',
              url: 'wss://gateway.discord.gg',
              status: 'online',
              responseTime: 89,
              lastChecked: new Date().toISOString(),
            },
            {
              id: '3',
              name: 'Internal Database',
              url: 'postgres://localhost:5432',
              status: 'slow',
              responseTime: 450,
              errorMessage: 'Latency spike detected',
              lastChecked: new Date().toISOString(),
            },
          ],
        },
      });
    });

    // Mock Activity
    await page.route('/api/dashboard/api/activity*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          events: [
            {
              id: '1',
              timestamp: new Date().toISOString(),
              botName: 'Support Bot',
              provider: 'slack',
              llmProvider: 'openai',
              messageType: 'incoming',
              status: 'success',
              contentLength: 45,
              processingTime: 120,
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 5000).toISOString(),
              botName: 'Support Bot',
              provider: 'slack',
              llmProvider: 'openai',
              messageType: 'outgoing',
              status: 'success',
              contentLength: 200,
              processingTime: 450,
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 15000).toISOString(),
              botName: 'Dev Assistant',
              provider: 'discord',
              llmProvider: 'anthropic',
              messageType: 'incoming',
              status: 'error',
              errorMessage: 'Rate limit exceeded',
              contentLength: 10,
              processingTime: 0,
            },
          ],
        },
      });
    });
  });

  test('capture monitoring dashboard screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 1200 });

    // Navigate to Monitoring Dashboard
    await page.goto('/admin/monitoring');

    // Wait for key elements to load
    await expect(page.getByRole('heading', { name: 'System Monitoring Dashboard' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'System Health' })).toBeVisible();

    // Wait for content to load (stats cards)
    await expect(page.getByText('Connected / Total')).toBeVisible(); // Active Bots description

    // Take full page screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });

    // Switch to Bot Status tab
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    await expect(page.getByText('Support Bot')).toBeVisible();
    await expect(page.getByText('Dev Assistant')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/monitoring-bots.png' });

    // Switch to Activity Monitor tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();
    await expect(page.getByText('Rate limit exceeded')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/monitoring-activity.png' });
  });
});
