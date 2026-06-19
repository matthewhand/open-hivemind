import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Factory Reset E2E', () => {
  test.setTimeout(180000); // 3 minutes

  test('Should perform a full factory reset through the UI', async ({ page }) => {
    // Set a large viewport to ensure all tabs are visible
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('🚀 Starting ultra-robust Factory Reset E2E');

    // 1. Setup Auth and Error collection
    await setupTestWithErrorDetection(page);

    // Mock the destructive reset endpoint so this test verifies the full UI flow
    // (phrase + password + confirm modal + success toast) WITHOUT actually wiping
    // the shared dev DB. apiService.resetSystem -> POST /api/admin/system/reset.
    await page.route('**/api/admin/system/reset', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'System has been successfully reset.' }),
      })
    );

    // 2. Navigate to System Management
    await page.goto('/admin/system-management', { waitUntil: 'networkidle' });

    // 3. Wait for hydration
    await page.waitForTimeout(10000);
    console.log('✅ Page loaded, current URL:', page.url());

    // 4. Click Maintenance Tab
    // Try multiple ways to find the tab
    console.log('Searching for Maintenance tab...');
    const maintenanceBtn = page
      .locator('button.tab, .tab')
      .filter({ hasText: /Maintenance/i })
      .first();
    await expect(maintenanceBtn).toBeVisible({ timeout: 30000 });
    await maintenanceBtn.click({ force: true });
    console.log('✅ Clicked Maintenance tab');

    // 5. Verify Maintenance content
    await expect(page.getByText(/System Maintenance/i)).toBeVisible({ timeout: 20000 });
    console.log('✅ Maintenance content visible');

    // 6. Type confirmation phrase
    const confirmInput = page.getByPlaceholder(/type the confirmation phrase/i);
    await confirmInput.fill('confirm-factory-reset');

    // 6b. Fill the admin password — the reset button stays disabled until BOTH the
    // confirmation phrase and a password are provided (MaintenanceTab.tsx:87).
    await page.getByPlaceholder(/enter your admin password/i).fill('test-admin-password');

    // 7. Click Reset
    const resetBtn = page.getByRole('button', { name: /perform factory reset/i });
    await resetBtn.click({ force: true });
    console.log('✅ Clicked Perform Factory Reset');

    // 8. Trigger the Nuke in Modal
    const nukeBtn = page.getByRole('button', { name: /yes, nuke everything/i });
    await nukeBtn.click({ force: true });
    console.log('✅ Clicked Yes, Nuke Everything');

    // 9. Verify success toast
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.alert-success')).toContainText(/successfully reset/i);

    console.log('✅ Factory reset E2E verified');
  });
});
