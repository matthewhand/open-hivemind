import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Backups Data
    const mockBackups = [
      {
        id: 'backup-1',
        name: 'pre-deployment-backup',
        description: 'Backup before major update',
        size: 1024 * 1024 * 5, // 5MB
        createdAt: new Date().toISOString(),
      },
      {
        id: 'backup-2',
        name: 'weekly-snapshot',
        description: 'Automated weekly backup',
        size: 1024 * 1024 * 2.5, // 2.5MB
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      }
    ];

    // Mock API responses
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({ json: { success: true, data: mockBackups } });
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content to load
    await page.waitForSelector('h2:has-text("System Backups")');
    await page.waitForSelector('table'); // Wait for table to render

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Click Create Backup Button
    const createButton = page.locator('button:has-text("Create Backup")');
    await createButton.click();

    // Wait for modal
    const modal = page.locator('.modal-box').first();
    await expect(modal).toBeVisible();

    // Fill in dummy data
    await modal.locator('input[placeholder*="backup"]').fill('manual-snapshot-001');
    await modal.locator('textarea').fill('Manual backup for documentation screenshot');

    // Wait for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
