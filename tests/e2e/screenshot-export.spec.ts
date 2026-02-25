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
        name: 'Weekly Backup',
        description: 'Routine system snapshot',
        size: 1024 * 1024 * 5.5, // 5.5 MB
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        createdBy: 'admin',
      },
      {
        id: 'backup-2',
        name: 'Pre-Deployment',
        description: 'Backup before update v1.2',
        size: 1024 * 1024 * 5.2, // 5.2 MB
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        createdBy: 'admin',
      },
    ];

    // Mock API responses
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockBackups }),
      });
    });

    // Mock Create Backup
    await page.route('**/api/import-export/backup', async route => {
       if (route.request().method() === 'POST') {
          await route.fulfill({
             status: 200,
             contentType: 'application/json',
             body: JSON.stringify({ success: true, message: 'Backup created', data: {} })
          });
       } else {
          await route.continue();
       }
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Export & System Data")');
    await page.waitForSelector('table'); // Wait for backups table

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Open Create Backup Modal
    await page.click('button:has-text("Create Backup")');

    // Wait for modal
    const modal = page.locator('.modal-open, .modal-box').first();
    await expect(modal).toBeVisible();

    // Fill in dummy data
    await page.fill('input[placeholder*="backup"]', 'Manual Backup');
    await page.fill('input[placeholder*="description"]', 'Snapshot for documentation');

    // Wait a bit for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
