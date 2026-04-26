import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Response Profiles Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints to prevent errors/warnings
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
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
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Response Profiles list
    await page.route('**/api/config/response-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: [
            {
              key: 'default-profile',
              name: 'Default Profile',
              description: 'Standard exclusive response behavior.',
              swarmMode: 'exclusive',
              isBuiltIn: true,
              settings: {
                CHANCE_ADDRESSED: 1.0,
                CHANCE_UNADDRESSED: 0.1,
              },
            },
            {
              key: 'collaborative-helper',
              name: 'Collaborative Helper',
              description: 'Multiple bots contribute to the answer.',
              swarmMode: 'collaborative',
              isBuiltIn: false,
              settings: {
                CHANCE_ADDRESSED: 1.0,
                CHANCE_UNADDRESSED: 0.5,
              },
            },
          ],
        }),
      });
    });
  });

  test('capture Response Profiles page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Response Profiles page
    await page.goto('/admin/config/response-profiles');

    // Wait for the page to load and profiles to be displayed
    await expect(page.getByRole('heading', { name: 'Response Profiles' })).toBeVisible();
    await expect(page.getByText('Default Profile')).toBeVisible();
    await expect(page.getByText('Collaborative Helper')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/response-profiles-page.png', fullPage: true });

    // Click "Create Profile" button
    await page.getByRole('button', { name: 'Create Profile' }).click();

    // Wait for modal to be visible
    const addModal = page.locator('.modal-box').filter({ hasText: 'Create Response Profile' });
    await expect(addModal).toBeVisible();
    await expect(addModal.getByText('Swarm Orchestration')).toBeVisible();

    // Take screenshot of the add modal
    await page.screenshot({ path: 'docs/screenshots/response-profiles-create-modal.png' });
  });
});
