import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  test('Capture Sitemap Views', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock sitemap.json response
    await page.route('**/sitemap.json*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generated: "2023-10-27T10:00:00Z",
          baseUrl: "https://example.com",
          totalUrls: 12,
          urls: [
            { url: "/", fullUrl: "https://example.com/", priority: 1.0, changefreq: "daily", lastmod: "2023-10-27", access: "public", description: "Home page" },
            { url: "/login", fullUrl: "https://example.com/login", priority: 0.8, changefreq: "monthly", lastmod: "2023-10-20", access: "public", description: "Login page" },
            { url: "/admin/bots", fullUrl: "https://example.com/admin/bots", priority: 0.9, changefreq: "daily", lastmod: "2023-10-27", access: "authenticated", description: "Bot Management" },
            { url: "/admin/personas", fullUrl: "https://example.com/admin/personas", priority: 0.7, changefreq: "weekly", lastmod: "2023-10-25", access: "authenticated", description: "Persona Management" },
            { url: "/admin/mcp/servers", fullUrl: "https://example.com/admin/mcp/servers", priority: 0.6, changefreq: "weekly", lastmod: "2023-10-24", access: "authenticated", description: "MCP Servers" },
            { url: "/admin/settings", fullUrl: "https://example.com/admin/settings", priority: 0.5, changefreq: "monthly", lastmod: "2023-10-01", access: "owner", description: "System Settings" },
            { url: "/admin/monitoring", fullUrl: "https://example.com/admin/monitoring", priority: 0.5, changefreq: "always", lastmod: "2023-10-27", access: "owner", description: "System Monitoring" },
            { url: "/admin/integrations/webhook", fullUrl: "https://example.com/admin/integrations/webhook", priority: 0.4, changefreq: "monthly", lastmod: "2023-09-15", access: "owner", description: "Webhook Configuration" },
            { url: "/api/health", fullUrl: "https://example.com/api/health", priority: 0.0, changefreq: "always", lastmod: "2023-10-27", access: "public", description: "API Health Check" },
            { url: "/admin/ai/dashboard", fullUrl: "https://example.com/admin/ai/dashboard", priority: 0.6, changefreq: "daily", lastmod: "2023-10-26", access: "authenticated", description: "AI Usage Dashboard" },
             { url: "/webui/api/docs", fullUrl: "https://example.com/webui/api/docs", priority: 0.3, changefreq: "monthly", lastmod: "2023-08-01", access: "public", description: "API Documentation" },
             { url: "/admin/sitemap", fullUrl: "https://example.com/admin/sitemap", priority: 0.1, changefreq: "daily", lastmod: "2023-10-27", access: "authenticated", description: "This Sitemap" },
          ]
        })
      });
    });

    // Navigate to Sitemap page
    await navigateAndWaitReady(page, '/admin/sitemap');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Dynamic Sitemap")');
    await page.waitForSelector('.card-body'); // Wait for cards to render

    // Screenshot Grid View
    await page.screenshot({ path: 'docs/images/sitemap-grid-view.png', fullPage: true });

    // Switch to List View
    const listButton = page.getByTitle('List View');
    await listButton.click();

    // Wait for table
    await page.waitForSelector('table');

    // Screenshot Table View
    await page.screenshot({ path: 'docs/images/sitemap-table-view.png', fullPage: true });

    // Search for "bot"
    const searchInput = page.getByPlaceholder('Search pages...');
    await searchInput.fill('bot');

    // Wait for filter to apply (should be fast, but let's wait for rows to reduce)
    await page.waitForTimeout(500); // React state update

    // Screenshot Search Result
    await page.screenshot({ path: 'docs/images/sitemap-search-result.png', fullPage: true });
  });
});
