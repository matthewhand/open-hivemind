import { test, expect } from '@playwright/test';

test.describe('Distributed Trace Waterfall Screenshots', () => {
  test('capture distributed trace waterfall screenshot', async ({ page }) => {
    // Intercept API calls to mock data
    await page.route('/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          authEnabled: false,
          demoMode: false,
          version: '1.0.0',
          features: {
            telemetry: true,
            distributedTracing: true,
          },
        },
      });
    });

<<<<<<< HEAD
    await page.route('**/api/webui/system-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: { total: 12, active: 8 },
          database: { stats: { totalMessages: 2847 } },
          mcp: { connected: 5 },
        },
      });
    });

    await page.route('**/api/dashboard/api/activity*', async (route) => {
      await route.fulfill({ status: 200, json: { events: [] } });
    });

    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );

    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );

    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock dashboard status endpoints
    await page.route('**/health/detailed', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600 * 24 * 5,
          memory: { used: 8 * 1024, total: 16 * 1024, usage: 50 },
          cpu: { user: 15, system: 5 },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '5.15.0',
            hostname: 'prod-server-01',
            loadAverage: [0.5, 0.4, 0.3],
          },
=======
    await page.route('/api/dashboard/system-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          uptime: 3600,
          memoryUsage: { heapUsed: 100, heapTotal: 200, rss: 300 },
          activeConnections: 10,
>>>>>>> origin/docco-update-screenshots-6307953588415915921
        },
      });
    });

<<<<<<< HEAD
    await page.route('**/api/dashboard/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              name: 'CustomerSupportBot',
              provider: 'discord',
              llmProvider: 'openai',
              status: 'active',
              connected: true,
              messageCount: 1542,
              errorCount: 2,
=======
    await page.route('/api/dashboard/system-metrics', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          metrics: {
            http_requests_total: 1500,
            http_request_duration_seconds: 0.15,
            active_websockets: 5,
            llm_requests_total: 450,
          },
        },
      });
    });

    await page.route('/api/dashboard/traces', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          traces: [
            {
              id: 'trace-1234567890abcdef',
              timestamp: new Date().toISOString(),
              duration: 1250,
              rootOperation: 'POST /api/chat',
              status: 'success',
              spans: [
                {
                  id: 'span-1',
                  traceId: 'trace-1234567890abcdef',
                  name: 'request_handler',
                  startTime: 0,
                  endTime: 1250,
                  duration: 1250,
                  status: 'success',
                  attributes: { 'http.method': 'POST', 'http.url': '/api/chat' },
                },
                {
                  id: 'span-2',
                  parentId: 'span-1',
                  traceId: 'trace-1234567890abcdef',
                  name: 'auth_middleware',
                  startTime: 5,
                  endTime: 25,
                  duration: 20,
                  status: 'success',
                },
                {
                  id: 'span-3',
                  parentId: 'span-1',
                  traceId: 'trace-1234567890abcdef',
                  name: 'db_query_user',
                  startTime: 30,
                  endTime: 150,
                  duration: 120,
                  status: 'success',
                  attributes: { 'db.system': 'sqlite', 'db.operation': 'SELECT' },
                },
                {
                  id: 'span-4',
                  parentId: 'span-1',
                  traceId: 'trace-1234567890abcdef',
                  name: 'llm_service_call',
                  startTime: 160,
                  endTime: 1100,
                  duration: 940,
                  status: 'success',
                  attributes: { 'llm.provider': 'openai', 'llm.model': 'gpt-4o' },
                },
                {
                  id: 'span-5',
                  parentId: 'span-4',
                  traceId: 'trace-1234567890abcdef',
                  name: 'http_request_openai',
                  startTime: 165,
                  endTime: 1095,
                  duration: 930,
                  status: 'success',
                },
                {
                  id: 'span-6',
                  parentId: 'span-1',
                  traceId: 'trace-1234567890abcdef',
                  name: 'db_save_history',
                  startTime: 1110,
                  endTime: 1240,
                  duration: 130,
                  status: 'success',
                },
              ],
>>>>>>> origin/docco-update-screenshots-6307953588415915921
            },
          ],
        },
      });
    });

<<<<<<< HEAD
    // Mock dashboard API activity (for waterfall monitor)
    await page.route('**/api/dashboard/activity*', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          events: [
            {
              id: 'span-req-1',
              botName: 'CustomerSupportBot',
              channelId: 'global',
              provider: 'discord',
              llmProvider: 'openai',
              messageType: 'incoming',
              status: 'success',
              timestamp: new Date().toISOString(),
              processingTime: 120,
              userId: 'user-123',
              contentLength: 250,
            },
            {
              id: 'authenticateRequest',
              spanName: 'authenticateRequest',
              botName: 'CustomerSupportBot',
              channelId: 'global',
              provider: 'discord',
              llmProvider: 'openai',
              messageType: 'incoming',
              status: 'success',
              timestamp: new Date().toISOString(),
              processingTime: 50,
              userId: 'user-123',
              contentLength: 0,
            },
            {
              id: 'trace-req-8f9d3b2a',
              spanName: 'trace-req-8f9d3b2a',
              botName: 'CustomerSupportBot',
              channelId: 'global',
              provider: 'discord',
              llmProvider: 'openai',
              messageType: 'incoming',
              status: 'success',
              timestamp: new Date().toISOString(),
              processingTime: 50,
              userId: 'user-123',
              contentLength: 0,
            }
          ],
        },
      })
    );

    await page.route('**/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: { bots: [] },
      })
    );

    await page.route('**/health/api-endpoints', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          overall: {
            status: 'healthy',
            stats: { total: 0, online: 0, slow: 0, offline: 0, error: 0 },
          },
          endpoints: [],
        },
      })
    );

    // Navigate to Monitoring Dashboard
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/monitoring');

    // Verification - wait for dashboard to load
    await expect(page.getByText('Ecosystem Status')).toBeVisible();

    // Click the new Distributed Tracing tab
    await page.getByRole('tab', { name: 'Distributed Tracing' }).click();

    // Wait for the waterfall component to be visible
    await expect(page.getByText('Distributed Trace')).toBeVisible();
    await expect(page.getByText('trace-req-8f9d3b2a')).toBeVisible();

    // We should now see the sub-span 'authenticateRequest'
    await expect(page.getByText('authenticateRequest')).toBeVisible();

    // Click on 'authenticateRequest' to open the Span Metadata Inspector
    await page.getByText('authenticateRequest').click();

    // Wait for the inspector panel to become visible
    await expect(page.getByText('Span ID:')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'docs/screenshots/distributed-trace-waterfall.png',
      fullPage: true,
    });
=======
    // Go to system management directly to traces tab or default
    await page.goto('/admin/system');

    // Screenshot full page ignoring failures
    await page.screenshot({ path: 'docs/screenshots/distributed-trace-waterfall.png', fullPage: true });
>>>>>>> origin/docco-update-screenshots-6307953588415915921
  });
});
