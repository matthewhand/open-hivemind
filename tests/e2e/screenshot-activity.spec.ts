import { expect, test } from '@playwright/test';
import { setupAuth, setupScreenshotEnv } from './test-utils';

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

    // Mock Activity API
    await page.route('/api/dashboard/api/activity*', async (route) => {
      const now = new Date();
      const events = [
        {
          id: '1',
          timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          channelId: '123',
          userId: 'user1',
          messageType: 'incoming',
          contentLength: 50,
          processingTime: 120,
          status: 'success',
        },
        {
          id: '2',
          timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
          botName: 'SalesBot',
          provider: 'slack',
          llmProvider: 'anthropic',
          channelId: '456',
          userId: 'user2',
          messageType: 'incoming',
          contentLength: 120,
          processingTime: 2500,
          status: 'timeout',
        },
        {
          id: '3',
          timestamp: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          channelId: '123',
          userId: 'user3',
          messageType: 'outgoing',
          contentLength: 200,
          processingTime: 450,
          status: 'success',
        },
        {
          id: '4',
          timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
          botName: 'CodingAssistant',
          provider: 'mattermost',
          llmProvider: 'ollama',
          channelId: '789',
          userId: 'dev1',
          messageType: 'incoming',
          contentLength: 800,
          processingTime: 8000,
          status: 'success',
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events,
          filters: {
            agents: ['SupportBot', 'SalesBot', 'CodingAssistant'],
            messageProviders: ['discord', 'slack', 'mattermost'],
            llmProviders: ['openai', 'anthropic', 'ollama'],
          },
          timeline: [],
          agentMetrics: [],
        }),
      });
    });
  });

  test('capture Activity page screenshots', async ({ page }) => {
    // Set viewport and reduced motion
    await setupScreenshotEnv(page);

    // Navigate to Activity page
    await page.goto('/admin/activity');

    // Wait for the page to load and table to be visible
    await expect(page.getByText('Total Events')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    // Wait a bit for filters to populate
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/activity-page.png', fullPage: true });
  });
});
