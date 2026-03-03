import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Activity Monitor Screenshots', () => {
  test('capture activity monitor screenshot', async ({ page }) => {
    page.on('console', (msg) => console.log(`BROWSER: ${msg.text()}`));
    page.on('pageerror', (exception) => console.log(`BROWSER ERROR: ${exception}`));
    page.on('request', (request) => console.log(`REQUEST: ${request.method()} ${request.url()}`));
    page.on('requestfailed', (request) =>
      console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`)
    );

    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints for dashboard
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );

    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    // Mock Status for Dashboard
    await page.route('**/api/dashboard/api/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'CustomerSupport', status: 'healthy', connected: true },
            { name: 'DevAssistant', status: 'healthy', connected: true },
          ],
          uptime: 1000,
        },
      })
    );

    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600,
          memory: { used: 1024, total: 4096, usage: 25 },
          cpu: { user: 100, system: 50 },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '1.0.0',
            hostname: 'host',
            loadAverage: [0.1, 0.1, 0.1],
          },
        },
      })
    );
    await page.route('**/health/api-endpoints', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          overall: {
            status: 'healthy',
            stats: { total: 0, online: 0, slow: 0, offline: 0, error: 0 },
          },
          endpoints: [],
        },
      })
    );

    await page.route('**/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'CustomerSupport', messageProvider: 'discord', llmProvider: 'openai' },
            { name: 'DevAssistant', messageProvider: 'slack', llmProvider: 'anthropic' },
          ],
        },
      })
    );

    // Mock Activity Data
    const now = new Date();
    const activityEvents = [
      {
        id: '1',
        timestamp: new Date(now.getTime() - 1000 * 60 * 1).toISOString(),
        botName: 'CustomerSupport',
        provider: 'discord',
        llmProvider: 'openai',
        channelId: 'general',
        userId: 'user123',
        messageType: 'incoming',
        contentLength: 45,
        status: 'success',
        processingTime: 120,
      },
      {
        id: '2',
        timestamp: new Date(now.getTime() - 1000 * 60 * 1).toISOString(),
        botName: 'CustomerSupport',
        provider: 'discord',
        llmProvider: 'openai',
        channelId: 'general',
        userId: 'bot',
        messageType: 'outgoing',
        contentLength: 150,
        status: 'success',
        processingTime: 450,
      },
      {
        id: '3',
        timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
        botName: 'DevAssistant',
        provider: 'slack',
        llmProvider: 'anthropic',
        channelId: 'dev-team',
        userId: 'dev1',
        messageType: 'incoming',
        contentLength: 12,
        status: 'success',
        processingTime: 80,
      },
      {
        id: '4',
        timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        botName: 'DevAssistant',
        provider: 'slack',
        llmProvider: 'anthropic',
        channelId: 'dev-team',
        userId: 'bot',
        messageType: 'outgoing',
        contentLength: 0,
        status: 'error',
        errorMessage: 'Rate limit exceeded',
        processingTime: 1200,
      },
    ];

    await page.route(/\/api\/dashboard\/api\/activity/, async (route) => {
      console.log(`Intercepted activity request: ${route.request().url()}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          events: activityEvents,
          filters: {
            agents: ['CustomerSupport', 'DevAssistant'],
            messageProviders: ['discord', 'slack'],
            llmProviders: ['openai', 'anthropic'],
          },
          timeline: [],
          agentMetrics: [],
        },
      });
    });

    // Navigate
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/admin/monitoring');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: 'System Monitoring' })).toBeVisible();

    // Wait for loading to finish (ensure refresh button is not showing spinner)
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled();

    // Switch to Activity Monitor tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();

    // Wait for table to load
    await expect(page.getByRole('cell', { name: 'CustomerSupport' }).first()).toBeVisible();
    await expect(page.getByText('error', { exact: true }).first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/activity-monitor.png', fullPage: true });
  });
});
