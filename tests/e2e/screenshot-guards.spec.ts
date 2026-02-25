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
              id: 'gp-1',
              name: 'Standard Production',
              description: 'Balanced security for production bots with rate limits and content filtering.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner' },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'medium' },
              },
            },
            {
              id: 'gp-2',
              name: 'Strict Security',
              description: 'High security profile with aggressive filtering and strict access controls.',
              guards: {
                mcpGuard: { enabled: true, type: 'custom', allowedUsers: ['admin-1'] },
                rateLimit: { enabled: true, maxRequests: 10, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'high' },
              },
            },
            {
              id: 'gp-3',
              name: 'Development',
              description: 'Lenient profile for testing and development environments.',
              guards: {
                mcpGuard: { enabled: false, type: 'owner' },
                rateLimit: { enabled: false },
                contentFilter: { enabled: false },
              },
            },
          ],
        }),
      });
    });
  });

  test('capture guard profiles screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Guard Profiles page
    await page.goto('/admin/guards');

    // Wait for the page to load and profiles to be displayed
    // Using a more robust selector that will work before and after refactor
    // The refactor will likely keep 'Guard Profiles' as the title or heading
    await expect(page.getByRole('heading', { name: 'Guard Profiles' })).toBeVisible();

    // Wait for cards to be visible (current implementation) or list items (future)
    // We can just wait for text from the mock data
    await expect(page.getByText('Standard Production')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guard-profiles-list.png', fullPage: true });

    // Click "New Profile" button to open the modal
    // Current implementation has a button with "New Profile" text
    await page.getByRole('button', { name: 'New Profile' }).click();

    // Wait for modal to be visible
    // Current implementation: .modal-box
    // Future implementation: dialog[open] .modal-box
    const modal = page.locator('.modal-box, dialog[open] .modal-box').first();
    await expect(modal).toBeVisible();

    // Wait for modal title
    await expect(modal.getByText('Create Guard Profile')).toBeVisible();

    // Take screenshot of the create modal
    await page.screenshot({ path: 'docs/screenshots/guard-profile-modal.png' });
  });
});
