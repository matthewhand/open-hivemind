import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Guard Profiles Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

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
              name: 'Production Strict',
              description: 'Enforces strict security policies for production environments.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'high' }
              }
            },
            {
              id: '2',
              name: 'Development',
              description: 'Relaxed settings for development and testing.',
              guards: {
                mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
                contentFilter: { enabled: false, strictness: 'low' }
              }
            }
          ]
        }),
      });
    });
  });

  test('capture Guard Profiles page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Guard Profiles page
    await page.goto('/admin/guards');

    // Wait for the page to load and profiles to be displayed
    await expect(page.locator('.card').first()).toBeVisible();

    // Wait for header to ensure it's fully rendered (especially after refactor)
    await expect(page.getByRole('heading', { name: 'Guard Profiles' })).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guards-list.png', fullPage: true });

    // Click "New Profile" button
    // Looking for a button with text "New Profile" or similar
    await page.getByRole('button', { name: /New Profile/i }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box').filter({ hasText: /Create Guard Profile/i });
    await expect(modal).toBeVisible();

    // Take screenshot of the create modal
    await page.screenshot({ path: 'docs/screenshots/guards-create-modal.png' });
  });
});
