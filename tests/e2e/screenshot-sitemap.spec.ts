import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  test('Capture Sitemap Page Views', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock the /sitemap.json response
    await page.route('**/sitemap.json*', async (route) => {
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
              priority: 1.0,
              changefreq: 'daily',
              lastmod: new Date().toISOString(),
              access: 'public',
              description: 'Home page and dashboard overview'
            },
            {
              url: '/admin/bots',
              fullUrl: 'http://localhost:3000/admin/bots',
              priority: 0.9,
              changefreq: 'always',
              lastmod: new Date().toISOString(),
              access: 'authenticated',
              description: 'Manage AI bots and their configurations'
            },
            {
              url: '/admin/mcp/servers',
              fullUrl: 'http://localhost:3000/admin/mcp/servers',
              priority: 0.8,
              changefreq: 'daily',
              lastmod: new Date().toISOString(),
              access: 'owner',
              description: 'Configure MCP servers and tool integration'
            },
            {
              url: '/admin/settings',
              fullUrl: 'http://localhost:3000/admin/settings',
              priority: 0.5,
              changefreq: 'weekly',
              lastmod: new Date().toISOString(),
              access: 'owner',
              description: 'Global system settings and preferences'
            },
            {
              url: '/login',
              fullUrl: 'http://localhost:3000/login',
              priority: 0.8,
              changefreq: 'monthly',
              lastmod: new Date().toISOString(),
              access: 'public',
              description: 'User authentication and login portal'
            }
          ]
        })
      });
    });

    // Navigate to Sitemap page
    await navigateAndWaitReady(page, '/admin/sitemap');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Dynamic Sitemap")');

    // 1. Screenshot Grid View (Default)
    await page.screenshot({ path: 'docs/images/sitemap-grid-view.png', fullPage: true });

    // 2. Switch to List View
    const listButton = page.locator('button[title="List View"]');
    await listButton.click();
    await page.waitForSelector('table'); // Wait for table to appear
    await page.screenshot({ path: 'docs/images/sitemap-table-view.png', fullPage: true });

    // 3. Search functionality (while in table view)
    const searchInput = page.getByPlaceholder('Search paths or descriptions...');
    await searchInput.fill('bots');
    await page.waitForTimeout(500); // Allow render to update
    await page.screenshot({ path: 'docs/images/sitemap-search-result.png', fullPage: true });
  });
});
