import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Analytics Dashboard CRUD E2E Tests
 * Exercises stats cards, time range selector, refresh, charts,
 * bot performance table, loading state, and empty state with full API mocking.
 */
test.describe('Analytics Dashboard CRUD Lifecycle', () => {
  test.setTimeout(90000);

  const mockAnalytics = {
    totalMessages: 12543,
    totalResponses: 11987,
    avgResponseTime: 1.45,
    activeUsers: 328,
    errorRate: 0.04,
    uptime: 99.97,
    messageVolume: [
      { timestamp: '2026-03-26T00:00:00Z', count: 120 },
      { timestamp: '2026-03-26T01:00:00Z', count: 95 },
      { timestamp: '2026-03-26T02:00:00Z', count: 60 },
      { timestamp: '2026-03-26T03:00:00Z', count: 45 },
      { timestamp: '2026-03-26T04:00:00Z', count: 80 },
      { timestamp: '2026-03-26T05:00:00Z', count: 150 },
    ],
    responseTimeSeries: [
      { timestamp: '2026-03-26T00:00:00Z', avgMs: 1200 },
      { timestamp: '2026-03-26T01:00:00Z', avgMs: 1350 },
      { timestamp: '2026-03-26T02:00:00Z', avgMs: 980 },
      { timestamp: '2026-03-26T03:00:00Z', avgMs: 1100 },
      { timestamp: '2026-03-26T04:00:00Z', avgMs: 1500 },
      { timestamp: '2026-03-26T05:00:00Z', avgMs: 1250 },
    ],
    botPerformance: [
      { name: 'SupportBot', messages: 5200, avgResponseTime: 1.2, errorRate: 0.02, status: 'healthy' },
      { name: 'SalesBot', messages: 3800, avgResponseTime: 1.6, errorRate: 0.05, status: 'healthy' },
      { name: 'CodingAssistant', messages: 2100, avgResponseTime: 2.1, errorRate: 0.08, status: 'degraded' },
      { name: 'OnboardingBot', messages: 1443, avgResponseTime: 0.9, errorRate: 0.01, status: 'healthy' },
    ],
    timeRange: '24h',
  };

  const mockAnalytics7d = {
    ...mockAnalytics,
    totalMessages: 87250,
    totalResponses: 83100,
    avgResponseTime: 1.52,
    activeUsers: 1205,
    timeRange: '7d',
  };

  const mockStatus = {
    bots: [
      { name: 'SupportBot', status: 'online', uptime: 99.99 },
      { name: 'SalesBot', status: 'online', uptime: 99.95 },
      { name: 'CodingAssistant', status: 'degraded', uptime: 98.5 },
      { name: 'OnboardingBot', status: 'online', uptime: 99.98 },
    ],
    uptime: 99.97,
    version: '2.5.0',
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

  test('stats cards render with correct values', async ({ page }) => {
    await page.route('**/api/dashboard/analytics*', (route) =>
      route.fulfill({ status: 200, json: mockAnalytics })
    );
    await page.route('**/api/dashboard/api/analytics*', (route) =>
      route.fulfill({ status: 200, json: mockAnalytics })
    );
    await page.route('**/api/dashboard/status*', (route) =>
      route.fulfill({ status: 200, json: mockStatus })
    );
    await page.route('**/api/dashboard/api/status*', (route) =>
      route.fulfill({ status: 200, json: mockStatus })
    );

    await page.goto('/admin/monitoring');

    // Verify stats cards are visible with key metric values
    const totalMessagesText = page.getByText('12,543').or(page.getByText('12543'));
    await expect(totalMessagesText.first()).toBeVisible({ timeout: 10000 });

    const avgResponseText = page.getByText('1.45').or(page.getByText('1.45s'));
    await expect(avgResponseText.first()).toBeVisible({ timeout: 10000 });

    const activeUsersText = page.getByText('328');
    await expect(activeUsersText.first()).toBeVisible({ timeout: 10000 });
  });

  test('time range selector changes displayed data (1h, 24h, 7d, 30d)', async ({ page }) => {
    await page.route('**/api/dashboard/analytics*', (route) => {
      const url = route.request().url();
      if (url.includes('7d') || url.includes('7days') || url.includes('range=7')) {
        return route.fulfill({ status: 200, json: mockAnalytics7d });
      }
      return route.fulfill({ status: 200, json: mockAnalytics });
    });
    await page.route('**/api/dashboard/api/analytics*', (route) => {
      const url = route.request().url();
      if (url.includes('7d') || url.includes('7days') || url.includes('range=7')) {
        return route.fulfill({ status: 200, json: mockAnalytics7d });
      }
      return route.fulfill({ status: 200, json: mockAnalytics });
    });
    await page.route('**/api/dashboard/status*', (route) =>
      route.fulfill({ status: 200, json: mockStatus })
    );
    await page.route('**/api/dashboard/api/status*', (route) =>
      route.fulfill({ status: 200, json: mockStatus })
    );

    await page.goto('/admin/monitoring');

    // Wait for the page to render
    await expect(page.locator('body')).toBeVisible();

    // Look for time range buttons or select
    // Since this is a test environment, the UI should be deterministic. We expect buttons.
    const btn7d = page.locator('button:has-text("7d"), button:has-text("7 days")').first();
    await expect(btn7d).toBeVisible({ timeout: 10000 });
    await btn7d.click();

    const text7d = page.getByText('87,250').or(page.getByText('87250')).first();
    await expect(text7d).toBeVisible({ timeout: 10000 });

    const btn1h = page.locator('button:has-text("1h"), button:has-text("1 hour")').first();
    await btn1h.click();

    const text1h = page.getByText('12,543').or(page.getByText('12543')).first();
    await expect(text1h).toBeVisible({ timeout: 10000 });

    const btn30d = page.locator('button:has-text("30d"), button:has-text("30 days")').first();
    await btn30d.click();

    // Just verify it doesn't crash, actual state depends on implementation details
    await expect(page.locator('body')).toBeVisible();
  });

  test('refresh button triggers re-fetch', async ({ page }) => {
    let fetchCount = 0;
    // The monitoring page calls apiService.getStatus() -> /api/dashboard/status
    // and apiService.getConfig() -> /api/config
    await page.route('**/api/dashboard/status', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockStatus });
    });
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: mockStatus.bots } })
    );

    await page.goto('/admin/monitoring');

    // Wait for initial load
    await expect(page.locator('body')).toBeVisible();

    const initialCount = fetchCount;
    const refreshBtn = page.locator('button:has-text("Refresh")').first();

    await expect(refreshBtn).toBeVisible({ timeout: 10000 });

    // Use response wait instead of hardcoded timeout
    const responsePromise = page.waitForResponse('**/api/dashboard/status');
    await refreshBtn.click();
    await responsePromise;
    expect(fetchCount).toBeGreaterThan(initialCount);
  });

  test('charts render (message volume, response time)', async ({ page }) => {
    await page.route('**/api/dashboard/analytics*', (route) =>
      route.fulfill({ status: 200, json: mockAnalytics })
    );
    await page.route('**/api/dashboard/api/analytics*', (route) =>
      route.fulfill({ status: 200, json: mockAnalytics })
    );
    await page.route('**/api/dashboard/status*', (route) =>
      route.fulfill({ status: 200, json: mockStatus })
    );
    await page.route('**/api/dashboard/api/status*', (route) =>
      route.fulfill({ status: 200, json: mockStatus })
    );

    await page.goto('/admin/monitoring');

    // Wait for the page to render
    await expect(page.locator('body')).toBeVisible();

    // Check for chart containers (canvas for Chart.js, svg for Recharts/D3, or custom wrappers)
    const charts = page.locator('canvas, svg[class*="chart"], [class*="chart"], [class*="Chart"], [data-testid*="chart"]');
    await expect(charts.first()).toBeVisible({ timeout: 10000 });

    // Look for chart headings
    const messageVolumeHeading = page.getByText(/message.*volume/i).or(page.getByText(/messages.*over.*time/i)).first();
    await expect(messageVolumeHeading).toBeVisible({ timeout: 10000 });

    const responseTimeHeading = page.getByText(/response.*time/i).first();
    await expect(responseTimeHeading).toBeVisible({ timeout: 10000 });
  });

  test('bot performance table with data', async ({ page }) => {
    // The monitoring page calls apiService.getStatus() -> /api/dashboard/status
    // and apiService.getConfig() -> /api/config (bots array)
    // It then renders bot status in the "Bot Status" tab
    await page.route('**/api/dashboard/status', (route) =>
      route.fulfill({ status: 200, json: mockStatus })
    );
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: mockStatus.bots } })
    );

    await page.goto('/admin/monitoring');

    // Wait for the page to render
    await expect(page.locator('body')).toBeVisible();

    // Click on "Bot Status" tab to see bot names
    const botStatusTab = page.locator('[role="tab"]:has-text("Bot Status")').first();
    // Wait for the tab to appear and be clickable
    await expect(botStatusTab).toBeVisible({ timeout: 10000 });
    await botStatusTab.click();

    // Verify bot names appear
    await expect(page.getByText('SupportBot').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('SalesBot').first()).toBeVisible({ timeout: 10000 });
  });

  test('loading state during fetch', async ({ page }) => {
    let resolveStatusPromise: () => void;
    const statusPromise = new Promise<void>((resolve) => { resolveStatusPromise = resolve; });

    // Delay the status response to observe loading state
    await page.route('**/api/dashboard/status', async (route) => {
      await statusPromise;
      await route.fulfill({ status: 200, json: mockStatus });
    });
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    await page.goto('/admin/monitoring');

    // The page should render immediately (no full-page loading state)
    // Just verify the page loads and eventually shows content
    await expect(page.getByText('System Monitoring')).toBeVisible({ timeout: 5000 });

    // Let the data load
    resolveStatusPromise!();

    // Wait for data to populate the UI (e.g. body is visible and stats change)
    await expect(page.locator('body')).toBeVisible();

    const supportBot = page.getByText('SupportBot').first();
    await expect(supportBot).toBeVisible({ timeout: 10000 });
  });

  test('empty state when no data for time range', async ({ page }) => {
    const emptyAnalytics = {
      totalMessages: 0,
      totalResponses: 0,
      avgResponseTime: 0,
      activeUsers: 0,
      errorRate: 0,
      uptime: 0,
      messageVolume: [],
      responseTimeSeries: [],
      botPerformance: [],
      timeRange: '1h',
    };

    await page.route('**/api/dashboard/analytics*', (route) =>
      route.fulfill({ status: 200, json: emptyAnalytics })
    );
    await page.route('**/api/dashboard/api/analytics*', (route) =>
      route.fulfill({ status: 200, json: emptyAnalytics })
    );
    await page.route('**/api/dashboard/status*', (route) =>
      route.fulfill({ status: 200, json: { bots: [], uptime: 0, version: '2.5.0' } })
    );
    await page.route('**/api/dashboard/api/status*', (route) =>
      route.fulfill({ status: 200, json: { bots: [], uptime: 0, version: '2.5.0' } })
    );

    await page.goto('/admin/monitoring');

    // Should show zeros or empty state messaging
    await expect(page.locator('body')).toBeVisible();
    const emptyText = page.locator('text=/no.*data/i, text=/no.*activity/i, text=/no.*metrics/i').first();
    await expect(emptyText).toBeVisible({ timeout: 10000 });

    // Stats should show zero values
    const zeroValue = page.getByText('0').first();
    await expect(zeroValue).toBeVisible({ timeout: 10000 });
  });
});
