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
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Status API
    await page.route('/api/dashboard/api/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'Support Bot', provider: 'slack', llmProvider: 'openai', status: 'active', connected: true, messageCount: 1245, errorCount: 2 },
            { name: 'Dev Assistant', provider: 'discord', llmProvider: 'anthropic', status: 'active', connected: true, messageCount: 850, errorCount: 0 },
            { name: 'Analytics Bot', provider: 'mattermost', llmProvider: 'local', status: 'warning', connected: true, messageCount: 340, errorCount: 15 },
            { name: 'Testing Bot', provider: 'slack', llmProvider: 'openai', status: 'error', connected: false, messageCount: 10, errorCount: 50 },
          ],
          uptime: 259200, // 3 days in seconds
        },
      })
    );

    // Mock Config API
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'Support Bot', messageProvider: 'slack', llmProvider: 'openai', persona: 'Customer Support' },
            { name: 'Dev Assistant', messageProvider: 'discord', llmProvider: 'anthropic', persona: 'Coding Helper' },
            { name: 'Analytics Bot', messageProvider: 'mattermost', llmProvider: 'local', persona: 'Data Analyst' },
            { name: 'Testing Bot', messageProvider: 'slack', llmProvider: 'openai', persona: 'Test Bot' },
          ],
          warnings: [],
          legacyMode: false,
          environment: 'production',
        },
      })
    );

    // Mock System Health Detailed API
    await page.route('/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 259200,
          memory: { used: 4 * 1024 * 1024 * 1024, total: 16 * 1024 * 1024 * 1024, usage: 25 },
          cpu: { user: 12.5, system: 5.2 },
          system: { platform: 'linux', arch: 'x64', release: '5.15.0', hostname: 'server-prod-01', loadAverage: [0.45, 0.32, 0.28] },
        },
      })
    );

    // Mock Activity API
    await page.route('/api/dashboard/api/activity*', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          events: [
            { id: '1', timestamp: new Date().toISOString(), botName: 'Support Bot', provider: 'slack', llmProvider: 'openai', channelId: 'C123', userId: 'U456', messageType: 'incoming', contentLength: 45, status: 'success' },
            { id: '2', timestamp: new Date(Date.now() - 2000).toISOString(), botName: 'Support Bot', provider: 'slack', llmProvider: 'openai', channelId: 'C123', userId: 'U456', messageType: 'outgoing', contentLength: 120, processingTime: 450, status: 'success' },
            { id: '3', timestamp: new Date(Date.now() - 5000).toISOString(), botName: 'Analytics Bot', provider: 'mattermost', llmProvider: 'local', channelId: 'town-square', userId: 'me', messageType: 'incoming', contentLength: 12, status: 'success' },
            { id: '4', timestamp: new Date(Date.now() - 5500).toISOString(), botName: 'Analytics Bot', provider: 'mattermost', llmProvider: 'local', channelId: 'town-square', userId: 'me', messageType: 'outgoing', contentLength: 0, processingTime: 2000, status: 'timeout', errorMessage: 'Response timed out' },
          ],
          filters: { agents: ['Support Bot', 'Dev Assistant'], messageProviders: ['slack', 'discord'], llmProviders: ['openai', 'anthropic'] },
          timeline: [],
          agentMetrics: [],
        },
      })
    );

    // Mock other config endpoints to prevent errors
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
  });

  test('capture monitoring dashboard screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 }); // Taller viewport to capture more content

    // Navigate to Monitoring page
    await page.goto('/admin/monitoring');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'System Monitoring' })).toBeVisible();

    // Wait for stats to be displayed
    await expect(page.getByText('Active Bots', { exact: true })).toBeVisible();

    // Wait for loading spinners to disappear
    await expect(page.locator('.loading-spinner')).not.toBeVisible();

    // Wait a bit for animations or charts to settle
    await page.waitForTimeout(1000);

    // Take full page screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });

    // Switch to Activity Monitor tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();

    // Wait for activity table
    await expect(page.getByRole('heading', { name: 'Activity Monitor' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // Take screenshot of activity monitor
    await page.screenshot({ path: 'docs/screenshots/monitoring-activity.png', fullPage: true });

    // Switch to Bot Status tab (default was System Health? No, MonitoringDashboard sets activeTab=0 which is System Health)
    // Actually the dashboard renders 3 tabs.
    // Let's verify System Health tab content
    await page.getByRole('tab', { name: 'System Health' }).click();
    await expect(page.getByRole('heading', { name: 'System Metrics' })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/monitoring-system.png', fullPage: true });

    // Switch to Bot Status tab
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    await expect(page.getByRole('heading', { name: 'Support Bot' })).toBeVisible();

    // Open details for Support Bot
    await page.getByRole('button', { name: 'Details' }).first().click();
    const detailsModal = page.locator('.modal-box').filter({ hasText: 'Bot Details - Support Bot' });
    await expect(detailsModal).toBeVisible();
    await expect(detailsModal.getByText('Basic Information')).toBeVisible();

    await page.screenshot({ path: 'docs/screenshots/monitoring-bot-details.png' });
  });
});
