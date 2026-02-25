import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Guards Page Screenshots', () => {
  test('Capture Enhanced Guards Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Guard Profiles API
    await page.route('**/api/admin/guard-profiles', async route => {
      await route.fulfill({
        json: {
          data: []
        }
      });
    });

    // Navigate to Guards page
    await navigateAndWaitReady(page, '/admin/guards');

    // Click "New Profile"
    await page.getByRole('button', { name: 'New Profile' }).first().click();
    await expect(page.getByText('Create Guard Profile')).toBeVisible();

    // Fill basic info
    await page.getByPlaceholder('e.g. Strict Production').fill('Enhanced Security');
    await page.getByPlaceholder('Describe what this profile enforces...').fill('A robust profile using new tag inputs.');

    // Configure Access Control
    const accessCollapse = page.locator('.collapse').filter({ hasText: 'Access Control' });

    // Ensure the section is expanded
    const visibilityCheckbox = accessCollapse.locator('input[type="checkbox"]').first();
    const isExpanded = await visibilityCheckbox.isChecked();
    if (!isExpanded) {
        await visibilityCheckbox.click({ force: true });
    }

    // Enable the feature toggle
    const featureToggle = accessCollapse.locator('input.toggle');
    const isEnabled = await featureToggle.isChecked();
    if (!isEnabled) {
        await featureToggle.click({ force: true });
    }

    // Change Type to Custom
    await expect(accessCollapse.locator('select')).toBeVisible();
    await accessCollapse.locator('select').selectOption('custom');

    // Add tags to Allowed Users
    const userTagInput = accessCollapse.getByPlaceholder('Add user ID...');
    await userTagInput.fill('admin-user-1');
    await userTagInput.press('Enter');
    await userTagInput.fill('audit-bot');
    await userTagInput.press('Enter');

    // Add tags to Allowed Tools
    const toolTagInput = accessCollapse.getByPlaceholder('Add tool name...');
    await toolTagInput.fill('calculator');
    await toolTagInput.press('Enter');

    // Configure Content Filter
    const contentCollapse = page.locator('.collapse').filter({ hasText: 'Content Filter' });

    // Ensure section is expanded (accordion)
    const contentVisibilityCheckbox = contentCollapse.locator('input[type="checkbox"]').first();
    if (!(await contentVisibilityCheckbox.isChecked())) {
        await contentVisibilityCheckbox.click({ force: true });
    }

    // Enable the feature toggle
    const contentToggle = contentCollapse.locator('input.toggle');
    if (!(await contentToggle.isChecked())) {
         await contentToggle.click({ force: true });
    }

    // Add blocked terms (wait for visibility)
    const termTagInput = contentCollapse.getByPlaceholder('Add term...');
    await expect(termTagInput).toBeVisible();
    await termTagInput.fill('password');
    await termTagInput.press('Enter');
    await termTagInput.fill('secret_key');
    await termTagInput.press('Enter');

    // Scroll to bottom to show content filter
    await page.evaluate(() => {
        const modal = document.querySelector('.modal-box');
        if (modal) modal.scrollTop = modal.scrollHeight;
    });

    // Wait for animation
    await page.waitForTimeout(500);

    // Screenshot Modal
    await page.screenshot({ path: 'docs/screenshots/guards-modal-enhanced.png', fullPage: true });
  });
});
