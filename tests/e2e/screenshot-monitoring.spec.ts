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

    // Mock System Status
    await page.route('/api/dashboard/api/status', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                bots: [
                    {
                        name: 'Support Bot',
                        provider: 'discord',
                        llmProvider: 'openai',
                        status: 'healthy',
                        connected: true,
                        messageCount: 1250,
                        errorCount: 0,
                        healthDetails: { latency: 45 }
                    },
                    {
                        name: 'Sales Bot',
                        provider: 'slack',
                        llmProvider: 'anthropic',
                        status: 'warning',
                        connected: true,
                        messageCount: 850,
                        errorCount: 12,
                        healthDetails: { latency: 120 }
                    }
                ],
                uptime: 123456
            }
        });
    });

    // Mock Config (for bots list in dashboard)
    await page.route('/api/config', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                bots: [
                    { name: 'Support Bot', messageProvider: 'discord', llmProvider: 'openai' },
                    { name: 'Sales Bot', messageProvider: 'slack', llmProvider: 'anthropic' }
                ],
                warnings: [],
                legacyMode: false,
                environment: 'production'
            }
        });
    });

    // Mock Detailed Health
    await page.route('/api/health/detailed', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: 123456,
                memory: { used: 8500, total: 16384, usage: 52 },
                cpu: { user: 15, system: 5 },
                system: {
                    platform: 'linux',
                    arch: 'x64',
                    release: '5.15.0',
                    hostname: 'hivemind-server',
                    loadAverage: [0.45, 0.60, 0.55]
                }
            }
        });
    });

    // Mock API Endpoints Status (for System Health)
    await page.route('/health/api-endpoints', async (route) => {
        await route.fulfill({
            status: 200,
            json: {
                overall: { status: 'healthy', message: 'All systems operational' },
                endpoints: [
                    { id: '1', name: 'Database', status: 'online', responseTime: 12, lastChecked: new Date().toISOString() },
                    { id: '2', name: 'OpenAI API', status: 'online', responseTime: 245, lastChecked: new Date().toISOString() },
                    { id: '3', name: 'Discord Gateway', status: 'online', responseTime: 45, lastChecked: new Date().toISOString() }
                ],
                timestamp: new Date().toISOString()
            }
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
                        provider: 'discord',
                        llmProvider: 'openai',
                        channelId: '123',
                        userId: 'user1',
                        messageType: 'incoming',
                        contentLength: 50,
                        processingTime: 0,
                        status: 'success'
                    },
                    {
                        id: '2',
                        timestamp: new Date(Date.now() - 1000).toISOString(),
                        botName: 'Support Bot',
                        provider: 'discord',
                        llmProvider: 'openai',
                        channelId: '123',
                        userId: 'user1',
                        messageType: 'outgoing',
                        contentLength: 150,
                        processingTime: 1200,
                        status: 'success'
                    },
                    {
                        id: '3',
                        timestamp: new Date(Date.now() - 5000).toISOString(),
                        botName: 'Sales Bot',
                        provider: 'slack',
                        llmProvider: 'anthropic',
                        channelId: '456',
                        userId: 'user2',
                        messageType: 'incoming',
                        contentLength: 20,
                        processingTime: 0,
                        status: 'success'
                    }
                ],
                filters: { agents: [], messageProviders: [], llmProviders: [] },
                timeline: [],
                agentMetrics: []
            }
        });
    });

    // Other required mocks
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/admin/guard-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
    await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));

    // Mock Notifications/Alerts
    await page.route('/api/dashboard/api/alerts', async (route) => route.fulfill({ status: 200, json: [] }));

  });

  test('capture Monitoring Dashboard screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 1200 }); // Taller to capture more content

    // Navigate to Monitoring page
    await page.goto('/admin/monitoring');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'System Monitoring Dashboard' })).toBeVisible();

    // Wait for System Health tab content (default)
    await expect(page.getByText('System Metrics')).toBeVisible();

    // Ensure stats are loaded (not loading spinner)
    await expect(page.locator('.loading-spinner')).toBeHidden();

    // Take full page screenshot (System Health)
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });

    // Click on Bot Status tab
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    // Wait for bot content
    await expect(page.getByText('Support Bot')).toBeVisible();
    await page.waitForTimeout(500); // Animation
    await page.screenshot({ path: 'docs/screenshots/monitoring-bots.png' });

    // Click on Activity Monitor tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();
    await page.waitForTimeout(500); // Animation
    await page.screenshot({ path: 'docs/screenshots/monitoring-activity.png' });
  });
});
