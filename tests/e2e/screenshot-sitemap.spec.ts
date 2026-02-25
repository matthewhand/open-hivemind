import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  const mockSitemapData = {
    generated: "2023-11-15T10:00:00Z",
    baseUrl: "https://example.com",
    totalUrls: 5,
    urls: [
      {
        url: "/",
        fullUrl: "https://example.com/",
        changefreq: "daily",
        priority: 1.0,
        lastmod: "2023-11-14",
        description: "Main Dashboard",
        access: "authenticated"
      },
      {
        url: "/admin/bots",
        fullUrl: "https://example.com/admin/bots",
        changefreq: "daily",
        priority: 0.9,
        lastmod: "2023-11-14",
        description: "Bot Management Dashboard",
        access: "authenticated"
      },
      {
        url: "/admin/mcp/servers",
        fullUrl: "https://example.com/admin/mcp/servers",
        changefreq: "weekly",
        priority: 0.8,
        lastmod: "2023-11-10",
        description: "MCP Server Configuration",
        access: "owner"
      },
      {
        url: "/login",
        fullUrl: "https://example.com/login",
        changefreq: "monthly",
        priority: 0.5,
        lastmod: "2023-10-01",
        description: "User Login Page",
        access: "public"
      },
      {
        url: "/admin/settings",
        fullUrl: "https://example.com/admin/settings",
        changefreq: "monthly",
        priority: 0.7,
        lastmod: "2023-11-01",
        description: "System Settings",
        access: "owner"
      }
    ]
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
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await expect(page.locator('h1')).toContainText('Dynamic Sitemap');
    await expect(page.getByText('Total Pages')).toBeVisible();

    // 1. Screenshot Grid View (Default)
    await page.screenshot({ path: 'docs/images/sitemap-grid-view.png', fullPage: true });

    // 2. Switch to List View and Screenshot
    const listButton = page.locator('button[title="List View"]');
    await listButton.click();
    // Wait for table to appear
    await expect(page.locator('table')).toBeVisible();
    await page.screenshot({ path: 'docs/images/sitemap-table-view.png', fullPage: true });

    // 3. Search and Screenshot
    const searchInput = page.locator('input[placeholder="Search pages..."]');
    await searchInput.fill('bot');
    // Wait for filtering (should be instant as it's client side, but good to wait a tick)
    await page.waitForTimeout(500);
    // Verify filtering happened (should see "Bot Management" row, shouldn't see "Login")
    await expect(page.locator('table')).toContainText('Bot Management');
    await expect(page.locator('table')).not.toContainText('User Login Page');

    await page.screenshot({ path: 'docs/images/sitemap-search-result.png', fullPage: true });
  });
});
