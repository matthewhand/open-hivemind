import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Activity Page Filters Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

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
      const url = new URL(route.request().url());
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');

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
      ];

      // Filter events if date range is provided
      let filteredEvents = events;
      if (from && to) {
        // Just return a subset to visually show difference
        filteredEvents = [events[0], events[2]];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: filteredEvents,
          filters: {
            agents: ['SupportBot', 'SalesBot'],
            messageProviders: ['discord', 'slack'],
            llmProviders: ['openai', 'anthropic'],
          },
          timeline: [],
          agentMetrics: [],
        }),
      });
    });
  });

  test('capture Activity page with date filters', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    // Fill date filters
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Wait for inputs to be visible and interactable
    await page.getByPlaceholder('Start Date').click();
    await page.getByPlaceholder('Start Date').fill(startStr);

    await page.getByPlaceholder('End Date').click();
    await page.getByPlaceholder('End Date').fill(endStr);

    // Wait a bit for the API to reload
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/activity-page-filters.png', fullPage: true });
  });
});
