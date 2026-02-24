import { expect, test } from '@playwright/test';
import { assertNoErrors, setupTestWithErrorDetection, SELECTORS } from './test-utils';

test.describe('Guards Page', () => {
  test.setTimeout(60000);

  test('should show confirmation modal when deleting a profile', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock initial profiles fetch
    await page.route('/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'test-1',
                name: 'Test Profile',
                description: 'A test profile',
                guards: {
                  mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
                  rateLimit: { enabled: false },
                  contentFilter: { enabled: false },
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock DELETE request
    let deleteCalled = false;
    await page.route('/api/admin/guard-profiles/test-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Deleted' }),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to Guards page
    await page.goto('/admin/guards');
    // Wait for the heading to appear, which means the page content is loaded (or at least the shell)
    await page.waitForLoadState('domcontentloaded');

    // Verify profile is visible (heading)
    const profileHeading = page.getByRole('heading', { name: 'Test Profile' });
    await expect(profileHeading).toBeVisible();

    // Click Delete button
    // Find the card containing the heading, then find the delete button
    const deleteBtn = page.locator('.card')
      .filter({ has: profileHeading })
      .locator('button.text-error');

    await deleteBtn.click();

    // Verify Confirm Modal
    // ConfirmModal renders a <dialog> with class 'modal'
    const modal = page.locator('dialog.modal[open]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Delete Profile');
    await expect(modal).toContainText('Are you sure you want to delete profile "Test Profile"?');

    // Click Cancel
    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).toBeHidden();
    expect(deleteCalled).toBe(false);

    // Click Delete again
    await deleteBtn.click();
    await expect(modal).toBeVisible();

    // Click Confirm (Delete)
    // The confirm button has "Delete" text and error variant
    await modal.locator('button:has-text("Delete")').click();

    // Verify Delete called and modal closes
    await expect(modal).toBeHidden();

    // Check that delete endpoint was hit
    expect(deleteCalled).toBe(true);

    // Verify success message
    await expect(page.locator('.alert-success')).toContainText('Profile deleted successfully');

    await assertNoErrors(errors, 'Guards page delete profile');
  });
});
