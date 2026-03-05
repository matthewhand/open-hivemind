import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Dashboard Overview Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 1280, height: 1024 });

    // Common mocks
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          configured: true,
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
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Config API for Dashboard
    await page.route('/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              id: 'bot-1',
              name: 'Support Bot',
              messageProvider: 'discord',
              llmProvider: 'openai',
            },
            {
              id: 'bot-2',
              name: 'Dev Assistant',
              messageProvider: 'slack',
              llmProvider: 'anthropic',
            },
          ],
          system: {
            environment: 'production',
            version: '1.2.0',
          },
        },
      });
    });

    // Mock Dashboard Status API
    await page.route('/api/dashboard/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              id: 'bot-1',
              name: 'Support Bot',
              status: 'active',
              connected: true,
              messageCount: 1542,
              errorCount: 3,
            },
            {
              id: 'bot-2',
              name: 'Dev Assistant',
              status: 'active',
              connected: true,
              messageCount: 842,
              errorCount: 1,
            },
          ],
        },
      });
    });

    // Mock Activity API for Dashboard Recent Activity
    await page.route('/api/activity?limit=*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'act-1',
              botId: 'bot-1',
              type: 'message_processed',
              level: 'info',
              message: 'Successfully processed message from User123',
              timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            },
            {
              id: 'act-2',
              botId: 'bot-2',
              type: 'bot_connected',
              level: 'success',
              message: 'Dev Assistant connected to Slack successfully',
              timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            },
            {
              id: 'act-3',
              botId: 'bot-3',
              type: 'bot_disconnected',
              level: 'warning',
              message: 'Marketing Copywriter disconnected',
              timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            },
            {
              id: 'act-4',
              botId: 'bot-1',
              type: 'api_error',
              level: 'error',
              message: 'OpenAI API rate limit exceeded. Retrying...',
              timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            },
          ],
          total: 4,
        },
      });
    });

    // Mock Monitoring Stats for Dashboard
    await page.route('/api/monitoring/stats', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          totalMessages: 2704,
          activeUsers: 142,
          avgResponseTime: 850,
          errorRate: 0.015,
        },
      });
    });
  });

  test('capture Dashboard Overview screenshot', async ({ page }) => {
    await page.goto('/admin/overview');

    // Wait for key elements on the dashboard to ensure it's loaded
    // Since we mocked the bots, we can expect to see 'Support Bot'
    // And we should also wait for the generic dashboard stat cards if they exist
    await expect(page.getByText('Support Bot').first()).toBeVisible({ timeout: 10000 });

    // Additional waits for general layout elements
    const main = page.locator('main').first();
    await expect(main).toBeVisible();

    // The Unified Dashboard might have animations, wait a moment for them to settle
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/dashboard-overview.png', fullPage: true });
  });
});
