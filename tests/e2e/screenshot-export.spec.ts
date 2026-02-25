import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Export Page Screenshots', () => {
  test('Capture Export Page and Create Backup Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Backups Data
    const mockBackups = [
      {
        id: 'backup_1715432000000',
        name: 'Weekly-System-Backup',
        description: 'Routine weekly backup before updates',
        createdAt: '2024-05-11T12:00:00.000Z',
        size: 15482910, // ~15MB
        checksum: 'abc123def456',
        createdBy: 'admin'
      },
      {
        id: 'backup_1714827200000',
        name: 'Pre-Migration-Snapshot',
        description: 'Backup taken before migrating to v2.0',
        createdAt: '2024-05-04T12:00:00.000Z',
        size: 14920100, // ~14MB
        checksum: 'def456ghi789',
        createdBy: 'system'
      }
    ];

    // Mock API responses
    await page.route('**/api/import-export/backups', async route => {
      await route.fulfill({ json: { success: true, data: mockBackups } });
    });

    await page.route('**/api/import-export/backup', async route => {
       if (route.request().method() === 'POST') {
           await route.fulfill({ json: { success: true, message: 'Backup created successfully', data: {} } });
       } else {
           await route.continue();
       }
    });

    // Mock Config Export
     await page.route('**/api/config/export', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ export: 'mock-data' })
      });
    });


    // Navigate to Export page
    // Note: The route might be /admin/export or /export depending on routing
    // Based on other pages, it seems like /admin/export is likely correct if it's an admin page
    // Let's check existing routes. 'SystemSettings' is at '/uber/settings' in the file I read earlier?
    // Wait, SystemSettings had `breadcrumbItems = [{ label: 'Settings', href: '/uber/settings', isActive: true }]`
    // But `BotsPage` is at `/admin/bots`.
    // Let's assume `/admin/export`. I'll verify routes later if needed.
    await navigateAndWaitReady(page, '/admin/export');

    // Wait for content to load
    await expect(page.locator('h1')).toContainText('Export & System Data');
    await expect(page.getByText('Weekly-System-Backup')).toBeVisible();

    // Screenshot Export Page
    await page.screenshot({ path: 'docs/images/export-page.png', fullPage: true });

    // Open Create Backup Modal
    await page.getByRole('button', { name: 'Create Backup' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').first();
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Create System Backup')).toBeVisible();

    // Fill in dummy data for better visual
    await modal.locator('input[type="text"]').fill('My-New-Backup');
    await modal.locator('textarea').fill('Snapshot before testing new features');

    // Wait for animation
    await page.waitForTimeout(500);

    // Screenshot Create Backup Modal
    await page.screenshot({ path: 'docs/images/create-backup-modal.png' });
  });
});
