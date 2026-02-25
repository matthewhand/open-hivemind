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

    // Mock endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 86400 * 3.5, // 3.5 days
          memory: { used: 8192, total: 16384, usage: 50 },
          cpu: { user: 25.5, system: 10.2 },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '5.15.0',
            hostname: 'hivemind-prod-01',
            loadAverage: [2.5, 1.8, 1.2]
          }
        }
      })
    );

    await page.route('/api/health/api-endpoints', async (route) =>
      route.fulfill({
        status: 200,
        json: {
            overall: { status: 'healthy', message: 'All endpoints operational', stats: { total: 3, online: 3, slow: 0, offline: 0, error: 0 } },
            endpoints: [
                { id: '1', name: 'Database', status: 'online', responseTime: 12, lastChecked: new Date().toISOString(), errorMessage: null },
                { id: '2', name: 'OpenAI API', status: 'online', responseTime: 350, lastChecked: new Date().toISOString(), errorMessage: null },
                { id: '3', name: 'Discord Gateway', status: 'online', responseTime: 85, lastChecked: new Date().toISOString(), errorMessage: null }
            ],
            timestamp: new Date().toISOString()
        }
      })
    );

    await page.route('/api/dashboard/api/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              name: 'CustomerSupport',
              provider: 'discord',
              llmProvider: 'openai',
              status: 'active',
              healthDetails: { latency: '45ms' },
              connected: true,
              messageCount: 1245,
              errorCount: 2,
              responseTime: 150,
              uptime: 36000,
              lastActivity: new Date().toISOString()
            },
            {
              name: 'InternalOps',
              provider: 'slack',
              llmProvider: 'anthropic',
              status: 'warning',
              healthDetails: { latency: '300ms' },
              connected: true,
              messageCount: 542,
              errorCount: 15,
              responseTime: 450,
              uptime: 18000,
              lastActivity: new Date(Date.now() - 60000).toISOString()
            },
            {
              name: 'DevAssistant',
              provider: 'mattermost',
              llmProvider: 'local',
              status: 'active',
              healthDetails: { latency: '10ms' },
              connected: true,
              messageCount: 89,
              errorCount: 0,
              responseTime: 50,
              uptime: 86400,
              lastActivity: new Date(Date.now() - 3600000).toISOString()
            }
          ],
          uptime: 123456
        }
      })
    );

    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'CustomerSupport', messageProvider: 'discord', llmProvider: 'openai', persona: 'Support Agent' },
            { name: 'InternalOps', messageProvider: 'slack', llmProvider: 'anthropic', persona: 'Ops Manager' },
            { name: 'DevAssistant', messageProvider: 'mattermost', llmProvider: 'local', persona: 'Code Helper' }
          ],
          warnings: [],
          legacyMode: false,
          environment: 'production'
        }
      })
    );

    // Mock /api/config/global to avoid 404s
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );

    await page.route('/api/dashboard/api/activity', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          events: [
            {
              id: '1',
              timestamp: new Date().toISOString(),
              botName: 'CustomerSupport',
              provider: 'discord',
              llmProvider: 'openai',
              messageType: 'incoming',
              status: 'success',
              processingTime: 120,
              errorMessage: null
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 2000).toISOString(),
              botName: 'CustomerSupport',
              provider: 'discord',
              llmProvider: 'openai',
              messageType: 'outgoing',
              status: 'success',
              processingTime: 200,
              errorMessage: null
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 5000).toISOString(),
              botName: 'InternalOps',
              provider: 'slack',
              llmProvider: 'anthropic',
              messageType: 'incoming',
              status: 'success',
              processingTime: 150,
              errorMessage: null
            },
            {
              id: '4',
              timestamp: new Date(Date.now() - 8000).toISOString(),
              botName: 'InternalOps',
              provider: 'slack',
              llmProvider: 'anthropic',
              messageType: 'outgoing',
              status: 'timeout',
              processingTime: 5000,
              errorMessage: 'Response timed out'
            }
          ],
          filters: { agents: [], messageProviders: [], llmProviders: [] },
          timeline: [],
          agentMetrics: []
        }
      })
    );
  });

  test('capture Monitoring Dashboard screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 1200 }); // Taller to capture more content

    // Navigate to Monitoring page
    await page.goto('/admin/monitoring');

    // Wait for the page to load and specific elements to be visible
    // Wait for loading to finish
    await expect(page.getByText('Loading system health data...')).toBeHidden();

    // Wait for stats cards
    // Check for "Active Bots" which is unique
    await expect(page.getByText('Active Bots')).toBeVisible();

    // Wait for System Health tab content (default)
    await expect(page.getByRole('heading', { name: 'System Metrics' })).toBeVisible();

    // Open System Information accordion
    await page.getByText('System Information').click({ force: true });
    await expect(page.getByText('Host Details')).toBeVisible();

    await expect(page.getByText('CustomerSupport')).toBeHidden(); // Bot cards should be hidden in first tab

    // Take screenshot of System Health tab
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-health.png', fullPage: true });

    // Click "Bot Status" tab
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    await expect(page.getByRole('heading', { name: 'CustomerSupport', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'InternalOps', exact: true })).toBeVisible();

    // Take screenshot of Bot Status tab
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-bots.png', fullPage: true });

    // Click "Activity Monitor" tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();
    await expect(page.getByText('Recent Activity')).toBeVisible();
    await expect(page.getByText('Response timed out')).toBeVisible();

    // Take screenshot of Activity Monitor tab
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-activity.png', fullPage: true });
  });
});
