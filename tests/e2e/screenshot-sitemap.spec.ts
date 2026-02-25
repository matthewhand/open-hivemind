import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  test('Capture Sitemap Grid, Table and Search Views', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock the sitemap API response
    await page.route('**/sitemap.json*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generated: new Date().toISOString(),
          baseUrl: 'https://demo.open-hivemind.com',
          totalUrls: 5,
          urls: [
            {
              url: '/',
              fullUrl: 'https://demo.open-hivemind.com/',
              priority: 1.0,
              changefreq: 'daily',
              lastmod: '2023-10-27',
              access: 'public',
              description: 'Home page and dashboard overview',
            },
            {
              url: '/admin/bots',
              fullUrl: 'https://demo.open-hivemind.com/admin/bots',
              priority: 0.9,
              changefreq: 'always',
              lastmod: '2023-10-27',
              access: 'authenticated',
              description: 'Bot management and configuration',
            },
            {
              url: '/admin/personas',
              fullUrl: 'https://demo.open-hivemind.com/admin/personas',
              priority: 0.8,
              changefreq: 'weekly',
              lastmod: '2023-10-26',
              access: 'authenticated',
              description: 'Manage bot personalities and styles',
            },
            {
              url: '/admin/mcp/servers',
              fullUrl: 'https://demo.open-hivemind.com/admin/mcp/servers',
              priority: 0.7,
              changefreq: 'monthly',
              lastmod: '2023-10-25',
              access: 'owner',
              description: 'Configure MCP servers and tools',
            },
            {
              url: '/admin/settings',
              fullUrl: 'https://demo.open-hivemind.com/admin/settings',
              priority: 0.5,
              changefreq: 'monthly',
              lastmod: '2023-10-20',
              access: 'owner',
              description: 'System-wide settings and configuration',
            },
          ],
        }),
      });
    });

    // Navigate to Sitemap page
    await page.goto('/admin/sitemap');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Dynamic Sitemap")');
    // Wait for the grid to appear
    await page.waitForSelector('.card');

    // Screenshot Grid View
    await page.screenshot({ path: 'docs/images/sitemap-grid-view.png', fullPage: true });

    // Switch to List View
    await page.click('button[title="List View"]');
    await page.waitForSelector('table');

    // Screenshot Table View
    await page.screenshot({ path: 'docs/images/sitemap-table-view.png', fullPage: true });

    // Search for "bot"
    await page.fill('input[placeholder="Search URLs or descriptions..."]', 'bot');

    // Wait for filter to apply (should be fast, but good to wait for stable state)
    await page.waitForTimeout(500);

    // Screenshot Search Result
    await page.screenshot({ path: 'docs/images/sitemap-search-result.png', fullPage: true });
  });
});
