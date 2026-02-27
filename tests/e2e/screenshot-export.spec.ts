import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Data
    const mockBackups = [
      {
        id: 'backup-123',
        name: 'Weekly Backup',
        description: 'Scheduled weekly backup',
        size: 1024 * 1024 * 5, // 5MB
        createdAt: new Date('2023-10-25T10:00:00Z').toISOString(),
        createdBy: 'admin',
      },
      {
        id: 'backup-456',
        name: 'Pre-Deployment',
        description: 'Before upgrading to v2.0',
        size: 1024 * 1024 * 2.5, // 2.5MB
        createdAt: new Date('2023-10-24T15:30:00Z').toISOString(),
        createdBy: 'admin',
      },
      {
        id: 'backup-789',
        name: 'Post-Migration',
        description: 'Safe checkpoint after DB migration',
        size: 1024 * 1024 * 1.2, // 1.2MB
        createdAt: new Date('2023-10-26T09:15:00Z').toISOString(),
        createdBy: 'admin',
      },
    ];

    // Mock API responses
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({ json: { success: true, data: mockBackups } });
    });

    await page.route('**/api/import-export/backup', async (route) => {
      // Mock success for creation
      await route.fulfill({ json: { success: true, message: 'Backup created successfully' } });
    });

    await page.route('**/api/config/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ export: 'mock-data' }),
      });
    });

    // Navigate to Export page
    await page.goto('/admin/export');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to load properly
    await expect(page.locator('h1:has-text("Export & System Data")')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Weekly Backup', exact: true })).toBeVisible();

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Open Create Backup Modal
    const createButton = page.locator('button:has-text("Create Backup")').first();
    await createButton.click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Create System Backup' }).first();
    await expect(modal).toBeVisible();

    // Fill in dummy data for better visual
    await modal.getByLabel('Backup Name').fill('My New Backup');
    await modal.getByLabel('Description (Optional)').fill('Manual backup before changes');

    // Wait a bit for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
