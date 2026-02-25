import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Sitemap Visuals Screenshots', () => {
  test('Capture Sitemap Dashboard and Views', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock Sitemap Data
    const mockSitemap = {
      generated: new Date().toISOString(),
      baseUrl: 'http://localhost:3000',
      totalUrls: 42,
      urls: [
        { url: '/', fullUrl: 'http://localhost:3000/', changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString(), description: 'Home Page', access: 'public' },
        { url: '/login', fullUrl: 'http://localhost:3000/login', changefreq: 'monthly', priority: 0.8, lastmod: new Date().toISOString(), description: 'Authentication', access: 'public' },
        { url: '/admin/overview', fullUrl: 'http://localhost:3000/admin/overview', changefreq: 'always', priority: 0.9, lastmod: new Date().toISOString(), description: 'System Dashboard', access: 'authenticated' },
        { url: '/admin/bots', fullUrl: 'http://localhost:3000/admin/bots', changefreq: 'daily', priority: 0.9, lastmod: new Date().toISOString(), description: 'Bot Management', access: 'owner' },
        { url: '/admin/settings', fullUrl: 'http://localhost:3000/admin/settings', changefreq: 'weekly', priority: 0.7, lastmod: new Date().toISOString(), description: 'System Configuration', access: 'owner' },
        { url: '/admin/activity', fullUrl: 'http://localhost:3000/admin/activity', changefreq: 'always', priority: 0.6, lastmod: new Date().toISOString(), description: 'Activity Feed', access: 'authenticated' },
      ]
    };

    await page.route('**/sitemap.json*', async route => {
      await route.fulfill({ json: mockSitemap });
    });

    await navigateAndWaitReady(page, '/admin/sitemap');

    // Wait for content
    await expect(page.getByText('Total Pages')).toBeVisible();
    await expect(page.getByText('Home Page')).toBeVisible();

    // Screenshot 1: Dashboard / Grid View
    await page.screenshot({ path: 'docs/images/sitemap-dashboard.png', fullPage: true });

    // Switch to List View
    await page.getByTitle('List View').click();
    await page.waitForTimeout(500); // Animation wait

    // Screenshot 2: List View
    await page.screenshot({ path: 'docs/images/sitemap-list-view.png', fullPage: true });
  });
});
