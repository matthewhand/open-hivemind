import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Sitemap Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock sitemap data
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
              url: '/admin/sitemap',
              fullUrl: 'http://localhost:3000/admin/sitemap',
              changefreq: 'weekly',
              priority: 0.5,
              lastmod: new Date().toISOString(),
              description: 'Sitemap Page',
              access: 'authenticated'
            },
            {
               url: '/admin/settings',
               fullUrl: 'http://localhost:3000/admin/settings',
               changefreq: 'monthly',
               priority: 0.7,
               lastmod: new Date().toISOString(),
               description: 'System Settings',
               access: 'owner'
            },
            {
                url: '/login',
                fullUrl: 'http://localhost:3000/login',
                changefreq: 'monthly',
                priority: 0.8,
                lastmod: new Date().toISOString(),
                description: 'Login Page',
                access: 'public'
            }
          ]
        })
      });
    });
  });

  test('capture Sitemap page screenshot', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Sitemap page
    await page.goto('/admin/sitemap');

    // Wait for the page to load and cards to be displayed
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/sitemap-page.png', fullPage: true });
  });
});
