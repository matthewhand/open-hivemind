import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Guards Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API responses
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    // Mock health check
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    // Mock config endpoints
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
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
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
              id: 'strict-prod',
              name: 'Strict Production',
              description: 'Enforces high security standards.',
              guards: {
                mcpGuard: {
                  enabled: true,
                  type: 'custom',
                  allowedUsers: ['admin-user'],
                  allowedTools: ['calculator', 'weather'],
                },
                rateLimit: { enabled: true, maxRequests: 10, windowMs: 60000 },
                contentFilter: {
                  enabled: true,
                  strictness: 'high',
                  blockedTerms: ['secret_key', 'password'],
                },
              },
            },
          ],
        }),
      });
    });
  });

  test('capture Guards page and modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await page.goto('/admin/guards');

    // Wait for the profile card
    const card = page.locator('.card').filter({ hasText: 'Strict Production' });
    await expect(card).toBeVisible();

    // Click Edit button
    await card.getByRole('button').nth(1).click(); // 0 is duplicate, 1 is edit, 2 is delete

    // Wait for modal - Target specifically the one with "Edit Guard Profile" text
    const modal = page.locator('.modal-box').filter({ hasText: 'Edit Guard Profile' });
    await expect(modal).toBeVisible();

    // Check for new fields
    // Access Control should be expanded by default (defaultChecked)
    await expect(modal.getByLabel('Allowed Tools (comma separated)')).toBeVisible();

    // Expand Content Filter
    // Find the collapse containing "Content Filter"
    const contentFilterSection = modal.locator('.collapse').filter({ hasText: 'Content Filter' });

    // Check if "Blocked Terms" is visible first, maybe it's already expanded?
    if (!await modal.getByLabel('Blocked Terms (comma separated)').isVisible()) {
        // Click the first checkbox to toggle expand
        // The first input[type=checkbox] in a DaisyUI collapse controls the open state
        await contentFilterSection.locator('input[type="checkbox"]').first().click({ force: true });
    }

    // Wait for Blocked Terms
    await expect(modal.getByLabel('Blocked Terms (comma separated)')).toBeVisible();

    // Take screenshot of the enhanced modal
    await page.screenshot({ path: 'docs/screenshots/guards-modal-enhanced.png' });
  });
});
