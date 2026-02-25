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

    // Mock background polling endpoints to prevent errors/warnings
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

    // Mock Guard Profiles list
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
              description: 'Balanced security settings for production bots.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'medium' },
              },
            },
            {
              id: '2',
              name: 'Development',
              description: 'Open access for development and testing.',
              guards: {
                mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: false, maxRequests: 1000, windowMs: 60000 },
                contentFilter: { enabled: false, strictness: 'low' },
              },
            },
            {
              id: '3',
              name: 'Strict Security',
              description: 'Maximum security enforcement for sensitive operations.',
              guards: {
                mcpGuard: { enabled: true, type: 'custom', allowedUsers: ['admin-user-id'] },
                rateLimit: { enabled: true, maxRequests: 10, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'high' },
              },
            },
          ],
        }),
      });
    });
  });

  test('capture guard profiles page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Guard Profiles page
    await page.goto('/admin/guards');

    // Wait for the page to load and profiles to be displayed
    await expect(page.locator('h1').filter({ hasText: 'Guard Profiles' })).toBeVisible();
    await expect(page.getByText('Standard Production')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guard-profiles-list.png', fullPage: true });

    // Open "New Profile" modal
    await page.getByRole('button', { name: 'New Profile' }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box').filter({ hasText: 'Create Guard Profile' });
    await expect(modal).toBeVisible();

    // Fill in some dummy data for the screenshot
    await modal.locator('input[type="text"]').first().fill('My New Profile');

    // Take screenshot of the create modal
    await page.screenshot({ path: 'docs/screenshots/guard-profile-modal.png' });
  });
});
