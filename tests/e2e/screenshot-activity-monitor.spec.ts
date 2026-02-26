import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Activity Monitor Screenshot', () => {
  test('capture activity monitor screenshot', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );

    // Mock Dashboard dependencies
    await page.route('**/api/dashboard/api/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [],
          uptime: 1000,
        },
      })
    );

    await page.route('**/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [],
        },
      })
    );

    await page.route('**/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600,
          memory: { used: 100, total: 1000, usage: 10 },
          cpu: { user: 10, system: 10 },
          system: { platform: 'linux', arch: 'x64', release: '1.0', hostname: 'test', loadAverage: [0, 0, 0] },
        },
      })
    );
     await page.route('**/health/api-endpoints', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          overall: { status: 'healthy', message: '', stats: { total: 0, online: 0, slow: 0, offline: 0, error: 0 } },
          endpoints: [],
          timestamp: new Date().toISOString(),
        },
      })
    );


    // Mock Activity Data
    const mockActivity = {
      events: [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          messageType: 'incoming',
          contentLength: 45,
          status: 'success',
          processingTime: 120,
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000).toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          messageType: 'outgoing',
          contentLength: 150,
          status: 'success',
          processingTime: 450,
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 5000).toISOString(),
          botName: 'SalesBot',
          provider: 'slack',
          llmProvider: 'anthropic',
          messageType: 'incoming',
          contentLength: 20,
          status: 'timeout',
          processingTime: 5000,
          errorMessage: 'Request timed out',
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 10000).toISOString(),
          botName: 'DevBot',
          provider: 'mattermost',
          llmProvider: 'local',
          messageType: 'incoming',
          contentLength: 80,
          status: 'error',
          processingTime: 50,
          errorMessage: 'Connection refused',
        },
         {
          id: '5',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          botName: 'DevBot',
          provider: 'mattermost',
          llmProvider: 'local',
          messageType: 'outgoing',
          contentLength: 200,
          status: 'success',
          processingTime: 800,
        },
      ],
      filters: {
        agents: ['SupportBot', 'SalesBot', 'DevBot'],
        messageProviders: ['discord', 'slack', 'mattermost'],
        llmProviders: ['openai', 'anthropic', 'local'],
      },
    };

    await page.route('**/api/dashboard/api/activity*', async (route) =>
      route.fulfill({
        status: 200,
        json: mockActivity,
      })
    );

    // Navigate
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/admin/monitoring');

    // Click Activity Monitor tab
    await page.getByText('Activity Monitor').click();

    // Wait for table
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/activity-monitor.png', fullPage: true });
  });
});
