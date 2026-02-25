import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock Backups Response
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'Weekly Backup',
              description: 'Routine automated backup',
              createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              size: 1024 * 1024 * 5.5, // 5.5 MB
              format: 'json',
              checksum: 'abc12345'
            },
            {
              id: 'backup-2',
              name: 'Pre-Update Snapshot',
              description: 'Backup before upgrading to v2.0',
              createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
              size: 1024 * 1024 * 4.2, // 4.2 MB
              format: 'json',
              checksum: 'def67890'
            }
          ]
        }
      });
    });

    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content
    await expect(page.getByRole('heading', { name: 'System Backups' })).toBeVisible();
    await expect(page.getByText('Weekly Backup')).toBeVisible();

    // Screenshot Main Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Open Create Modal
    await page.getByRole('button', { name: 'Create Backup' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').first();
    await expect(modal).toBeVisible();

    // Fill dummy data
    await modal.locator('input[placeholder*="e.g."]').fill('Manual Backup');
    await modal.locator('input[placeholder*="Brief description"]').fill('Backup before major changes');

    // Screenshot Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
