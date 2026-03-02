import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Guards Page Rate Limit Screenshots', () => {
  test('capture guards page rate limit modal screenshots', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock Guard Profiles
    await page.route('/api/admin/guard-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: '1',
              name: 'Standard Production',
              description:
                'Default security profile for production bots. Includes rate limiting and content filtering.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner' },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'medium' },
              },
            },
          ],
        }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/admin/guards');
    await expect(page.getByText('Guard Profiles')).toBeVisible();

    // Open "Edit Profile" modal
    await page.locator('.btn-square').nth(1).click();

    // Wait for modal
    const modal = page.locator('dialog[open]');
    await expect(modal).toBeVisible();

    // Open Rate Limiter accordion
    await modal.getByText('Rate Limiter').click({ force: true });
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/api-rate-limit-after.png' });
  });
});
