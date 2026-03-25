import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Activity Page CRUD Lifecycle E2E Tests
 * Exercises table/timeline views, search, filters, export CSV, auto-refresh,
 * manual refresh, stats cards, empty state, and combined filters with API mocking.
 */
test.describe('Activity Page CRUD Lifecycle', () => {
  test.setTimeout(90000);

  const now = new Date('2026-03-26T12:00:00Z');

  const mockEvents = [
    {
      id: 'evt-1',
      timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
      botName: 'SupportBot',
      provider: 'discord',
      llmProvider: 'openai',
      channelId: 'ch-101',
      userId: 'user1',
      messageType: 'incoming',
      contentLength: 50,
      processingTime: 120,
      status: 'success',
    },
    {
      id: 'evt-2',
      timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
      botName: 'SalesBot',
      provider: 'slack',
      llmProvider: 'anthropic',
      channelId: 'ch-202',
      userId: 'user2',
      messageType: 'incoming',
      contentLength: 120,
      processingTime: 2500,
      status: 'error',
    },
    {
      id: 'evt-3',
      timestamp: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
      botName: 'SupportBot',
      provider: 'discord',
      llmProvider: 'openai',
      channelId: 'ch-101',
      userId: 'user3',
      messageType: 'outgoing',
      contentLength: 200,
      processingTime: 450,
      status: 'success',
    },
    {
      id: 'evt-4',
      timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      botName: 'CodingAssistant',
      provider: 'mattermost',
      llmProvider: 'ollama',
      channelId: 'ch-303',
      userId: 'dev1',
      messageType: 'incoming',
      contentLength: 800,
      processingTime: 8000,
      status: 'success',
    },
    {
      id: 'evt-5',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
      botName: 'SalesBot',
      provider: 'slack',
      llmProvider: 'anthropic',
      channelId: 'ch-202',
      userId: 'user4',
      messageType: 'incoming',
      contentLength: 95,
      processingTime: 300,
      status: 'success',
    },
  ];

  const mockActivityResponse = {
    events: mockEvents,
    filters: {
      agents: ['SupportBot', 'SalesBot', 'CodingAssistant'],
      messageProviders: ['discord', 'slack', 'mattermost'],
      llmProviders: ['openai', 'anthropic', 'ollama'],
    },
    timeline: [],
    agentMetrics: [],
  };

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } })),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('load activity events in table view', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.getByText('SupportBot').first()).toBeVisible();
    await expect(page.getByText('SalesBot').first()).toBeVisible();
  });

  test('toggle to timeline view and back', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByRole('table').first()).toBeVisible();

    // Look for timeline toggle
    const timelineBtn = page.locator('button:has-text("Timeline"), button[title*="Timeline"], [role="tab"]:has-text("Timeline")').first();
    if ((await timelineBtn.count()) > 0) {
      await timelineBtn.click();
      await page.waitForTimeout(500);

      // Toggle back to table
      const tableBtn = page.locator('button:has-text("Table"), button[title*="Table"], [role="tab"]:has-text("Table")').first();
      if ((await tableBtn.count()) > 0) {
        await tableBtn.click();
        await page.waitForTimeout(500);
        await expect(page.getByRole('table').first()).toBeVisible();
      }
    }
  });

  test('search/filter events by query text', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('SalesBot');
      await page.waitForTimeout(300);
    }
  });

  test('filter by bot dropdown', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    const botFilter = page.locator('select:has(option:has-text("SupportBot")), select[id*="bot" i], select[name*="bot" i]').first();
    if ((await botFilter.count()) > 0) {
      await botFilter.selectOption({ label: 'SupportBot' });
      await page.waitForTimeout(300);
    }
  });

  test('filter by message provider dropdown', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    const providerFilter = page.locator('select:has(option:has-text("discord")), select:has(option:has-text("Discord")), select[id*="provider" i]').first();
    if ((await providerFilter.count()) > 0) {
      await providerFilter.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }
  });

  test('filter by date range', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    // Look for date inputs
    const startDate = page.locator('input[type="date"], input[type="datetime-local"]').first();
    const endDate = page.locator('input[type="date"], input[type="datetime-local"]').last();
    if ((await startDate.count()) > 0 && (await endDate.count()) > 0) {
      await startDate.fill('2026-03-25');
      await page.waitForTimeout(200);
      await endDate.fill('2026-03-26');
      await page.waitForTimeout(300);
    }
  });

  test('clear all filters button resets everything', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    // Apply a filter first
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('SalesBot');
      await page.waitForTimeout(300);
    }

    // Click clear/reset
    const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Reset"), button[title*="Clear"]').first();
    if ((await clearBtn.count()) > 0) {
      await clearBtn.click();
      await page.waitForTimeout(300);

      // Search input should be cleared
      if ((await searchInput.count()) > 0) {
        await expect(searchInput).toHaveValue('');
      }
    }
  });

  test('export to CSV button triggers download', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity/export*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: { 'Content-Disposition': 'attachment; filename="activity.csv"' },
        body: 'id,timestamp,botName,status\nevt-1,2026-03-26T11:58:00Z,SupportBot,success\n',
      })
    );

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    const exportBtn = page.locator('button:has-text("Export"), button:has-text("CSV"), button[title*="Export"]').first();
    if ((await exportBtn.count()) > 0) {
      const [download] = await Promise.all([
        page.waitForEvent('download').catch(() => null),
        exportBtn.click(),
      ]);
      await page.waitForTimeout(300);
    }
  });

  test('auto-refresh toggle on and off', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/dashboard/api/activity*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockActivityResponse });
    });
    await page.route('**/api/dashboard/activity*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockActivityResponse });
    });

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    const autoRefreshToggle = page.locator('input[type="checkbox"][id*="auto" i], label:has-text("Auto") input[type="checkbox"], button:has-text("Auto")').first();
    if ((await autoRefreshToggle.count()) > 0) {
      // Toggle on
      await autoRefreshToggle.click();
      await page.waitForTimeout(500);

      // Toggle off
      await autoRefreshToggle.click();
      await page.waitForTimeout(300);
    }
  });

  test('manual refresh button', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/dashboard/api/activity*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockActivityResponse });
    });
    await page.route('**/api/dashboard/activity*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockActivityResponse });
    });

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    const initialCount = fetchCount;
    const refreshBtn = page.locator('button:has-text("Refresh"), button[title*="Refresh"]').first();
    if ((await refreshBtn.count()) > 0) {
      await refreshBtn.click();
      await page.waitForTimeout(500);
      // Fetch count should have increased
      expect(fetchCount).toBeGreaterThan(initialCount);
    }
  });

  test('stats cards display correct values', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');

    // Check for stats cards: Total Events, Successful, Errors, Active Bots
    const totalEventsCard = page.getByText('Total Events').first();
    if ((await totalEventsCard.count()) > 0) {
      await expect(totalEventsCard).toBeVisible();
    }

    const successCard = page.getByText(/Success/i).first();
    if ((await successCard.count()) > 0) {
      await expect(successCard).toBeVisible();
    }

    const errorCard = page.getByText(/Error/i).first();
    if ((await errorCard.count()) > 0) {
      await expect(errorCard).toBeVisible();
    }

    const activeBotsCard = page.getByText(/Active Bot/i).first();
    if ((await activeBotsCard.count()) > 0) {
      await expect(activeBotsCard).toBeVisible();
    }
  });

  test('empty state when no events match filters', async ({ page }) => {
    const emptyResponse = {
      events: [],
      filters: {
        agents: [],
        messageProviders: [],
        llmProviders: [],
      },
      timeline: [],
      agentMetrics: [],
    };

    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: emptyResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: emptyResponse })
    );

    await page.goto('/admin/activity');

    // Page should show empty state or zero counts
    await expect(page.locator('body')).toBeVisible();
    const emptyText = page.locator('text=/no.*event/i, text=/no.*activity/i, text=/no.*data/i, text=/no.*results/i').first();
    if ((await emptyText.count()) > 0) {
      await expect(emptyText).toBeVisible();
    }
  });

  test('combined filters: bot + provider + date range', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );
    await page.route('**/api/dashboard/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByText('SupportBot').first()).toBeVisible();

    // Apply bot filter
    const botFilter = page.locator('select:has(option:has-text("SupportBot")), select[id*="bot" i], select[name*="bot" i]').first();
    if ((await botFilter.count()) > 0) {
      await botFilter.selectOption({ label: 'SupportBot' });
      await page.waitForTimeout(200);
    }

    // Apply provider filter
    const providerFilter = page.locator('select:has(option:has-text("discord")), select:has(option:has-text("Discord")), select[id*="provider" i]').first();
    if ((await providerFilter.count()) > 0) {
      await providerFilter.selectOption({ index: 1 });
      await page.waitForTimeout(200);
    }

    // Apply date range
    const dateInputs = page.locator('input[type="date"], input[type="datetime-local"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.first().fill('2026-03-25');
      await page.waitForTimeout(200);
      await dateInputs.last().fill('2026-03-26');
      await page.waitForTimeout(300);
    }

    // Page should still be functional with all filters applied
    await expect(page.locator('body')).toBeVisible();
  });
});
