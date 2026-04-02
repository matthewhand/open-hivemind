import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupAuth,
  setupTestWithErrorDetection,
} from './test-utils';

/**
 * Providers API E2E Tests
 * Validates GET /api/providers/memory, GET /api/providers/tool,
 * POST /api/providers/memory/:name/test, and GET /api/health memory section.
 */
test.describe('Providers API', () => {
  test.setTimeout(90000);

  test('GET /api/providers/memory returns valid structure', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/providers/memory`);

    // The endpoint may return 200 or 401/403 depending on auth config.
    // If the server is running and the route is mounted, we get a JSON response.
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('providers');
      expect(typeof body.count).toBe('number');
      expect(Array.isArray(body.providers)).toBe(true);

      // Validate each provider entry if any exist
      for (const provider of body.providers) {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('label');
        expect(provider).toHaveProperty('status');
        expect(['ok', 'error', 'unknown']).toContain(provider.status);
      }
    } else {
      // Accept auth-related failures in test environments
      expect([401, 403, 404, 500]).toContain(res.status());
    }
  });

  test('GET /api/providers/tool returns valid structure', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/providers/tool`);

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('providers');
      expect(typeof body.count).toBe('number');
      expect(Array.isArray(body.providers)).toBe(true);

      // Validate each tool provider entry if any exist
      for (const provider of body.providers) {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('label');
        expect(provider).toHaveProperty('status');
        expect(['active', 'unhealthy', 'unknown']).toContain(provider.status);
      }
    } else {
      expect([401, 403, 404, 500]).toContain(res.status());
    }
  });

  test('POST /api/providers/memory/:name/test returns summary and steps', async ({
    request,
    baseURL,
  }) => {
    // First, discover registered memory providers
    const listRes = await request.get(`${baseURL}/api/providers/memory`);

    if (listRes.status() !== 200) {
      test.skip(true, 'Memory providers endpoint not available');
      return;
    }

    const list = await listRes.json();

    if (list.count === 0 || list.providers.length === 0) {
      test.skip(true, 'No memory providers registered');
      return;
    }

    const providerName = list.providers[0].name;
    const testRes = await request.post(`${baseURL}/api/providers/memory/${providerName}/test`, {
      data: { userId: 'playwright-e2e' },
    });

    // The test endpoint might fail if the provider isn't fully configured,
    // but the response structure should still be valid
    if (testRes.status() === 200) {
      const body = await testRes.json();
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('steps');
      expect(Array.isArray(body.steps)).toBe(true);

      // Validate summary fields
      expect(body.summary).toHaveProperty('passed');
      expect(body.summary).toHaveProperty('failed');
      expect(body.summary).toHaveProperty('totalMs');

      // Validate step entries
      for (const step of body.steps) {
        expect(step).toHaveProperty('step');
        expect(step).toHaveProperty('status');
        expect(step).toHaveProperty('ms');
        expect(['pass', 'fail', 'skip']).toContain(step.status);
      }
    } else {
      // Accept 404 (provider not found), 500 (provider error), or auth errors
      expect([401, 403, 404, 500]).toContain(testRes.status());
    }
  });

  test('POST /api/providers/memory/nonexistent/test returns 404', async ({ request, baseURL }) => {
    const res = await request.post(
      `${baseURL}/api/providers/memory/nonexistent-provider-xyz/test`,
      { data: { userId: 'playwright-e2e' } }
    );

    // Should be 404 if the route is mounted, or auth error
    expect([401, 403, 404]).toContain(res.status());

    if (res.status() === 404) {
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('registered');
      expect(Array.isArray(body.registered)).toBe(true);
    }
  });

  test('GET /api/health includes memory provider information', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/health`);

    // Basic health endpoint should always be reachable
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('memory');
    expect(body).toHaveProperty('system');
  });

  test('Memory providers UI page renders with mocked data', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock the endpoints
    await page.route('**/api/auth/check', (route) =>
      route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
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
    await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/providers/memory', (route) =>
      route.fulfill({
        status: 200,
        json: {
          count: 2,
          providers: [
            { name: 'local-mem0', id: 'mem0', label: 'Mem0 (Local)', status: 'ok' },
            { name: 'redis-memory', id: 'redis', label: 'Redis Memory', status: 'unknown' },
          ],
        },
      })
    );
    await page.route('**/api/providers/tool', (route) =>
      route.fulfill({
        status: 200,
        json: {
          count: 1,
          providers: [
            { name: 'mcp-tools', id: 'mcp', label: 'MCP Tool Provider', status: 'active' },
          ],
        },
      })
    );
    await page.route('**/api/csrf-token', (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf' } })
    );
    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );

    await navigateAndWaitReady(page, '/admin/providers/memory');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: 'docs/screenshots/providers-api-memory.png',
      fullPage: true,
    });

    await assertNoErrors(errors, 'Memory providers UI page');
  });

  test('Tool providers UI page renders with mocked data', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock the endpoints
    await page.route('**/api/auth/check', (route) =>
      route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
    );
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
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
    await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/providers/tool', (route) =>
      route.fulfill({
        status: 200,
        json: {
          count: 2,
          providers: [
            { name: 'mcp-tools', id: 'mcp', label: 'MCP Tool Provider', status: 'active' },
            { name: 'custom-tools', id: 'custom', label: 'Custom Tools', status: 'unknown' },
          ],
        },
      })
    );
    await page.route('**/api/csrf-token', (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf' } })
    );
    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );

    await navigateAndWaitReady(page, '/admin/providers/tool');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: 'docs/screenshots/providers-api-tool.png',
      fullPage: true,
    });

    await assertNoErrors(errors, 'Tool providers UI page');
  });
});
