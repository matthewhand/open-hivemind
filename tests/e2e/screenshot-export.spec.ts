import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Backups List
    const mockBackups = [
      {
        id: 'backup_20231027',
        name: 'weekly-backup',
        description: 'Routine weekly backup',
        createdAt: '2023-10-27T10:00:00.000Z',
        size: 15728640, // 15MB
      },
      {
        id: 'backup_20231020',
        name: 'pre-upgrade',
        description: 'Backup before v2.0 upgrade',
        createdAt: '2023-10-20T09:30:00.000Z',
        size: 14680064, // 14MB
      },
    ];

    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({ json: { success: true, data: mockBackups } });
    });

    // Mock Create Backup (POST)
    await page.route('**/api/import-export/backup', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ json: { success: true, message: 'Backup created successfully' } });
      } else {
        await route.continue();
      }
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content to load properly
    await expect(page.locator('h1:has-text("Export & System Data")')).toBeVisible();
    await expect(page.getByText('weekly-backup')).toBeVisible();

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Open Create Backup Modal
    const createButton = page.locator('button:has-text("Create Backup")').first();
    await createButton.click();

    // Wait for modal
    const modal = page.locator('.modal-box, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Fill in dummy data for better visual
    await modal.locator('input[placeholder*="e.g."]').fill('manual-backup-001');
    await modal
      .locator('input[placeholder*="description"]')
      .fill('Manual backup before configuration changes');

    // Wait a bit for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
