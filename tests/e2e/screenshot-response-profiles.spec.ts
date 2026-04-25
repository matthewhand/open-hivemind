import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Response Profiles Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock API requests for Response Profiles
    await page.route('/api/admin/response-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: '1',
              name: 'Default Profile',
              description: 'Standard conversational responses',
              type: 'standard',
              swarmConfig: { mode: 'off' },
            },
            {
              id: '2',
              name: 'Swarm Analysis',
              description: 'Multi-agent analysis profile',
              type: 'swarm',
              swarmConfig: { mode: 'parallel', agents: ['agent1', 'agent2'] },
            }
          ],
        }),
      });
    });

    // Mock background polling endpoints to prevent unhandled routes
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );
  });

  test('capture response profiles page screenshot', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Response Profiles page
    await page.goto('/admin/config/response-profiles');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Response Profiles' })).toBeVisible();

    // Wait for cards
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/response-profiles-page.png', fullPage: true });

    // Open "Create Response Profile" modal
    await page.getByRole('button', { name: 'Create Profile' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: /Create.*Profile/i });
    await expect(modal).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/response-profiles-modal.png' });
  });
});
