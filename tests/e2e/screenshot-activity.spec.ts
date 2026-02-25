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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'evt-1',
              timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
              botName: 'Support Bot',
              provider: 'discord',
              llmProvider: 'openai',
              channelId: 'ch-1',
              userId: 'user-1',
              messageType: 'incoming',
              contentLength: 45,
              processingTime: 1200,
              status: 'success',
            },
            {
              id: 'evt-2',
              timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
              botName: 'Creative Writer',
              provider: 'slack',
              llmProvider: 'anthropic',
              channelId: 'ch-2',
              userId: 'user-2',
              messageType: 'outgoing',
              contentLength: 150,
              processingTime: 2500,
              status: 'success',
            },
            {
              id: 'evt-3',
              timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              botName: 'Coder Helper',
              provider: 'discord',
              llmProvider: 'local',
              channelId: 'ch-3',
              userId: 'user-3',
              messageType: 'incoming',
              contentLength: 20,
              processingTime: 500,
              status: 'error',
              errorMessage: 'Model overload',
            },
          ],
          filters: {
            agents: ['Support Bot', 'Creative Writer', 'Coder Helper'],
            messageProviders: ['discord', 'slack'],
            llmProviders: ['openai', 'anthropic', 'local'],
          },
          timeline: [],
          agentMetrics: [],
        }),
      });
    });
  });

  test('capture Activity page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Activity page
    await page.goto('/admin/activity');

    // Wait for the page to load and table to be visible
    await expect(page.locator('table').first()).toBeVisible();

    // Wait for filters to populate (check if dropdowns are present)
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/activity-page.png', fullPage: true });
  });
});
