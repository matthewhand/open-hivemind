import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  test('Capture Sitemap Grid, List, and Search Views', async ({ page }) => {
    // Setup authentication
    await setupTestWithErrorDetection(page);

    // Mock sitemap.json response
    await page.route('**/sitemap.json*', async (route) => {
      const json = {
        generated: new Date().toISOString(),
        baseUrl: 'http://localhost:3000',
        totalUrls: 6,
        urls: [
          { url: '/', fullUrl: 'http://localhost:3000/', priority: 1.0, changefreq: 'daily', lastmod: '2023-11-20', access: 'public', description: 'Home page' },
          { url: '/admin/bots', fullUrl: 'http://localhost:3000/admin/bots', priority: 0.9, changefreq: 'daily', lastmod: '2023-11-20', access: 'authenticated', description: 'Bot Management Dashboard' },
          { url: '/admin/personas', fullUrl: 'http://localhost:3000/admin/personas', priority: 0.8, changefreq: 'weekly', lastmod: '2023-11-15', access: 'authenticated', description: 'Manage Personas' },
          { url: '/admin/mcp/servers', fullUrl: 'http://localhost:3000/admin/mcp/servers', priority: 0.8, changefreq: 'weekly', lastmod: '2023-11-18', access: 'owner', description: 'MCP Servers Configuration' },
          { url: '/admin/settings', fullUrl: 'http://localhost:3000/admin/settings', priority: 0.7, changefreq: 'monthly', lastmod: '2023-10-01', access: 'owner', description: 'System Settings' },
          { url: '/login', fullUrl: 'http://localhost:3000/login', priority: 0.5, changefreq: 'monthly', lastmod: '2023-01-01', access: 'public', description: 'Login Page' },
        ]
      };
      await route.fulfill({ json });
    });

    // Navigate to Sitemap page
    await navigateAndWaitReady(page, '/admin/sitemap');

    // Wait for content
    await page.waitForSelector('h1:has-text("Dynamic Sitemap")');
    // Wait for at least one card to be visible
    await page.waitForSelector('.card-body');

    // 1. Screenshot Default Grid View
    await page.screenshot({ path: 'docs/images/sitemap-grid-view.png', fullPage: true });

    // 2. Switch to List View
    const listButton = page.locator('button[title="List View"]');
    await expect(listButton).toBeVisible();
    await listButton.click();
    await page.waitForSelector('table.table'); // Wait for table

    // Screenshot List View
    await page.screenshot({ path: 'docs/images/sitemap-table-view.png', fullPage: true });

    // 3. Search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('bot');

    // Wait for table to update (checking for row reduction)
    await expect(page.locator('table.table tbody tr')).toHaveCount(1); // Should only match '/admin/bots'

    // Screenshot Search Result
    await page.screenshot({ path: 'docs/images/sitemap-search-result.png', fullPage: true });
  });
});
