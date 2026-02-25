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
      route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } })
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
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: '1',
                name: 'Standard Production',
                description: 'Default security profile for production bots.',
                guards: {
                  mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
                  rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
                  contentFilter: { enabled: false, strictness: 'low' },
                },
              },
              {
                id: '2',
                name: 'High Security',
                description: 'Strict access control and content filtering.',
                guards: {
                  mcpGuard: { enabled: true, type: 'custom', allowedUsers: ['admin', 'security-team'] },
                  rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                  contentFilter: { enabled: true, strictness: 'high' },
                },
              },
              {
                id: '3',
                name: 'Development',
                description: 'No restrictions for testing.',
                guards: {
                  mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
                  rateLimit: { enabled: false, maxRequests: 1000, windowMs: 60000 },
                  contentFilter: { enabled: false, strictness: 'low' },
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('capture Guard Profiles page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Guard Profiles page
    await page.goto('/admin/guards');

    // Wait for the page to load and profiles to be displayed
    await expect(page.getByRole('heading', { name: 'Guard Profiles' }).first()).toBeVisible();
    await expect(page.getByText('Standard Production')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guard-profiles-list.png', fullPage: true });

    // Click "Edit" on the first profile (Standard Production)
    // We target the card and look for a button that is likely the edit button.
    // In the old code: it's the second button (index 1).
    // In the new code: I should ensure it's clickable.
    const card = page.locator('.card', { hasText: 'Standard Production' }).first();

    // Fallback locator strategy: try to find an edit icon or button
    const editButton = card.locator('button').nth(1);
    await editButton.click();

    // Wait for modal
    // The new modal uses <dialog> and .modal-box
    const modal = page.locator('dialog.modal[open], .modal-box').filter({ hasText: 'Edit Guard Profile' }).first();
    await expect(modal).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/guard-profile-modal.png' });
  });
});
