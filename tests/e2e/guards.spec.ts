import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Guards Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock the initial fetch of profiles
    await page.route('/api/admin/guard-profiles', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'profile-1',
                name: 'Test Profile',
                description: 'A test profile description',
                guards: {
                  mcpGuard: { enabled: true, type: 'owner' },
                  rateLimit: { enabled: false },
                  contentFilter: { enabled: false }
                }
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock DELETE request specifically
    await page.route(/\/api\/admin\/guard-profiles\/profile-1/, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should show confirmation modal when deleting a profile', async ({ page }) => {
    await page.goto('/admin/guards');

    // Wait for profiles to load
    await expect(page.getByRole('heading', { name: 'Test Profile' })).toBeVisible();

    // Click delete button
    const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Test Profile' }) });
    const deleteBtn = card.locator('button.text-error');
    await deleteBtn.click();

    // Verify modal appears
    // DaisyUI modal uses <dialog> and .modal class
    const modal = page.locator('dialog.modal[open]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Delete Guard Profile');
    await expect(modal).toContainText('Are you sure you want to delete the profile "Test Profile"?');

    // Click Cancel
    const cancelBtn = modal.getByRole('button', { name: 'Cancel' });
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();

    // Click Delete again
    await deleteBtn.click();
    await expect(modal).toBeVisible();

    // Click Confirm (Delete)
    // The confirm button has text "Delete"
    const confirmBtn = modal.locator('.modal-action button', { hasText: 'Delete' });
    await confirmBtn.click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify success message (toast)
    await expect(page.getByText('Profile deleted successfully')).toBeVisible();
  });
});
