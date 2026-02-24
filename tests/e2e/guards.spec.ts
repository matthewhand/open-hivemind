import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

const mockProfiles = [
  {
    id: 'profile-1',
    name: 'Test Profile',
    description: 'A test profile',
    guards: {
      mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
      rateLimit: { enabled: false },
      contentFilter: { enabled: false },
    },
  },
];

test.describe('Guards Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock GET profiles
    await page.route('/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { data: mockProfiles } });
      } else {
        await route.continue();
      }
    });

    // Mock DELETE profile
    await page.route(/\/api\/admin\/guard-profiles\/.+/, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, json: { success: true } });
      } else {
        await route.continue();
      }
    });
  });

  test('should show confirmation modal when deleting a profile', async ({ page }) => {
    await page.goto('/admin/guards');

    // Check if profile is visible
    await expect(page.getByRole('heading', { name: 'Test Profile' })).toBeVisible();

    // Click delete button (it's the trash icon button)
    await page.locator('.card button.text-error').first().click();

    // Verify modal appears
    // DaisyUI modal uses <dialog> and .modal-open class or .showModal()
    // The ConfirmModal component uses <dialog> with .modal class and ref based showModal()
    // When open, it should be visible.
    await expect(page.locator('dialog.modal')).toBeVisible();
    await expect(page.getByText('Delete Profile', { exact: true })).toBeVisible();
    await expect(page.getByText('Are you sure you want to delete the profile "Test Profile"?')).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Verify modal closed
    await expect(page.locator('dialog.modal[open]')).not.toBeVisible();

    // Click Delete again
    await page.locator('.card button.text-error').first().click();

    // Verify modal appears again
    await expect(page.locator('dialog.modal')).toBeVisible();

    // Mock the subsequent fetch after delete to return empty list
    await page.route('/api/admin/guard-profiles', async (route) => {
       await route.fulfill({ json: { data: [] } });
    });

    // Click Delete in modal
    await page.getByRole('button', { name: 'Delete' }).click();

    // Verify profile is gone (because we mocked empty list on refetch)
    await expect(page.getByText('Test Profile')).not.toBeVisible();

    // Verify success message
    await expect(page.getByText('Profile deleted successfully')).toBeVisible();
  });
});
