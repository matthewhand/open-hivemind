import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Backups Data
    const mockBackups = [
      {
        id: 'backup-123',
        name: 'weekly-backup',
        description: 'Automated weekly backup',
        createdAt: new Date().toISOString(),
        size: 1024 * 50, // 50KB
      },
      {
        id: 'backup-456',
        name: 'pre-update',
        description: 'Before upgrading bots',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        size: 1024 * 48,
      }
    ];

    // Mock API responses
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({ json: { success: true, data: mockBackups } });
    });

    await page.route('**/api/import-export/backup', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ json: { success: true, message: 'Backup created successfully' } });
      } else {
        await route.continue();
      }
    });

    // Navigate to Export page
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Export & System Data' })).toBeVisible();
    await expect(page.getByText('weekly-backup')).toBeVisible();

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Open Create Backup Modal
    await page.getByRole('button', { name: 'Create Backup' }).first().click();

    // Wait for modal
    const modal = page.locator('.modal-box', { hasText: 'Create System Backup' });
    await expect(modal).toBeVisible();

    // Fill in some dummy data for the screenshot
    await modal.getByPlaceholder('e.g. pre-upgrade-backup').fill('snapshot-v2');
    await modal.getByPlaceholder('e.g. Backup taken before updating bots').fill('Manual snapshot before testing');

    // Wait for animation
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
