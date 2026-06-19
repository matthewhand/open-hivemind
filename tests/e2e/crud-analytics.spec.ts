import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Analytics Dashboard E2E Tests (/admin/analytics)
 *
 * Exercises the AnalyticsDashboard: stats cards, time-range selector, refresh,
 * charts, bot-performance table, loading state, and empty state.
 *
 * NOTE: rewritten to match the current page. The previous version navigated to
 * /admin/monitoring (which redirects to the monitoring overview tab) and mocked
 * a removed `/api/dashboard/analytics` contract with fixed totals. The real page
 * derives everything from getActivity (`/api/dashboard/activity`),
 * getCostAnalytics (`/api/monitoring/costs`), and getAnomalies
 * (`/api/admin/monitoring/anomalies`).
 */
test.describe('Analytics Dashboard CRUD Lifecycle', () => {
  test.setTimeout(90000);

  // events.length → "Total Messages"; unique userId → "Active Users";
  // filters.agents.length → "Active Bots"; agentMetrics → "Bot Performance" table.
  const mockActivity = {
    events: [
      { id: 'e1', userId: 'u1', botName: 'AlphaBot', timestamp: '2026-06-10T00:00:00Z' },
      { id: 'e2', userId: 'u2', botName: 'AlphaBot', timestamp: '2026-06-10T00:01:00Z' },
      { id: 'e3', userId: 'u1', botName: 'BetaBot', timestamp: '2026-06-10T00:02:00Z' },
    ],
    timeline: [
      { timestamp: '2026-06-10T00:00:00Z', messageProviders: { discord: 2 } },
      { timestamp: '2026-06-10T01:00:00Z', messageProviders: { discord: 1 } },
    ],
    agentMetrics: [
      { botName: 'AlphaBot', totalMessages: 2, errors: 0, events: 2 },
      { botName: 'BetaBot', totalMessages: 1, errors: 1, events: 1 },
    ],
    filters: { agents: ['AlphaBot', 'BetaBot'] },
  };

  const emptyActivity = {
    events: [],
    timeline: [],
    agentMetrics: [],
    filters: { agents: [] },
  };

  const mockCosts = {
    success: true,
    data: {
      historical: [],
      daily: [
        { date: '2026-06-09', cost: 1.23 },
        { date: '2026-06-10', cost: 2.34 },
      ],
      summary: { totalCost: 3.57, days: 7 },
    },
  };

  const mockAnomalies = { success: true, data: { anomalies: [] } };

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
    ]);
  }

  // Register the three analytics data endpoints. `activity` is the only one that
  // varies between tests; cost/anomalies stay constant.
  async function mockAnalyticsApi(
    page: import('@playwright/test').Page,
    activity: unknown = mockActivity,
    opts: { activityDelayMs?: number } = {}
  ) {
    await page.route('**/api/dashboard/activity*', async (route) => {
      if (opts.activityDelayMs) await new Promise((r) => setTimeout(r, opts.activityDelayMs));
      await route.fulfill({ status: 200, json: activity });
    });
    await page.route('**/api/monitoring/costs*', (route) =>
      route.fulfill({ status: 200, json: mockCosts })
    );
    await page.route('**/api/admin/monitoring/anomalies', (route) =>
      route.fulfill({ status: 200, json: mockAnomalies })
    );
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('stats cards render with correct values', async ({ page }) => {
    await mockAnalyticsApi(page);
    await page.goto('/admin/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible({
      timeout: 15000,
    });

    // The four usage-metric cards
    await expect(page.getByText('Total Messages')).toBeVisible();
    await expect(page.getByText('Active Users')).toBeVisible();
    await expect(page.getByText('Active Bots')).toBeVisible();

    // Total Messages = events.length = 3 (scope to the card to avoid clashing 3s)
    const totalCard = page.locator('.card', { hasText: 'Total Messages' }).first();
    await expect(totalCard).toContainText('3');
  });

  test('time range selector changes displayed data (1h, 24h, 7d, 30d)', async ({ page }) => {
    await mockAnalyticsApi(page);
    await page.goto('/admin/analytics');

    const selector = page.getByLabel('Time range');
    await expect(selector).toBeVisible({ timeout: 15000 });

    // Changing the range triggers a re-fetch of activity for the new window.
    const refetch = page.waitForResponse((r) => r.url().includes('/api/dashboard/activity'));
    await selector.selectOption('7d');
    await refetch;

    await expect(selector).toHaveValue('7d');
    // Dashboard still renders after the change
    await expect(page.getByText('Total Messages')).toBeVisible();
  });

  test('refresh button triggers re-fetch', async ({ page }) => {
    await mockAnalyticsApi(page);
    await page.goto('/admin/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible({
      timeout: 15000,
    });

    const refetch = page.waitForResponse((r) => r.url().includes('/api/dashboard/activity'));
    await page.getByRole('button', { name: /refresh/i }).click();
    await refetch;

    await expect(page.getByText('Total Messages')).toBeVisible();
  });

  test('charts render (message volume, cost, response time)', async ({ page }) => {
    await mockAnalyticsApi(page);
    await page.goto('/admin/analytics');

    await expect(page.getByText('Message Volume').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Cost Trend').first()).toBeVisible();
    await expect(page.getByText('Response Time (Live)').first()).toBeVisible();
  });

  test('bot performance table with data', async ({ page }) => {
    await mockAnalyticsApi(page);
    await page.goto('/admin/analytics');

    await expect(page.getByRole('heading', { name: 'Bot Performance' })).toBeVisible({
      timeout: 15000,
    });
    // agentMetrics rows render with bot names
    await expect(page.getByText('AlphaBot').first()).toBeVisible();
    await expect(page.getByText('BetaBot').first()).toBeVisible();
  });

  test('loading state during fetch', async ({ page }) => {
    // Delay the activity response so the StatsCards skeleton is observable.
    await mockAnalyticsApi(page, mockActivity, { activityDelayMs: 1500 });
    await page.goto('/admin/analytics');

    // Skeleton placeholders (animate-pulse) show while isLoading
    await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });

    // After the response resolves, real values render
    await expect(page.getByText('Total Messages')).toBeVisible({ timeout: 15000 });
    const totalCard = page.locator('.card', { hasText: 'Total Messages' }).first();
    await expect(totalCard).toContainText('3');
  });

  test('empty state when no data for time range', async ({ page }) => {
    await mockAnalyticsApi(page, emptyActivity);
    await page.goto('/admin/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible({
      timeout: 15000,
    });
    // Bot Performance + Recent Activity both show their empty states
    await expect(page.getByText('No bot activity')).toBeVisible();
    await expect(page.getByText('No recent activity')).toBeVisible();
  });
});
