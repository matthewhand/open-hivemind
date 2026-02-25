import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Guards Page Screenshots', () => {
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
    await page.route('/api/admin/mcp-servers', async (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
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
              name: 'Standard Production',
              description: 'Default security profile for production bots. Includes rate limiting and content filtering.',
              guards: {
                mcpGuard: { enabled: true, type: 'owner' },
                rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'medium' }
              }
            },
            {
              id: '2',
              name: 'Strict Security',
              description: 'High security profile for sensitive bots. Restricted access and strict content filtering.',
              guards: {
                mcpGuard: { enabled: true, type: 'custom', allowedUsers: ['admin-1', 'auditor'] },
                rateLimit: { enabled: true, maxRequests: 10, windowMs: 60000 },
                contentFilter: { enabled: true, strictness: 'high' }
              }
            },
            {
              id: '3',
              name: 'Development',
              description: 'Relaxed profile for development and testing.',
              guards: {
                mcpGuard: { enabled: false, type: 'owner' },
                rateLimit: { enabled: false, maxRequests: 1000, windowMs: 60000 },
                contentFilter: { enabled: false, strictness: 'low' }
              }
            }
          ]
        }),
      });
    });
  });

  test('capture guards page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Guards page
    await page.goto('/admin/guards');

    // Wait for content to load
    await expect(page.getByText('Guard Profiles')).toBeVisible();

    // Wait for cards
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/guards-page.png', fullPage: true });

    // Open "New Profile" modal
    await page.getByRole('button', { name: 'New Profile' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: /Create.*Profile/i });
    await expect(modal).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/guards-modal.png' });
  });
});
