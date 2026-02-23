
import { test, expect } from '@playwright/test';

test.describe('Sitemap Page', () => {
  test('should load sitemap page and display categories', async ({ page }) => {
    // Navigate to sitemap page
    await page.goto('/admin/sitemap');

    // Check for title
    await expect(page.getByText('Dynamic Sitemap')).toBeVisible();

    // Check for categories
    await expect(page.getByText('Main Application')).toBeVisible();
    await expect(page.getByText('AI Features')).toBeVisible();
    await expect(page.getByText('User Dashboard')).toBeVisible();

    // Check for specific links
    await expect(page.getByText('/admin/bots')).toBeVisible();
    await expect(page.getByText('/admin/ai/dashboard')).toBeVisible();
  });

  test('should match sitemap.json data', async ({ request }) => {
    const response = await request.get('/sitemap.json');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.urls).toBeDefined();
    const urls = data.urls.map((u: any) => u.url);

    expect(urls).toContain('/admin/bots');
    expect(urls).toContain('/admin/ai/dashboard');
    expect(urls).not.toContain('/uber/bots');
  });
});
