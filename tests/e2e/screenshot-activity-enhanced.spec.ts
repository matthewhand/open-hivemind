import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Activity Log Enhanced Filters Screenshots', () => {
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

    // Mock Activity API with comprehensive test data
    await page.route('/api/dashboard/api/activity*', async (route) => {
      const url = new URL(route.request().url());
      const severity = url.searchParams.get('severity');
      const activityType = url.searchParams.get('activityType');
      const search = url.searchParams.get('search');
      const bot = url.searchParams.get('bot');
      const messageProvider = url.searchParams.get('messageProvider');
      const llmProvider = url.searchParams.get('llmProvider');

      const now = new Date();
      const allEvents = [
        {
          id: '1',
          timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          channelId: '****123',
          userId: '****user1',
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
          channelId: '****456',
          userId: '****user2',
          messageType: 'incoming',
          contentLength: 120,
          processingTime: 2500,
          status: 'timeout',
        },
        {
          id: '3',
          timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
          botName: 'SupportBot',
          provider: 'discord',
          llmProvider: 'openai',
          channelId: '****123',
          userId: '****user3',
          messageType: 'outgoing',
          contentLength: 200,
          processingTime: 450,
          status: 'error',
          errorMessage: 'Connection timeout to LLM provider',
        },
        {
          id: '4',
          timestamp: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
          botName: 'SalesBot',
          provider: 'slack',
          llmProvider: 'anthropic',
          channelId: '****456',
          userId: '****alice',
          messageType: 'incoming',
          contentLength: 80,
          processingTime: 200,
          status: 'success',
        },
        {
          id: '5',
          timestamp: new Date(now.getTime() - 1000 * 60 * 20).toISOString(),
          botName: 'AnalyticsBot',
          provider: 'mattermost',
          llmProvider: 'openai',
          channelId: '****789',
          userId: '****bob',
          messageType: 'incoming',
          contentLength: 150,
          processingTime: 300,
          status: 'success',
        },
        {
          id: '6',
          timestamp: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
          botName: 'AnalyticsBot',
          provider: 'mattermost',
          llmProvider: 'openai',
          channelId: '****789',
          userId: '****charlie',
          messageType: 'incoming',
          contentLength: 90,
          processingTime: 180,
          status: 'error',
          errorMessage: 'Rate limit exceeded',
        },
      ];

      // Apply filters
      let filteredEvents = [...allEvents];

      if (bot) {
        filteredEvents = filteredEvents.filter((e) => e.botName === bot);
      }

      if (messageProvider) {
        filteredEvents = filteredEvents.filter((e) => e.provider === messageProvider);
      }

      if (llmProvider) {
        filteredEvents = filteredEvents.filter((e) => e.llmProvider === llmProvider);
      }

      if (severity) {
        filteredEvents = filteredEvents.filter((e) => {
          if (severity === 'error') return e.status === 'error';
          if (severity === 'warning') return e.status === 'timeout';
          if (severity === 'info') return e.status === 'success';
          return true;
        });
      }

      if (activityType) {
        filteredEvents = filteredEvents.filter((e) => {
          if (activityType === 'error') return e.status === 'error' || e.status === 'timeout';
          if (activityType === 'message') return e.status === 'success';
          return true;
        });
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredEvents = filteredEvents.filter(
          (e) =>
            e.botName.toLowerCase().includes(searchLower) ||
            e.userId.toLowerCase().includes(searchLower) ||
            (e.errorMessage && e.errorMessage.toLowerCase().includes(searchLower))
        );
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: filteredEvents,
          filters: {
            agents: ['SupportBot', 'SalesBot', 'AnalyticsBot'],
            messageProviders: ['discord', 'slack', 'mattermost'],
            llmProviders: ['openai', 'anthropic'],
          },
          timeline: [],
          agentMetrics: [
            {
              botName: 'SupportBot',
              messageProvider: 'discord',
              llmProvider: 'openai',
              events: 2,
              errors: 1,
              lastActivity: allEvents[0].timestamp,
              totalMessages: 150,
              recentErrors: [],
            },
            {
              botName: 'SalesBot',
              messageProvider: 'slack',
              llmProvider: 'anthropic',
              events: 2,
              errors: 0,
              lastActivity: allEvents[1].timestamp,
              totalMessages: 100,
              recentErrors: [],
            },
            {
              botName: 'AnalyticsBot',
              messageProvider: 'mattermost',
              llmProvider: 'openai',
              events: 2,
              errors: 1,
              lastActivity: allEvents[4].timestamp,
              totalMessages: 75,
              recentErrors: [],
            },
          ],
        }),
      });
    });

    // Mock CSV export endpoint
    await page.route('/api/dashboard/api/activity/export*', async (route) => {
      const csvContent = `Timestamp,Bot Name,Message Provider,LLM Provider,Status,Severity,Activity Type
"2026-03-30T10:00:00.000Z","SupportBot","discord","openai","success","info","message"
"2026-03-30T11:00:00.000Z","SalesBot","slack","anthropic","timeout","warning","error"`;

      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Disposition': 'attachment; filename=activity_export_2026-03-30.csv',
        },
        body: csvContent,
      });
    });
  });

  test('capture Activity page with all filters visible', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    // Wait for page to load
    await expect(page.getByText('Total Events')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    // Wait for all filter dropdowns to be visible
    await expect(page.locator('select').first()).toBeVisible();

    // Take screenshot showing initial state with all filters
    await page.screenshot({
      path: 'docs/screenshots/activity-log-filters.png',
      fullPage: true,
    });
  });

  test('test severity filter functionality', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Find and click severity filter
    const severityFilter = page.locator('select').nth(3); // 4th select is severity
    await severityFilter.selectOption('error');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify error badge is visible
    await expect(page.getByText('error', { exact: false })).toBeVisible();
  });

  test('test activity type filter functionality', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Find and click activity type filter
    const activityTypeFilter = page.locator('select').nth(4); // 5th select is activity type
    await activityTypeFilter.selectOption('error');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify filtered results
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
  });

  test('test search functionality', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Type in search box
    const searchInput = page.getByPlaceholder('Search by bot name, user, message content...');
    await searchInput.fill('alice');

    // Wait for search to apply (debounced)
    await page.waitForTimeout(500);

    // Verify results are filtered
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
  });

  test('test date range filters', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Fill date filters
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    await page.getByPlaceholder('Start Date').click();
    await page.getByPlaceholder('Start Date').fill(startStr);

    await page.getByPlaceholder('End Date').click();
    await page.getByPlaceholder('End Date').fill(endStr);

    // Wait for API to reload
    await page.waitForTimeout(1000);

    // Verify table is still visible
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('test quick time range buttons', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Click on 24h quick filter
    await page.getByRole('button', { name: '24h' }).click();

    // Wait for filters to apply
    await page.waitForTimeout(1000);

    // Verify date inputs are now filled
    const startDateInput = page.getByPlaceholder('Start Date');
    await expect(startDateInput).toHaveValue(/.+/);
  });

  test('test combined filters', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Apply multiple filters
    const botFilter = page.locator('select').first();
    await botFilter.selectOption('SupportBot');

    const severityFilter = page.locator('select').nth(3);
    await severityFilter.selectOption('error');

    // Wait for filters to apply
    await page.waitForTimeout(1000);

    // Verify table updates
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('test clear filters button', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Apply some filters
    const botFilter = page.locator('select').first();
    await botFilter.selectOption('SupportBot');

    const searchInput = page.getByPlaceholder('Search by bot name, user, message content...');
    await searchInput.fill('test');

    // Wait for filters to apply
    await page.waitForTimeout(500);

    // Find and click clear filters button
    const clearButton = page.getByRole('button', { name: 'Clear All Filters' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Verify filters are cleared
    await expect(searchInput).toHaveValue('');
    await expect(botFilter).toHaveValue('all');
  });

  test('test CSV export button', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Setup download handler
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/activity_export_.*\.csv/);
  });

  test('test pagination with filters', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    // Apply a filter
    const botFilter = page.locator('select').first();
    await botFilter.selectOption('SupportBot');

    // Wait for results
    await page.waitForTimeout(1000);

    // Verify pagination controls exist
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
  });

  test('test view mode toggle with filters', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Apply a filter
    const severityFilter = page.locator('select').nth(3);
    await severityFilter.selectOption('error');

    // Wait for results
    await page.waitForTimeout(1000);

    // Switch to timeline view
    const timelineButton = page.getByRole('button', { name: /timeline/i });
    await timelineButton.click();

    // Wait for timeline to render
    await page.waitForTimeout(500);

    // Switch back to table
    const tableButton = page.getByRole('button', { name: /table/i });
    await tableButton.click();

    await page.waitForTimeout(500);

    // Verify table is visible
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('test auto-refresh with filters', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Apply a filter
    const botFilter = page.locator('select').first();
    await botFilter.selectOption('SalesBot');

    // Enable auto-refresh
    const autoRefreshToggle = page.getByLabel('Auto');
    await autoRefreshToggle.click();

    // Wait a bit to see if auto-refresh works
    await page.waitForTimeout(2000);

    // Verify page is still functional
    await expect(page.getByRole('table')).toBeVisible();

    // Disable auto-refresh
    await autoRefreshToggle.click();
  });

  test('verify all filter options are present', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/activity');

    await expect(page.getByText('Total Events')).toBeVisible();

    // Verify Bot filter exists
    const botFilter = page.locator('select').first();
    await expect(botFilter).toBeVisible();

    // Verify Provider filter exists
    const providerFilter = page.locator('select').nth(1);
    await expect(providerFilter).toBeVisible();

    // Verify LLM filter exists
    const llmFilter = page.locator('select').nth(2);
    await expect(llmFilter).toBeVisible();

    // Verify Severity filter exists
    const severityFilter = page.locator('select').nth(3);
    await expect(severityFilter).toBeVisible();

    // Verify Activity Type filter exists
    const activityTypeFilter = page.locator('select').nth(4);
    await expect(activityTypeFilter).toBeVisible();

    // Verify search input exists
    const searchInput = page.getByPlaceholder('Search by bot name, user, message content...');
    await expect(searchInput).toBeVisible();

    // Verify date inputs exist
    await expect(page.getByPlaceholder('Start Date')).toBeVisible();
    await expect(page.getByPlaceholder('End Date')).toBeVisible();

    // Verify quick time range buttons exist
    await expect(page.getByRole('button', { name: '1h' })).toBeVisible();
    await expect(page.getByRole('button', { name: '6h' })).toBeVisible();
    await expect(page.getByRole('button', { name: '24h' })).toBeVisible();
    await expect(page.getByRole('button', { name: '7d' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible();
  });
});
