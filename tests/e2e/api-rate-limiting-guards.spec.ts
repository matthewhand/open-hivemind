import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('API Rate Limiting UI', () => {
  test('Capture Rate Limiting Section Guards', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

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
              description: 'Default security profile.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner' },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'medium' },
              },
            }
          ],
        }),
      });
    });

    // Navigate to guards
    await page.goto('/admin/guards');
    await page.waitForSelector('.card');

    // Open "New Profile" modal
    await page.getByRole('button', { name: 'New Profile' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: /Create.*Profile/i });
    await expect(modal).toBeVisible();

    // Open rate limiter collapse
    const rateLimiterCollapse = page.locator('.collapse:has(.collapse-title:has-text("Rate Limiter")) > input[type="checkbox"]').first();
    await rateLimiterCollapse.check();

    // Enable rate limiter
    const rateLimiterToggle = page.locator('.collapse-title:has-text("Rate Limiter") input[type="checkbox"].toggle');
    await rateLimiterToggle.check();

    await page.waitForTimeout(500);

    // Screenshot the collapse content
    await page.locator('.collapse:has(.collapse-title:has-text("Rate Limiter"))').screenshot({ path: 'docs/screenshots/api-rate-limiting-guards-before.png' });
  });
});
