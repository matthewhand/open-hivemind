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
              id: 'profile-1',
              name: 'Standard Production',
              description: 'Balanced security settings for production bots.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'medium' },
              },
            },
            {
              id: 'profile-2',
              name: 'Strict Security',
              description: 'High security environment with strict content filtering.',
              guards: {
                mcpGuard: { enabled: true, type: 'custom', allowedUsers: ['admin-user-id'] },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'high' },
              },
            },
            {
              id: 'profile-3',
              name: 'Development',
              description: 'Open access for development and testing.',
              guards: {
                mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: false, maxRequests: 1000, windowMs: 60000 },
                contentFilter: { enabled: false, strictness: 'low' },
              },
            },
          ],
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
    // We expect cards to be present.
    // Also waiting for the new PageHeader title
    await expect(page.getByRole('heading', { name: 'Guard Profiles' })).toBeVisible();

    // Wait for at least one card
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guard-profiles-list.png', fullPage: true });

    // Click "New Profile" button
    // Using a flexible locator to find the button
    await page.getByRole('button', { name: /new.*profile/i }).click();

    // Wait for modal to be visible
    const modal = page.locator('dialog.modal[open], .modal.modal-open').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Create Guard Profile');

    // Take screenshot of the create modal
    await page.screenshot({ path: 'docs/screenshots/guard-profile-modal.png' });
  });
});
