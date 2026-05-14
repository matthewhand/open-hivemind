import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('About Page Documentation Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock background polling endpoints
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    await page.route('/api/health', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          version: '1.0.0',
          status: 'healthy',
          system: { platform: 'linux', nodeVersion: 'v18.0.0' },
        },
      })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: true } })
    );
  });

  test('capture about page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/about');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('About Open-Hivemind')).toBeVisible();

    // Remove any dynamic content or notifications that could cause flakiness
    await page.evaluate(() => {
      const toast = document.querySelector('.toast');
      if (toast) toast.remove();
    });

    await page.screenshot({ path: 'docs/screenshots/about-page.png', fullPage: true });
  });
});
