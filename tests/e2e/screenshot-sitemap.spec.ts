import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  test('Capture Sitemap Grid, Table and Search Views', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock the sitemap.json response
    await page.route('**/sitemap.json*', async (route) => {
      const json = {
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
            description: 'Main Dashboard',
            access: 'public'
          },
          {
            url: '/admin/bots',
            fullUrl: 'http://localhost:3000/admin/bots',
            changefreq: 'daily',
            priority: 0.9,
            lastmod: new Date().toISOString(),
            description: 'Bot Management',
            access: 'authenticated'
          },
          {
            url: '/admin/personas',
            fullUrl: 'http://localhost:3000/admin/personas',
            changefreq: 'weekly',
            priority: 0.8,
            lastmod: new Date().toISOString(),
            description: 'Persona Configuration',
            access: 'authenticated'
          },
          {
            url: '/admin/settings',
            fullUrl: 'http://localhost:3000/admin/settings',
            changefreq: 'monthly',
            priority: 0.5,
            lastmod: new Date().toISOString(),
            description: 'System Settings',
            access: 'owner'
          },
          {
            url: '/admin/mcp/servers',
            fullUrl: 'http://localhost:3000/admin/mcp/servers',
            changefreq: 'daily',
            priority: 0.7,
            lastmod: new Date().toISOString(),
            description: 'MCP Server Management',
            access: 'authenticated'
          }
        ]
      };
      await route.fulfill({ json });
    });

    // Navigate to Sitemap page
    await navigateAndWaitReady(page, '/admin/sitemap');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Dynamic Sitemap")');

    // Screenshot Grid View
    await page.screenshot({ path: 'docs/images/sitemap-grid-view.png', fullPage: true });

    // Switch to List View
    const listButton = page.locator('button[title="List View"]');
    await listButton.click();

    // Wait for table to appear
    await page.waitForSelector('table');

    // Screenshot Table View
    await page.screenshot({ path: 'docs/images/sitemap-table-view.png', fullPage: true });

    // Search for "bot"
    const searchInput = page.locator('input[placeholder="Search pages..."]');
    await searchInput.fill('bot');

    // Wait for filter to apply (should be almost instant, but safe to wait a tick)
    await page.waitForTimeout(500);

    // Screenshot Search Result
    await page.screenshot({ path: 'docs/images/sitemap-search-result.png', fullPage: true });
  });
});
