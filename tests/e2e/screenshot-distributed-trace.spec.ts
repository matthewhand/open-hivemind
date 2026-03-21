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

    await page.route('/api/dashboard/system-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          uptime: 3600,
          memoryUsage: { heapUsed: 100, heapTotal: 200, rss: 300 },
          activeConnections: 10,
        },
      });
    });

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
            },
          ],
        },
      });
    });

    // Go to system management directly to traces tab or default
    await page.goto('/admin/system');

    // Screenshot full page ignoring failures
    await page.screenshot({ path: 'docs/screenshots/distributed-trace-waterfall.png', fullPage: true });
  });
});
