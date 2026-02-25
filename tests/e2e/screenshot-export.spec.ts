import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock API responses
    await page.route('**/api/import-export/backups', async route => {
        if (route.request().method() === 'GET') {
             await route.fulfill({
                 status: 200,
                 contentType: 'application/json',
                 body: JSON.stringify({
                     success: true,
                     data: [
                         {
                             id: 'backup-2023-10-27-001',
                             name: 'Pre-Deployment Backup',
                             description: 'Stable configuration before v2 update',
                             createdAt: new Date('2023-10-27T10:00:00Z').toISOString(),
                             size: 1024 * 1024 * 2.5, // 2.5 MB
                             fileName: 'backup-pre-deployment.json.gz',
                             checksum: 'sha256:abcdef123456'
                         },
                         {
                             id: 'backup-2023-10-26-001',
                             name: 'Weekly Auto Backup',
                             description: 'Automated weekly backup',
                             createdAt: new Date('2023-10-26T00:00:00Z').toISOString(),
                             size: 1024 * 1024 * 2.4, // 2.4 MB
                             fileName: 'backup-weekly-auto.json.gz',
                             checksum: 'sha256:123456abcdef'
                         }
                     ]
                 })
             });
        } else {
             await route.continue();
        }
    });

    await page.route('**/api/import-export/backup', async route => {
        if (route.request().method() === 'POST') {
             await route.fulfill({
                 status: 200,
                 contentType: 'application/json',
                 body: JSON.stringify({ success: true, message: 'Backup created successfully' })
             });
        } else {
             await route.continue();
        }
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content
    await page.waitForSelector('h1:has-text("Export & System Data")');
    await page.waitForSelector('table'); // Wait for backups table

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/screenshots/export-page.png', fullPage: true });

    // Open Create Backup Modal
    await page.getByRole('button', { name: 'Create Backup' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Create System Backup' });
    await expect(modal).toBeVisible();

    // Fill in some data for visual
    await modal.getByPlaceholder('e.g. pre-deployment-backup').fill('Feature-Test-Backup');
    await modal.getByPlaceholder('Brief description of this backup state...').fill('Backup before testing new features');

    // Wait for animation
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    await page.screenshot({ path: 'docs/screenshots/create-backup-modal.png' });
  });
});
