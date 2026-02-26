import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  SELECTORS,
  setupTestWithErrorDetection,
} from './test-utils';

test.describe('Guards Page', () => {
  const mockProfiles = [
    {
      id: 'profile-1',
      name: 'Production Profile',
      description: 'Strict security settings for production',
      guards: {
        mcpGuard: { enabled: true, type: 'owner' },
        rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
        contentFilter: { enabled: true, strictness: 'high' },
      },
    },
    {
      id: 'profile-2',
      name: 'Development Profile',
      description: 'Lenient settings for development',
      guards: {
        mcpGuard: { enabled: false, type: 'owner' },
        rateLimit: { enabled: false },
        contentFilter: { enabled: false },
      },
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Mock all other API calls to prevent timeouts from unhandled requests
    // Registered first to have lowest priority (Playwright uses LIFO for route matching)
    await page.route('/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    // Mock the API response for profiles
    await page.route('/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockProfiles }),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock delete API
    await page.route('/api/admin/guard-profiles/profile-2', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.fallback();
      }
    });
  });

  test('should display list of guard profiles', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/guards');

    await expect(page.getByText('Production Profile')).toBeVisible();
    await expect(page.getByText('Development Profile')).toBeVisible();

    await assertNoErrors(errors, 'Display profiles');
  });

  test('should show confirmation modal when deleting a profile', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/guards');

    // Find the delete button for the second profile (Development Profile)
    const card = page.locator('.card').filter({ hasText: 'Development Profile' });
    const deleteBtn = card.locator('button.text-error');

    await deleteBtn.click();

    // Verify modal appears
    const modal = page.locator('dialog.modal[open]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Delete Guard Profile');
    await expect(modal).toContainText(
      'Are you sure you want to delete the profile "Development Profile"?'
    );

    // Click Cancel
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();

    await assertNoErrors(errors, 'Cancel delete');
  });

  test('should show confirmation modal visual check', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/guards');

    const card = page.locator('.card').filter({ hasText: 'Development Profile' });
    const deleteBtn = card.locator('button.text-error');

    await deleteBtn.click();

    const modal = page.locator('dialog.modal[open]');
    await expect(modal).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'test-results/guards-delete-modal.png' });

    // Close modal to cleanup
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await assertNoErrors(errors, 'Modal screenshot');
  });

  test('should delete profile when confirmed', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/guards');

    const card = page.locator('.card').filter({ hasText: 'Development Profile' });
    const deleteBtn = card.locator('button.text-error');

    await deleteBtn.click();

    const modal = page.locator('dialog.modal[open]');
    await expect(modal).toBeVisible();

    // Mock the re-fetch after delete to return only one profile
    // Note: We need to override the previous mock.
    // Adding a route inside the test overrides previous routes (LIFO).
    await page.route('/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [mockProfiles[0]] }),
        });
      } else {
        await route.fallback();
      }
    });

    // Click Delete
    await modal.getByRole('button', { name: 'Delete Profile' }).click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify success message
    await expect(page.getByText('Profile deleted successfully')).toBeVisible();

    // Verify profile is removed from list
    await expect(page.getByText('Development Profile')).not.toBeVisible();

    await assertNoErrors(errors, 'Confirm delete');
  });
});
