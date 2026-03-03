import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Analytics Dashboard Screenshots', () => {
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

    // Mock Analytics API
    await page.route('/api/dashboard/api/activity*', async (route) => {
      const now = new Date();

      // Generate some timeline data
      const timeline = [];
      for (let i = 24; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(now.getHours() - i);
        timeline.push({
          timestamp: d.toISOString(),
          messageProviders: {
            discord: Math.floor(Math.random() * 20),
            slack: Math.floor(Math.random() * 10),
            mattermost: Math.floor(Math.random() * 5),
          },
          llmProviders: {
            openai: Math.floor(Math.random() * 15),
            anthropic: Math.floor(Math.random() * 10),
            local: Math.floor(Math.random() * 5),
          },
        });
      }

      // Generate some recent events
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
        {
          id: '5',
          timestamp: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
          botName: 'CodingAssistant',
          provider: 'mattermost',
          llmProvider: 'ollama',
          channelId: '789',
          userId: 'dev1',
          messageType: 'outgoing',
          contentLength: 1200,
          processingTime: 500,
          status: 'success',
        },
      ];

      // Generate agent metrics
      const agentMetrics = [
        {
          botName: 'SupportBot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          events: 150,
          errors: 2,
          lastActivity: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
          totalMessages: 150,
          recentErrors: [],
        },
        {
          botName: 'SalesBot',
          messageProvider: 'slack',
          llmProvider: 'anthropic',
          events: 85,
          errors: 5,
          lastActivity: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
          totalMessages: 85,
          recentErrors: ['TimeoutError'],
        },
        {
          botName: 'CodingAssistant',
          messageProvider: 'mattermost',
          llmProvider: 'local',
          events: 200,
          errors: 0,
          lastActivity: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
          totalMessages: 200,
          recentErrors: [],
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
          timeline,
          agentMetrics,
        }),
      });
    });
  });

  test('capture Analytics Dashboard screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 1000 });

    // Navigate to Analytics page
    await page.goto('/admin/analytics');

    // Wait for the page to load
    await expect(page.getByText('Analytics Dashboard', { exact: true })).toBeVisible();

    // Wait for key components to populate
    await expect(page.getByText('Bot Performance')).toBeVisible();
    await expect(page.getByText('SupportBot')).toBeVisible();
    await expect(page.getByText('SalesBot')).toBeVisible();
    await expect(page.getByText('CodingAssistant')).toBeVisible();

    // Check for chart elements (check for wrapper instead of responsive container which isn't used)
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

    // Wait a bit for animations/rendering
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/analytics-dashboard.png', fullPage: true });
  });
});
