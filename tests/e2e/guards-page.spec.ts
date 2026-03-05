import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Guards Page', () => {
  test.setTimeout(60000);

  const mockProfiles = [
    {
      id: 'profile-1',
      name: 'Production Guard',
      description: 'Strict production settings',
      guards: {
        mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
        rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
        contentFilter: { enabled: true, strictness: 'high' },
      },
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Setup error detection and auth
    await setupTestWithErrorDetection(page);

    // Mock GET profiles
    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockProfiles }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('displays profiles correctly', async ({ page }) => {
    await navigateAndWaitReady(page, '/admin/guards');

    await expect(page.getByText('Production Guard')).toBeVisible();
    await expect(page.getByText('Strict production settings')).toBeVisible();
    // Use exact: true to avoid matching the description text
    await expect(page.getByText('Access Control', { exact: true })).toBeVisible();
    await expect(page.getByText('Rate Limit')).toBeVisible();
    await expect(page.getByText('Content Filter')).toBeVisible();

    await assertNoErrors([], 'Profile display');
  });

  test('can duplicate a profile', async ({ page }) => {
    // Mock POST for creating the duplicate
    let createdProfile: any = null;
    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'POST') {
        const data = JSON.parse(route.request().postData() || '{}');
        createdProfile = data;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { ...data, id: 'new-profile-id' },
            message: 'Profile created successfully',
          }),
        });
      } else if (route.request().method() === 'GET') {
        // Return the original + the new one if created
        const profiles = createdProfile
          ? [...mockProfiles, { ...createdProfile, id: 'new-profile-id' }]
          : mockProfiles;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: profiles }),
        });
      } else {
        await route.continue();
      }
    });

    await navigateAndWaitReady(page, '/admin/guards');

    // Find the duplicate button (it won't exist yet, so this part verifies the button presence later)
    // We target the button within the card that has 'Production Guard'
    const card = page.locator('.card', { hasText: 'Production Guard' });

    // We expect a duplicate button. Since we haven't implemented it, we look for a button that might have the copy icon or text.
    // For now, let's assume we'll add a title or aria-label "Duplicate Profile"
    const duplicateBtn = card.locator('button[title="Duplicate Profile"]');

    // This assertion will fail until implemented
    await expect(duplicateBtn).toBeVisible();
    await duplicateBtn.click();

    // Check if modal opens with copied data
    const modal = page.locator('.modal-open');
    await expect(modal).toBeVisible();

    // Check name input
    const nameInput = modal.locator('input[placeholder="e.g. Strict Production"]');
    await expect(nameInput).toHaveValue('Copy of Production Guard');

    // Save
    await modal.getByText('Save Profile').click();

    // Verify POST was called with correct data
    expect(createdProfile).toBeTruthy();
    expect(createdProfile.name).toBe('Copy of Production Guard');
    expect(createdProfile.guards.rateLimit.maxRequests).toBe(100);

    // Verify success toast
    await expect(page.locator('.alert-success')).toContainText('Profile created successfully');

    await assertNoErrors([], 'Duplicate profile');
  });
});
