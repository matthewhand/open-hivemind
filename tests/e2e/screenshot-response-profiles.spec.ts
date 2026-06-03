import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Response Profiles Screenshots', () => {
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
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );

    // Mock Response Profiles API
    await page.route('/api/config/response-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              key: 'default',
              name: 'Default Profile',
              description: 'Standard balanced response profile',
              enabled: true,
              isBuiltIn: true,
              swarmMode: 'exclusive',
              settings: {
                baseProbability: 0.5,
                directMentionBonus: 1.0,
                botMentionBonus: 0.8,
              },
            },
            {
              key: 'aggressive',
              name: 'Aggressive Interrupter',
              description: 'High response rate, ignores silence',
              enabled: true,
              isBuiltIn: false,
              swarmMode: 'broadcast',
              settings: {
                baseProbability: 0.9,
                directMentionBonus: 1.0,
                botMentionBonus: 1.0,
              },
            },
            {
              key: 'shy',
              name: 'Shy Observer',
              description: 'Only responds when directly asked',
              enabled: false,
              isBuiltIn: false,
              swarmMode: 'exclusive',
              settings: {
                baseProbability: 0.1,
                directMentionBonus: 1.0,
                botMentionBonus: 0.2,
              },
            },
          ],
        }),
      });
    });
  });

  test('capture Response Profiles page and modals', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Response Profiles page
    await page.goto('/admin/config/response-profiles');

    // Wait for the profiles to be displayed
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByText('Aggressive Interrupter')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/response-profiles-list.png', fullPage: true });

    // Click "Add Response Profile" button
    await page.getByRole('button', { name: 'Create Profile' }).click();

    // Wait for modal to be visible
    const addModal = page.locator('.modal-box').filter({ hasText: 'Create Response Profile' });
    await expect(addModal).toBeVisible();

    // Take screenshot of the add modal
    await page.screenshot({ path: 'docs/screenshots/response-profile-add-modal.png' });

    // Close modal
    await addModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(addModal).toBeHidden();

    // Edit a profile
    await page
      .locator('.card')
      .filter({ hasText: 'Aggressive Interrupter' })
      .locator('button')
      .nth(1)
      .click();

    // Wait for modal
    const editModal = page.locator('.modal-box').first();
    await expect(editModal).toBeVisible();

    // Take screenshot of edit modal
    await page.screenshot({ path: 'docs/screenshots/response-profile-edit-modal.png' });
  });
});
