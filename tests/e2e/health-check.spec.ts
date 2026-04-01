import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Health Check E2E Tests
 * Validates GET /health, GET /api/health/detailed/services,
 * and the health dashboard UI page.
 */
test.describe('Health Check', () => {
  test.setTimeout(90000);

  test('GET /health returns 200 with valid structure', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/health`);

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(typeof body.uptime).toBe('number');
    expect(body).toHaveProperty('memory');
    expect(body.memory).toHaveProperty('used');
    expect(body.memory).toHaveProperty('total');
    expect(body.memory).toHaveProperty('percentage');
    expect(body).toHaveProperty('system');
    expect(body.system).toHaveProperty('platform');
    expect(body.system).toHaveProperty('nodeVersion');
  });

  test('GET /api/health/detailed/services includes memory section', async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(`${baseURL}/api/health/detailed/services`);

    if (res.status() === 200) {
      const body = await res.json();

      // The response should be an array of service objects or have a services property
      const services = Array.isArray(body) ? body : body.services ?? [];
      expect(Array.isArray(services)).toBe(true);

      // Validate service entry structure
      for (const service of services) {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('status');
        expect(['healthy', 'degraded', 'down']).toContain(service.status);
        expect(service).toHaveProperty('latencyMs');
        expect(service).toHaveProperty('lastChecked');
        expect(service).toHaveProperty('details');
      }

      // Verify that a memory-related service is present
      const memoryService = services.find(
        (s: { name: string }) =>
          s.name.toLowerCase().includes('memory')
      );
      // Memory Provider service should be listed
      expect(memoryService).toBeDefined();
      expect(memoryService.name).toBe('Memory Provider');
    } else {
      // Accept auth-related or configuration-dependent failures
      expect([401, 403, 404, 500]).toContain(res.status());
    }
  });

  test('GET /api/health/detailed returns detailed health data', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/health/detailed`);

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
  });

  test('Health dashboard page renders correctly', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock the endpoints needed for the health/monitoring dashboard
    await page.route('**/api/auth/check', (route) =>
      route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          uptime: 86400,
          memory: { used: 256, total: 512, percentage: 50 },
          system: { platform: 'linux', nodeVersion: 'v20.0.0', processId: 1234 },
        },
      })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 86400,
          checks: {
            database: { status: 'healthy' },
            configuration: { status: 'healthy' },
            services: { status: 'healthy' },
          },
          memory: { used: 256, total: 512, usage: 50, percentage: 50 },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '6.0.0',
            hostname: 'test-host',
            loadAverage: [0.5, 0.3, 0.2],
            nodeVersion: 'v20.0.0',
          },
        },
      })
    );
    await page.route('**/api/health/detailed/services', (route) =>
      route.fulfill({
        status: 200,
        json: {
          services: [
            {
              name: 'Database',
              status: 'healthy',
              latencyMs: 5,
              lastChecked: new Date().toISOString(),
              details: 'Connected and responding',
            },
            {
              name: 'LLM Providers',
              status: 'healthy',
              latencyMs: 12,
              lastChecked: new Date().toISOString(),
              details: '2/2 providers active',
            },
            {
              name: 'Memory Provider',
              status: 'healthy',
              latencyMs: 3,
              lastChecked: new Date().toISOString(),
              details: '1 active memory provider',
            },
            {
              name: 'Message Providers',
              status: 'degraded',
              latencyMs: 8,
              lastChecked: new Date().toISOString(),
              details: '1/2 providers connected',
            },
          ],
        },
      })
    );
    await page.route('**/health/detailed', (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          version: '1.0.0',
          uptime: 86400,
          services: { database: 'healthy', cache: 'healthy' },
          system: {
            platform: 'linux',
            memory: { total: 8000000000, used: 4000000000, free: 4000000000 },
            cpu: { cores: 4, usage: 25 },
            loadAverage: [1.0, 0.8, 0.5],
          },
        },
      })
    );
    await page.route('**/health/api-endpoints', (route) =>
      route.fulfill({
        status: 200,
        json: {
          stats: { total: 0, healthy: 0, unhealthy: 0, degraded: 0, unknown: 0 },
          endpoints: [],
          timestamp: new Date().toISOString(),
        },
      })
    );
    await page.route('**/api/config/llm-status', (route) =>
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
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/dashboard/status', (route) =>
      route.fulfill({ status: 200, json: { bots: [], uptime: 86400 } })
    );
    await page.route('**/api/dashboard/api/status', (route) =>
      route.fulfill({ status: 200, json: { bots: [], uptime: 86400 } })
    );
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/csrf-token', (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf' } })
    );
    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    await navigateAndWaitReady(page, '/admin/monitoring');
    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({
      path: 'docs/screenshots/health-dashboard.png',
      fullPage: true,
    });

    await assertNoErrors(errors, 'Health dashboard page');
  });
});
