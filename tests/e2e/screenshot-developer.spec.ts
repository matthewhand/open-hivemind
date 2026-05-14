import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Developer Page Documentation Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock background polling endpoints
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: true } })
    );
  });

  test('capture developer pages tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // First tab (Sitemap)
    await page.goto('/admin/developer?tab=sitemap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Sitemap', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/developer-sitemap.png', fullPage: true });

    // UI Components tab
    await page.goto('/admin/developer?tab=showcase');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('DaisyUI Component Reference')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/developer-showcase.png', fullPage: true });

    // Specs tab
    await page.goto('/admin/developer?tab=specs');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Specifications').first()).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/developer-specs.png', fullPage: true });

    // Static Pages tab
    await page.goto('/admin/developer?tab=static-pages');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Static Pages', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/developer-static-pages.png', fullPage: true });
  });
});
