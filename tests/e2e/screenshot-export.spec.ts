import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('System Export Page Screenshots', () => {
  test('Capture Export Page and Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock API responses
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'weekly-backup',
              description: 'Routine weekly backup',
              size: 5242880, // 5MB
              createdAt: new Date().toISOString(),
              checksum: 'abc12345'
            },
            {
              id: 'backup-2',
              name: 'pre-deployment',
              description: 'Before upgrading to v2.0',
              size: 2621440, // 2.5MB
              createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
              checksum: 'def67890'
            }
          ]
        }
      });
    });

    // Mock Config API to prevent 404s
    await page.route('**/api/config', async route => {
      await route.fulfill({ json: { bots: [], legacyMode: false, environment: 'test', warnings: [] } });
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content
    await expect(page.locator('h1')).toContainText('Export & System Data');
    await expect(page.locator('table')).toBeVisible();

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Open Create Backup Modal
    await page.getByRole('button', { name: 'Create Backup' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Create System Backup' });
    await expect(modal).toBeVisible();

    // Fill inputs
    await modal.locator('input').first().fill('manual-backup-001');
    await modal.locator('input').last().fill('Manual backup before testing');

    // Wait for animation
    await page.waitForTimeout(500);

    // Screenshot Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
