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
              name: 'Strict Production',
              description: 'Enforces strict content filtering and rate limiting for public bots.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'high' },
              },
            },
            {
              id: '2',
              name: 'Internal Development',
              description: 'Relaxed settings for internal team testing.',
              guards: {
                mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: true, maxRequests: 1000, windowMs: 60000 },
                contentFilter: { enabled: false, strictness: 'low' },
              },
            },
          ],
        }),
      });
    });
  });

  test('capture guard profiles page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Guard Profiles page
    await page.goto('/admin/guards');

    // Wait for the page to load and profiles to be displayed
    // We expect "Guard Profiles" header (from PageHeader soon) and cards
    await expect(page.locator('h1').filter({ hasText: 'Guard Profiles' })).toBeVisible();
    await expect(page.getByText('Strict Production')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guards-list.png', fullPage: true });

    // Click "New Profile" button (either existing button or PageHeader action)
    // Wait for button to be clickable
    const newProfileButton = page.locator('button').filter({ hasText: 'New Profile' }).first();
    await newProfileButton.click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box').filter({ hasText: 'Create Guard Profile' });
    await expect(modal).toBeVisible();

    // Take screenshot of the create modal
    await page.screenshot({ path: 'docs/screenshots/guards-create-modal.png' });
  });
});
