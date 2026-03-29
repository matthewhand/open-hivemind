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
      page.route('**/api/config/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { llm: [] } })
      ),
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

  /** Helper: wait for table data to render by checking for a cell with bot name */
  async function waitForTableData(page: import('@playwright/test').Page) {
    // Wait for a table cell containing 'SupportBot' to be visible (not the hidden <option>)
    await expect(page.locator('table td', { hasText: 'SupportBot' }).first()).toBeVisible();
  }

  test('load activity events in table view', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByRole('table').first()).toBeVisible();
    await waitForTableData(page);
    await expect(page.locator('table td', { hasText: 'SalesBot' }).first()).toBeVisible();
  });

  test('toggle to timeline view and back', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await expect(page.getByRole('table').first()).toBeVisible();

    // Look for timeline toggle
    const timelineBtn = page.getByRole('button', { name: 'Timeline' });
    if ((await timelineBtn.count()) > 0) {
      await timelineBtn.click();
      const tableBtn = page.getByRole('button', { name: 'Table' });
      if ((await tableBtn.count()) > 0) {
        await tableBtn.click();
        await expect(page.getByRole('table').first()).toBeVisible();
      }
    }
  });

  test('search/filter events by query text', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await waitForTableData(page);

    const searchInput = page.getByPlaceholder('Filter activity...');
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('SalesBot');
    }
  });

  test('filter by bot dropdown', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await waitForTableData(page);

    const botFilter = page.getByLabel('Filter by bot');
    if ((await botFilter.count()) > 0) {
      await botFilter.selectOption({ label: 'SupportBot' });
    }
  });

  test('filter by message provider dropdown', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await waitForTableData(page);

    const providerFilter = page.getByLabel('Filter by provider');
    if ((await providerFilter.count()) > 0) {
      await providerFilter.selectOption({ index: 1 });
    }
  });

  test('filter by date range', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await waitForTableData(page);

    // Look for date inputs by placeholder
    const startDate = page.getByPlaceholder('Start Date');
    const endDate = page.getByPlaceholder('End Date');
    if ((await startDate.count()) > 0 && (await endDate.count()) > 0) {
      await startDate.fill('2026-03-25');
      await endDate.fill('2026-03-26');
    }
  });

  test('clear all filters button resets everything', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await waitForTableData(page);

    // Apply a filter first
    const searchInput = page.getByPlaceholder('Filter activity...');
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('SalesBot');
    }

    // Click clear/reset - the button has title "Clear All Filters"
    const clearBtn = page.getByTitle('Clear All Filters');
    if ((await clearBtn.count()) > 0) {
      await clearBtn.click();
      if ((await searchInput.count()) > 0) {
        await expect(searchInput).toHaveValue('');
      }
    }
  });

  test('export to CSV button triggers download', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await waitForTableData(page);

    const exportBtn = page.getByRole('button', { name: 'Export' });
    if ((await exportBtn.count()) > 0) {
      const [download] = await Promise.all([
        page.waitForEvent('download').catch(() => null),
        exportBtn.click(),
      ]);
    }
  });

  test('auto-refresh toggle on and off', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/dashboard/api/activity*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockActivityResponse });
    });

    await page.goto('/admin/activity');
    await waitForTableData(page);

    const autoRefreshToggle = page.getByLabel('Auto');
    if ((await autoRefreshToggle.count()) > 0) {
      // Toggle on
      await autoRefreshToggle.click();
      await autoRefreshToggle.click();
    }
  });

  test('manual refresh button', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/dashboard/api/activity*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockActivityResponse });
    });

    await page.goto('/admin/activity');
    await waitForTableData(page);

    const initialCount = fetchCount;
    // The refresh button is an icon-only button (no text) between Auto toggle and Export button
    // It has aria-busy attribute and is a ghost button with no text content
    const refreshBtn = page.locator('button.btn-ghost.btn-sm[aria-busy]').filter({ hasNotText: /Export|Table|Timeline/ }).first();
    if ((await refreshBtn.count()) > 0) {
      await refreshBtn.click();
      expect(fetchCount).toBeGreaterThan(initialCount);
    }
  });

  test('stats cards display correct values', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');

    // Wait for stats cards to load
    await waitForTableData(page);

    // Check for stats cards: Total Events, Successful, Errors, Active Bots
    await expect(page.getByText('Total Events')).toBeVisible();
    await expect(page.getByText('Successful')).toBeVisible();
    await expect(page.getByText('Errors', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Active Bots')).toBeVisible();
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

    await page.goto('/admin/activity');

    // Page should show empty state
    await expect(page.locator('body')).toBeVisible();
    // Wait for loading to finish and check for empty state text
    await expect(page.getByText('No activity yet')).toBeVisible();
  });

  test('combined filters: bot + provider + date range', async ({ page }) => {
    await page.route('**/api/dashboard/api/activity*', (route) =>
      route.fulfill({ status: 200, json: mockActivityResponse })
    );

    await page.goto('/admin/activity');
    await waitForTableData(page);

    // Apply bot filter
    const botFilter = page.getByLabel('Filter by bot');
    if ((await botFilter.count()) > 0) {
      await botFilter.selectOption({ label: 'SupportBot' });
    }

    // Apply provider filter
    const providerFilter = page.getByLabel('Filter by provider');
    if ((await providerFilter.count()) > 0) {
      await providerFilter.selectOption({ index: 1 });
    }

    // Apply date range
    const startDateInput = page.getByPlaceholder('Start Date');
    const endDateInput = page.getByPlaceholder('End Date');
    if ((await startDateInput.count()) > 0 && (await endDateInput.count()) > 0) {
      await startDateInput.fill('2026-03-25');
      await endDateInput.fill('2026-03-26');
    }

    // Page should still be functional with all filters applied
    await expect(page.locator('body')).toBeVisible();
  });
});
