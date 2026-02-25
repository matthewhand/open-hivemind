import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Activity Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Activity Data
    await page.route('/api/dashboard/api/activity*', async (route) => {
      const now = new Date();
      const events = [
        {
          id: 'evt-1',
          timestamp: new Date(now.getTime() - 1000 * 60 * 1).toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          channelId: '123',
          userId: 'user-1',
          messageType: 'incoming',
          contentLength: 50,
          processingTime: 1200,
          status: 'success',
        },
        {
          id: 'evt-2',
          timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
          botName: 'CoderBot',
          provider: 'slack',
          llmProvider: 'anthropic',
          channelId: '456',
          userId: 'user-2',
          messageType: 'incoming',
          contentLength: 150,
          processingTime: 2500,
          status: 'success',
        },
        {
          id: 'evt-3',
          timestamp: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          channelId: '123',
          userId: 'user-3',
          messageType: 'incoming',
          contentLength: 20,
          processingTime: 5000,
          status: 'timeout',
          errorMessage: 'Gateway Timeout',
        },
        {
          id: 'evt-4',
          timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
          botName: 'SalesBot',
          provider: 'mattermost',
          llmProvider: 'local',
          channelId: '789',
          userId: 'user-4',
          messageType: 'incoming',
          contentLength: 80,
          processingTime: 800,
          status: 'success',
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: events,
          filters: {
            agents: ['SupportBot', 'CoderBot', 'SalesBot'],
            messageProviders: ['discord', 'slack', 'mattermost'],
            llmProviders: ['openai', 'anthropic', 'local'],
          },
          timeline: [],
          agentMetrics: [],
        }),
      });
    });
  });

  test('capture Activity Page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Activity Page
    await page.goto('/admin/activity');

    // Wait for the page to load and data to be displayed
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SupportBot' }).first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/activity-page.png', fullPage: true });
  });
});
