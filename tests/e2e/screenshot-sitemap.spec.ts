import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  const mockSitemapData = {
    generated: new Date().toISOString(),
    baseUrl: 'https://demo.open-hivemind.com',
    totalUrls: 5,
    urls: [
      {
        url: '/',
        fullUrl: 'https://demo.open-hivemind.com/',
        priority: 1.0,
        changefreq: 'daily',
        lastmod: new Date().toISOString(),
        access: 'public',
        description: 'Home page and dashboard overview',
      },
      {
        url: '/admin/bots',
        fullUrl: 'https://demo.open-hivemind.com/admin/bots',
        priority: 0.9,
        changefreq: 'always',
        lastmod: new Date().toISOString(),
        access: 'authenticated',
        description: 'Manage and configure bot instances',
      },
      {
        url: '/admin/personas',
        fullUrl: 'https://demo.open-hivemind.com/admin/personas',
        priority: 0.8,
        changefreq: 'weekly',
        lastmod: new Date().toISOString(),
        access: 'authenticated',
        description: 'Define AI personas and system prompts',
      },
      {
        url: '/admin/mcp/servers',
        fullUrl: 'https://demo.open-hivemind.com/admin/mcp/servers',
        priority: 0.8,
        changefreq: 'daily',
        lastmod: new Date().toISOString(),
        access: 'owner',
        description: 'Connect and manage MCP servers',
      },
      {
        url: '/login',
        fullUrl: 'https://demo.open-hivemind.com/login',
        priority: 0.5,
        changefreq: 'monthly',
        lastmod: new Date().toISOString(),
        access: 'public',
        description: 'User authentication page',
      },
    ],
  };

  test('Capture Sitemap Views', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock the sitemap API response
    await page.route('**/sitemap.json*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSitemapData),
      });
    });

    // Navigate to Sitemap page
    await page.goto('/admin/sitemap');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Dynamic Sitemap")');
    await page.waitForSelector('.card-body'); // Wait for grid items

    // Screenshot Grid View
    await page.screenshot({ path: 'docs/images/sitemap-grid-view.png', fullPage: true });

    // Switch to List View
    const listViewButton = page.locator('button[title="List View"]');
    await listViewButton.click();

    // Wait for table
    await page.waitForSelector('table');

    // Screenshot Table View
    await page.screenshot({ path: 'docs/images/sitemap-table-view.png', fullPage: true });

    // Test Search
    const searchInput = page.locator('input[placeholder="Search pages..."]');
    await searchInput.fill('bot');

    // Wait for filtering (should be instant, but let's wait a tick)
    await page.waitForTimeout(500);

    // Screenshot Search Result
    await page.screenshot({ path: 'docs/images/sitemap-search-result.png', fullPage: true });
  });
});
