import { expect, test } from '@playwright/test';

test.describe('Guards Page Rate Limit Screenshots', () => {
  test('capture guards page rate limit modal screenshots', async ({ page }) => {
    // Intercept APIs
    await page.route('/api/admin/guard-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          profiles: [
            {
              id: 'prof-1',
              name: 'Strict Rate Limit',
              description: 'Applies rate limits',
              settings: {
                rateLimiting: {
                  enabled: true,
                  requestsPerMinute: 60,
                  requestsPerHour: 1000,
                  warningThreshold: 80,
                  cooldownMinutes: 5,
                  banThreshold: 5,
                  banDurationMinutes: 60,
                },
              },
            },
          ],
        },
      });
    });

    await page.goto('/admin/guards');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'docs/screenshots/guards-page.png', fullPage: true });
  });
});
