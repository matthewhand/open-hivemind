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
    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 123456,
          memory: { used: 8500 * 1024 * 1024, total: 16000 * 1024 * 1024, usage: 53.1 },
          cpu: { user: 15, system: 5 },
          system: { platform: 'linux', arch: 'x64', release: '5.15.0', hostname: 'prod-server', loadAverage: [0.45, 0.32, 0.28] }
        })
      });
    });

    await page.route('**/api/dashboard/api/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            { name: 'SupportBot', provider: 'discord', llmProvider: 'openai', status: 'active', connected: true, messageCount: 1250, errorCount: 2, responseTime: 245, uptime: 86400 },
            { name: 'SalesAssistant', provider: 'slack', llmProvider: 'anthropic', status: 'active', connected: true, messageCount: 843, errorCount: 0, responseTime: 180, uptime: 43200 },
            { name: 'DevOpsBot', provider: 'mattermost', llmProvider: 'local', status: 'warning', connected: true, messageCount: 42, errorCount: 5, responseTime: 850, uptime: 21600 }
          ],
          uptime: 123456
        })
      });
    });

    await page.route('**/api/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            { name: 'SupportBot', messageProvider: 'discord', llmProvider: 'openai' },
            { name: 'SalesAssistant', messageProvider: 'slack', llmProvider: 'anthropic' },
            { name: 'DevOpsBot', messageProvider: 'mattermost', llmProvider: 'local' }
          ],
          warnings: [],
          legacyMode: false,
          environment: 'production'
        })
      });
    });

    await page.route('**/api/dashboard/api/activity', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: '1',
              timestamp: new Date().toISOString(),
              botName: 'SupportBot',
              provider: 'discord',
              llmProvider: 'openai',
              channelId: '123',
              userId: 'user1',
              messageType: 'incoming',
              contentLength: 45,
              status: 'success',
              processingTime: 210
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 5000).toISOString(),
              botName: 'SalesAssistant',
              provider: 'slack',
              llmProvider: 'anthropic',
              channelId: '456',
              userId: 'user2',
              messageType: 'outgoing',
              contentLength: 120,
              status: 'success',
              processingTime: 350
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 15000).toISOString(),
              botName: 'DevOpsBot',
              provider: 'mattermost',
              llmProvider: 'local',
              channelId: '789',
              userId: 'admin',
              messageType: 'incoming',
              contentLength: 12,
              status: 'error',
              errorMessage: 'Context length exceeded',
              processingTime: 1200
            }
          ],
          filters: { agents: ['SupportBot', 'SalesAssistant', 'DevOpsBot'], messageProviders: ['discord', 'slack', 'mattermost'], llmProviders: ['openai', 'anthropic', 'local'] },
          timeline: [],
          agentMetrics: []
        })
      });
    });

    // Other mocks to prevent errors
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true } }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
  });

  test('capture Monitoring Dashboard screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Monitoring Page
    await page.goto('/admin/monitoring');

    // Wait for content
    await expect(page.locator('h1')).toContainText('System Monitoring Dashboard');

    // Wait for loading to finish
    await expect(page.getByText('Loading system health data...')).toBeHidden();

    // Verify tabs exist
    await expect(page.getByRole('tab', { name: 'System Health' })).toBeVisible();

    // Take main screenshot (System Health tab)
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-health.png', fullPage: true });

    // Switch to Bot Status Tab
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    await expect(page.getByText('SupportBot')).toBeVisible();

    // Take Bot Status screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-bots.png', fullPage: true });

    // Switch to Activity Monitor Tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();
    await expect(page.getByRole('heading', { name: 'Activity Monitor' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SupportBot' })).toBeVisible();

    // Take Activity Monitor screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-activity.png', fullPage: true });
  });
});
