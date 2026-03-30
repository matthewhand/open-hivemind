import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupTestWithErrorDetection,
  waitForPageReady,
} from './test-utils';

/**
 * Smoke tests: every nav route must render without JS errors or crash.
 * A "crash" is defined as: no <body> content, or a React error boundary message.
 */

const ALL_PAGES = [
  { path: '/admin/overview', label: 'Overview' },
  { path: '/admin/providers/llm', label: 'LLM Providers' },
  { path: '/admin/providers/message', label: 'Message Providers' },
  { path: '/admin/bots', label: 'Bots' },
  { path: '/admin/personas', label: 'Personas' },
  { path: '/admin/guards', label: 'Guards' },
  { path: '/admin/settings', label: 'Settings' },
  { path: '/admin/monitoring', label: 'Monitoring' },
  { path: '/admin/configuration', label: 'Configuration' },
  { path: '/admin/showcase', label: 'Showcase' },
  { path: '/admin/sitemap', label: 'Sitemap' },
];

const mockBots = [
  {
    id: 'bot-1',
    name: 'Discord Bot',
    provider: 'discord',
    messageProvider: 'discord',
    llmProvider: 'openai',
    status: 'running',
    connected: true,
    messageCount: 42,
    errorCount: 0,
  },
];

/**
 * Setup comprehensive API mocks so all pages can render without a backend.
 */
async function mockAllEndpoints(page: import('@playwright/test').Page) {
  // Mock /health/* endpoints (outside /api/ prefix)
  await page.route('**/health/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/health/detailed') {
      return route.fulfill({
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
      });
    }
    if (path === '/health/api-endpoints') {
      return route.fulfill({
        status: 200,
        json: {
          stats: { total: 0, healthy: 0, unhealthy: 0, degraded: 0, unknown: 0 },
          endpoints: [],
          timestamp: new Date().toISOString(),
        },
      });
    }

    return route.fulfill({ status: 200, json: {} });
  });

  // Mock /sitemap.json (used by SitemapPage and useSitemap hook)
  await page.route('**/sitemap.json*', (route) => {
    return route.fulfill({
      status: 200,
      json: {
        generated: new Date().toISOString(),
        baseUrl: 'http://localhost:4050',
        totalUrls: 2,
        urls: [
          {
            url: '/admin/overview',
            fullUrl: 'http://localhost:4050/admin/overview',
            changefreq: 'daily',
            priority: 1.0,
            lastmod: new Date().toISOString(),
            description: 'Overview',
            access: 'authenticated',
          },
          {
            url: '/admin/bots',
            fullUrl: 'http://localhost:4050/admin/bots',
            changefreq: 'daily',
            priority: 0.8,
            lastmod: new Date().toISOString(),
            description: 'Bots',
            access: 'authenticated',
          },
        ],
      },
    });
  });

  // Mock all /api/* endpoints
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    // Health endpoints
    if (path === '/api/health/detailed') {
      return route.fulfill({
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
      });
    }
    if (path === '/api/health') {
      return route.fulfill({ status: 200, json: { status: 'ok' } });
    }

    // Config endpoints
    if (path === '/api/config/llm-status') {
      return route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      });
    }
    if (path === '/api/config/global') {
      return route.fulfill({ status: 200, json: {} });
    }
    if (path === '/api/config/llm-profiles') {
      return route.fulfill({
        status: 200,
        json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] },
      });
    }
    if (path === '/api/config/sources') {
      return route.fulfill({ status: 200, json: { sources: [] } });
    }
    if (path === '/api/config') {
      return route.fulfill({ status: 200, json: { bots: mockBots } });
    }

    // Auth
    if (path === '/api/csrf-token') {
      return route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    }

    // Dashboard
    if (path === '/api/dashboard/status') {
      return route.fulfill({ status: 200, json: { bots: mockBots, uptime: 100 } });
    }
    if (path === '/api/dashboard/api/status') {
      return route.fulfill({ status: 200, json: { bots: mockBots, uptime: 100 } });
    }

    // Bots
    if (path === '/api/bots') {
      return route.fulfill({ status: 200, json: { data: { bots: mockBots } } });
    }

    // Personas
    if (path === '/api/personas') {
      return route.fulfill({
        status: 200,
        json: [
          {
            id: 'persona-1',
            name: 'Helpful Assistant',
            description: 'A friendly AI assistant',
            category: 'general',
            systemPrompt: 'You are a helpful assistant.',
            traits: ['friendly'],
            isBuiltIn: true,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            assignedBotIds: [],
            assignedBotNames: [],
          },
        ],
      });
    }

    // Admin endpoints
    if (path === '/api/admin/guard-profiles') {
      return route.fulfill({ status: 200, json: { data: [] } });
    }
    if (path === '/api/admin/llm-profiles') {
      return route.fulfill({
        status: 200,
        json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] },
      });
    }
    if (path === '/api/admin/mcp-servers') {
      return route.fulfill({ status: 200, json: { servers: {}, configurations: [] } });
    }
    if (path === '/api/admin/system-info') {
      return route.fulfill({ status: 200, json: {} });
    }
    if (path === '/api/admin/env-overrides') {
      return route.fulfill({ status: 200, json: {} });
    }

    // MCP
    if (path === '/api/mcp/servers') {
      return route.fulfill({ status: 200, json: [] });
    }

    // Activity
    if (path.startsWith('/api/activity')) {
      return route.fulfill({ status: 200, json: { data: [], total: 0 } });
    }

    // Demo
    if (path === '/api/demo/status') {
      return route.fulfill({ status: 200, json: { active: false } });
    }

    // Chat
    if (path.startsWith('/api/chat')) {
      return route.fulfill({ status: 200, json: { messages: [] } });
    }

    // Settings
    if (path.startsWith('/api/settings')) {
      return route.fulfill({
        status: 200,
        json: { siteName: 'Open Hivemind', theme: 'dark', notifications: true, language: 'en' },
      });
    }

    // Marketplace
    if (path.startsWith('/api/marketplace')) {
      return route.fulfill({ status: 200, json: [] });
    }

    // Sitemap
    if (path === '/api/sitemap' || path.startsWith('/api/sitemap')) {
      return route.fulfill({
        status: 200,
        json: {
          pages: [
            { path: '/admin/overview', label: 'Overview', category: 'Main' },
            { path: '/admin/bots', label: 'Bots', category: 'Configuration' },
          ],
        },
      });
    }

    // Import/Export
    if (path.startsWith('/api/import-export')) {
      return route.fulfill({ status: 200, json: { success: true, data: [] } });
    }

    // Secure configs
    if (path.startsWith('/api/secure-configs')) {
      return route.fulfill({ status: 200, json: { configs: [] } });
    }

    // Cache
    if (path.startsWith('/api/cache')) {
      return route.fulfill({ status: 200, json: { success: true } });
    }

    // Catch-all
    return route.fulfill({ status: 200, json: {} });
  });
}

test.describe('Page Rendering - All Admin Pages', () => {
  test.setTimeout(90000);

  for (const { path, label } of ALL_PAGES) {
    test(`${label} renders without errors`, async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await mockAllEndpoints(page);
      await navigateAndWaitReady(page, path);

      // Must stay on the requested route (no redirect to /login counts as a crash for smoke purposes)
      expect(page.url()).toContain(path);

      // Body must have content
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();

      // No React error boundary text
      const bodyText = await body.innerText().catch(() => '');
      expect(bodyText).not.toContain('Something went wrong');
      expect(bodyText).not.toContain('Unexpected Application Error');

      await page.screenshot({
        path: `test-results/pages-${label.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      });
      await assertNoErrors(errors, `${label} page`);
    });
  }

  test('can navigate between all pages without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllEndpoints(page);
    for (const { path } of ALL_PAGES) {
      await page.goto(path);
      await waitForPageReady(page);
    }
    await assertNoErrors(errors, 'Multi-page navigation');
  });

  test.describe('Responsive Design', () => {
    test('renders on mobile viewport without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await mockAllEndpoints(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateAndWaitReady(page, '/admin/bots');
      await page.screenshot({ path: 'test-results/pages-mobile-bots.png', fullPage: true });
      await assertNoErrors(errors, 'Mobile viewport');
    });

    test('renders on tablet viewport without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await mockAllEndpoints(page);
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateAndWaitReady(page, '/admin/bots');
      await page.screenshot({ path: 'test-results/pages-tablet-bots.png', fullPage: true });
      await assertNoErrors(errors, 'Tablet viewport');
    });
  });
});
