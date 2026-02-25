import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Monitoring Dashboard Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock System Health
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 360000,
          memory: { used: 8589934592, total: 17179869184, usage: 50 },
          cpu: { user: 25, system: 10 },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '5.15.0-101-generic',
            hostname: 'hivemind-server',
            loadAverage: [0.5, 0.3, 0.1]
          }
        }
      })
    );

    // Mock API Endpoints Status (Health Checks)
    await page.route('/api/health/api-endpoints', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                overall: { status: 'healthy' },
                endpoints: [
                    { id: '1', name: 'Database', status: 'online', errorMessage: null, lastChecked: new Date().toISOString() },
                    { id: '2', name: 'Redis', status: 'online', errorMessage: null, lastChecked: new Date().toISOString() },
                    { id: '3', name: 'LLM API', status: 'online', errorMessage: null, lastChecked: new Date().toISOString() }
                ],
                timestamp: new Date().toISOString()
            }
        })
    );

    // Mock Dashboard Status
    await page.route('/api/dashboard/api/status', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                bots: [
                    {
                        name: 'Assistant Bot',
                        provider: 'discord',
                        llmProvider: 'openai',
                        status: 'active',
                        connected: true,
                        messageCount: 150,
                        errorCount: 0,
                        healthDetails: { ping: '25ms' },
                        lastActivity: new Date().toISOString()
                    },
                    {
                        name: 'Support Bot',
                        provider: 'slack',
                        llmProvider: 'anthropic',
                        status: 'active',
                        connected: true,
                        messageCount: 42,
                        errorCount: 0,
                        lastActivity: new Date(Date.now() - 3600000).toISOString()
                    }
                ],
                uptime: 360000
            }
        })
    );

    // Mock Config
    await page.route('/api/config', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                bots: [
                    { name: 'Assistant Bot', messageProvider: 'discord', llmProvider: 'openai', persona: 'Helpful Assistant' },
                    { name: 'Support Bot', messageProvider: 'slack', llmProvider: 'anthropic', persona: 'Support Agent' }
                ],
                warnings: [],
                legacyMode: false,
                environment: 'production'
            }
        })
    );

    // Mock Activity
    await page.route('/api/dashboard/api/activity*', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                events: [
                    {
                        id: '1',
                        timestamp: new Date().toISOString(),
                        botName: 'Assistant Bot',
                        provider: 'discord',
                        llmProvider: 'openai',
                        channelId: '123',
                        userId: 'user1',
                        messageType: 'incoming',
                        contentLength: 50,
                        processingTime: 120,
                        status: 'success'
                    },
                    {
                        id: '2',
                        timestamp: new Date(Date.now() - 1000).toISOString(),
                        botName: 'Assistant Bot',
                        provider: 'discord',
                        llmProvider: 'openai',
                        channelId: '123',
                        userId: 'bot',
                        messageType: 'outgoing',
                        contentLength: 200,
                        processingTime: 0,
                        status: 'success'
                    },
                    {
                        id: '3',
                        timestamp: new Date(Date.now() - 5000).toISOString(),
                        botName: 'Support Bot',
                        provider: 'slack',
                        llmProvider: 'anthropic',
                        channelId: '456',
                        userId: 'user2',
                        messageType: 'incoming',
                        contentLength: 30,
                        processingTime: 150,
                        status: 'success'
                    }
                ],
                filters: { agents: [], messageProviders: [], llmProviders: [] },
                timeline: [],
                agentMetrics: []
            }
        })
    );

    // Mock other endpoints to avoid errors
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/admin/guard-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
    await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));
    await page.route('/api/webui/system-status', async (route) => route.fulfill({ status: 200, json: {} }));
  });

  test('capture monitoring dashboard screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 1024 }); // Taller viewport to capture more

    // Navigate to Monitoring Dashboard
    await page.goto('/admin/monitoring');

    // Wait for the page to load
    await expect(page.locator('h1')).toHaveText('System Monitoring');

    // Wait for stats to appear
    await expect(page.locator('.stats-vertical, .grid').first()).toBeVisible();

    // Take full page screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });

    // Click on "Activity Monitor" tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();

    // Wait for activity table
    await expect(page.locator('table')).toBeVisible();

    // Take screenshot of activity tab
    await page.screenshot({ path: 'docs/screenshots/monitoring-activity.png' });
  });
});
