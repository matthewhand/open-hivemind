import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock API responses for backups
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup_1',
              name: 'pre-deployment-backup',
              description: 'Initial backup before update',
              createdAt: new Date().toISOString(),
              size: 1024 * 1024 * 5 // 5MB
            },
            {
              id: 'backup_2',
              name: 'weekly-backup',
              description: 'Automated weekly backup',
              createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
              size: 1024 * 1024 * 5.2
            }
          ]
        }
      });
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content to load properly
    await expect(page.locator('h1:has-text("Export & System Data")')).toBeVisible();
    await expect(page.locator('text=pre-deployment-backup')).toBeVisible();

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Click Create Backup
    await page.getByRole('button', { name: 'Create Backup' }).first().click();

    // Wait for modal
    const modal = page.locator('#create_backup_modal');
    await expect(modal).toBeVisible();

    // Fill in some data for visual clarity
    await modal.locator('input[type="text"]').fill('new-feature-backup');
    await modal.locator('textarea').fill('Backup before implementing new features');

    // Wait a bit for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    // Note: modal screenshots might need clip or ensuring only modal is captured if fullPage is false
    // But standard screenshot captures viewport which is fine for modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
