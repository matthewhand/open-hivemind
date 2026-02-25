import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Monitoring Dashboard Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock auth check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock /api/dashboard/api/status (for MonitoringDashboard overall status)
    await page.route('/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'SupportBot', provider: 'slack', llmProvider: 'openai', status: 'active', connected: true, messageCount: 150, errorCount: 0 },
            { name: 'DevBot', provider: 'discord', llmProvider: 'anthropic', status: 'active', connected: true, messageCount: 42, errorCount: 0 },
            { name: 'AlertBot', provider: 'mattermost', llmProvider: 'openai', status: 'error', connected: false, messageCount: 0, errorCount: 5 }
          ],
          uptime: 12345
        }
      });
    });

    // Mock /api/config (for MonitoringDashboard bots list)
    await page.route('/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'SupportBot', messageProvider: 'slack', llmProvider: 'openai', persona: 'Customer Support' },
            { name: 'DevBot', messageProvider: 'discord', llmProvider: 'anthropic', persona: 'Developer Assistant' },
            { name: 'AlertBot', messageProvider: 'mattermost', llmProvider: 'openai', persona: 'System Alerts' }
          ],
          warnings: [],
          legacyMode: false,
          environment: 'production'
        }
      });
    });

    // Mock /health/detailed (for SystemHealth)
    await page.route('/health/detailed', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 86400,
          memory: { used: 8 * 1024 * 1024 * 1024, total: 16 * 1024 * 1024 * 1024, usage: 50 },
          cpu: { user: 15, system: 5 },
          system: { platform: 'linux', arch: 'x64', release: '5.15.0', hostname: 'hivemind-server', loadAverage: [0.5, 0.6, 0.4] }
        }
      });
    });

    // Mock /api/dashboard/api/activity (for ActivityMonitor)
    await page.route('/api/dashboard/api/activity', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          events: [
            {
              id: '1', timestamp: new Date().toISOString(), botName: 'SupportBot', provider: 'slack', llmProvider: 'openai',
              channelId: 'C123', userId: 'U456', messageType: 'incoming', contentLength: 50, processingTime: 0, status: 'success'
            },
            {
              id: '2', timestamp: new Date(Date.now() - 2000).toISOString(), botName: 'SupportBot', provider: 'slack', llmProvider: 'openai',
              channelId: 'C123', userId: 'U456', messageType: 'outgoing', contentLength: 120, processingTime: 150, status: 'success'
            },
            {
              id: '3', timestamp: new Date(Date.now() - 10000).toISOString(), botName: 'AlertBot', provider: 'mattermost', llmProvider: 'openai',
              channelId: 'C789', userId: 'U999', messageType: 'outgoing', contentLength: 0, processingTime: 5000, status: 'error', errorMessage: 'Connection timed out'
            }
          ],
          filters: { agents: [], messageProviders: [], llmProviders: [] },
          timeline: [],
          agentMetrics: []
        }
      });
    });

    // Mock other endpoints
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true } }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
    await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock' } }));
  });

  test('capture monitoring dashboard screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1080 }); // Taller viewport to capture more
    await page.goto('/admin/monitoring');
    await expect(page.getByText('System Monitoring')).toBeVisible();

    // Check System Health tab (default)
    await expect(page.getByText('System Health', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('CPU Usage')).toBeVisible();
    await page.waitForTimeout(500); // Wait for animations
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-system.png', fullPage: true });

    // Check Bot Status tab
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    await expect(page.getByText('SupportBot').first()).toBeVisible();
    await page.waitForTimeout(500); // Wait for animations
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-bots.png', fullPage: true });

    // Check Activity Monitor tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();
    await expect(page.getByText('Activity Monitor').nth(1)).toBeVisible(); // There might be multiple "Activity Monitor" texts (tab label + card title)
    // Actually, "Activity Monitor" is in the tab label and the card title.
    // Use card title explicitly or just wait for something specific in activity monitor like "Live monitoring active"
    await expect(page.getByText('Live monitoring active')).toBeVisible();
    await page.waitForTimeout(500); // Wait for animations
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard-activity.png', fullPage: true });
  });
});
