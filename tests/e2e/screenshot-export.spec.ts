import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Backups API
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'pre-deployment-backup',
              description: 'Backup before major update',
              createdAt: new Date().toISOString(),
              size: 5242880, // 5MB
              format: 'json'
            },
            {
              id: 'backup-2',
              name: 'weekly-snapshot',
              description: 'Automated weekly backup',
              createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
              size: 12582912, // 12MB
              format: 'json'
            }
          ]
        }
      });
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content
    await expect(page.getByRole('heading', { name: 'System Backups' })).toBeVisible();
    await expect(page.getByText('pre-deployment-backup')).toBeVisible();

    // Screenshot Main Page
    await page.screenshot({ path: 'docs/screenshots/export-page.png', fullPage: true });

    // Open Create Modal
    await page.getByRole('button', { name: 'Create Backup' }).click();
    await expect(page.getByText('Create System Backup')).toBeVisible();

    // Fill dummy data for better visual
    await page.getByPlaceholder('e.g. pre-deployment-backup').fill('my-new-backup');
    await page.locator('textarea').fill('This is a test backup description.');

    // Screenshot Modal
    await page.screenshot({ path: 'docs/screenshots/export-create-modal.png', fullPage: true });
  });
});
