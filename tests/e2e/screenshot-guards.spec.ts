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
    await page.route('/api/admin/mcp-servers', async (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
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
              description: 'Default security profile for production bots.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
                contentFilter: { enabled: false, strictness: 'low' }
              }
            },
            {
              id: '2',
              name: 'Strict Security',
              description: 'Maximum security settings with content filtering enabled.',
              guards: {
                mcpGuard: { enabled: true, type: 'custom', allowedUsers: ['user1', 'user2'] },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'high' }
              }
            },
            {
              id: '3',
              name: 'Development',
              description: 'Relaxed settings for development and testing.',
              guards: {
                mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
                rateLimit: { enabled: false, maxRequests: 1000, windowMs: 60000 },
                contentFilter: { enabled: false, strictness: 'low' }
              }
            }
          ]
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
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByText('Standard Production')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guards-list.png', fullPage: true });

    // Click "New Profile" button to open modal
    // Assuming "New Profile" button exists and opens modal
    await page.getByRole('button', { name: 'New Profile' }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box').filter({ hasText: 'Create Guard Profile' });
    await expect(modal).toBeVisible();

    // Take screenshot of the create modal
    await page.screenshot({ path: 'docs/screenshots/guards-create-modal.png' });

    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toBeHidden();

    // Open edit modal for the first item
    // Use index-based selection as a fallback since icon class matching is proving flaky in test environment
    // 0: Copy, 1: Edit, 2: Delete
    const editButton = page.locator('.card').first().locator('button').nth(1);
    await editButton.click();

    const editModal = page.locator('.modal-box').filter({ hasText: 'Edit Guard Profile' });
    await expect(editModal).toBeVisible();

    // Take screenshot of edit modal
    await page.screenshot({ path: 'docs/screenshots/guards-edit-modal.png' });
  });
});
