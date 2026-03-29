import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
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

    // Mock Sitemap Data
    await page.route('/sitemap.json*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generated: new Date().toISOString(),
          baseUrl: 'http://localhost:3000',
          totalUrls: 5,
          urls: [
            {
              url: '/',
              fullUrl: 'http://localhost:3000/',
              changefreq: 'daily',
              priority: 1.0,
              lastmod: new Date().toISOString(),
              description: 'The main dashboard and overview page.',
              access: 'public',
            },
            {
              url: '/admin/bots',
              fullUrl: 'http://localhost:3000/admin/bots',
              changefreq: 'always',
              priority: 0.9,
              lastmod: new Date().toISOString(),
              description: 'Manage AI bot instances and configurations.',
              access: 'authenticated',
            },
            {
              url: '/admin/mcp/servers',
              fullUrl: 'http://localhost:3000/admin/mcp/servers',
              changefreq: 'daily',
              priority: 0.8,
              lastmod: new Date().toISOString(),
              description: 'Configure and monitor MCP servers.',
              access: 'owner',
            },
            {
              url: '/login',
              fullUrl: 'http://localhost:3000/login',
              changefreq: 'monthly',
              priority: 0.5,
              lastmod: new Date().toISOString(),
              description: 'User authentication page.',
              access: 'public',
            },
            {
              url: '/admin/settings',
              fullUrl: 'http://localhost:3000/admin/settings',
              changefreq: 'weekly',
              priority: 0.7,
              lastmod: new Date().toISOString(),
              description: 'System-wide settings and configuration.',
              access: 'owner',
            },
          ],
        }),
      });
    });
  });

  test('Capture Sitemap page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Sitemap page
    await page.goto('/admin/sitemap');

    // Wait for content to load (cards)
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/sitemap-page.png', fullPage: true });
  });
});
