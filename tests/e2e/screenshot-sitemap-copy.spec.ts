import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Sitemap Copy Feature', () => {
  test('Verify Copy URL functionality', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Sitemap Data
    const mockSitemap = {
      generated: new Date().toISOString(),
      baseUrl: 'http://localhost:3000',
      totalUrls: 2,
      urls: [
        {
          url: '/admin/overview',
          fullUrl: 'http://localhost:3000/admin/overview',
          changefreq: 'daily',
          priority: 0.9,
          lastmod: new Date().toISOString(),
          description: 'Overview Dashboard',
          access: 'authenticated'
        },
        {
          url: '/login',
          fullUrl: 'http://localhost:3000/login',
          changefreq: 'monthly',
          priority: 0.5,
          lastmod: new Date().toISOString(),
          description: 'Login Page',
          access: 'public'
        }
      ]
    };

    // Mock API responses
    await page.route('**/sitemap.json*', async route => {
      await route.fulfill({ json: mockSitemap });
    });

    // Navigate to Sitemap page
    await navigateAndWaitReady(page, '/admin/sitemap');

    // Wait for content to load
    await page.waitForSelector('h3:has-text("/admin/overview")');

    // Find the Copy URL button for the first entry
    const copyButton = page.locator('button[data-tip="Copy URL"]').first();
    await expect(copyButton).toBeVisible();

    // Click the button
    await copyButton.click();

    // Verify Toast appears
    const toast = page.locator('.alert-success');
    await expect(toast).toContainText('URL copied to clipboard');

    // Screenshot
    await page.screenshot({ path: 'docs/images/sitemap-copy-toast.png' });

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('http://localhost:3000/admin/overview');
  });
});
