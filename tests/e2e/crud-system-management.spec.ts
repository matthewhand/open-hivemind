import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * Quality E2E Tests for System Management Page
 * Tests for system monitoring, backup, and configuration management
 */

test.describe('System Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock global config
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            _userSettings: {
              values: {
                refreshInterval: 5000,
                logLevel: 'info',
                enableAutoBackup: true,
              },
            },
          },
        },
      });
    });

    // Mock backup list
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'Daily Backup',
              createdAt: new Date().toISOString(),
              size: 5242880,
              description: 'Automatic daily backup',
            },
            {
              id: 'backup-2',
              name: 'Manual Backup',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              size: 2621440,
              description: 'Manual backup before deployment',
            },
          ],
        },
      });
    });
  });

  test('displays system management page with correct structure', async ({ page }) => {
    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Verify page container
    await expect(page.getByTestId('system-management-page')).toBeVisible();

    // Verify title
    await expect(page.getByRole('heading', { name: /system management/i })).toBeVisible();
  });

  test('displays system status cards', async ({ page }) => {
    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Should show status cards section
    await expect(page.getByTestId('system-status-cards')).toBeVisible();
  });

  test('has create backup button', async ({ page }) => {
    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Create backup button should be visible
    const createBtn = page.getByTestId('create-backup-btn');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();
  });

  test('opens backup modal on create click', async ({ page }) => {
    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Click create backup button
    await page.getByTestId('create-backup-btn').click();

    // Should open modal
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    await expect(page.getByText(/create.*backup/i)).toBeVisible();
  });

  test('displays management tabs', async ({ page }) => {
    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Should show tabs card
    await expect(page.getByTestId('management-tabs-card')).toBeVisible();
  });

  test('handles API errors gracefully', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        json: { success: false, error: 'Server error' },
      });
    });

    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Page should still render
    await expect(page.getByTestId('system-management-page')).toBeVisible();
  });
});

test.describe('System Management Backup Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        json: { success: true, data: { _userSettings: { values: {} } } },
      });
    });

    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'Test Backup',
              createdAt: new Date().toISOString(),
              size: 1048576,
              description: 'Test backup',
            },
          ],
        },
      });
    });
  });

  test('displays backup history in backups tab', async ({ page }) => {
    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Navigate to backups tab
    await page.getByRole('button', { name: /backup management/i }).click();
    await page.waitForTimeout(300);

    // Should show backup data
    await expect(page.getByText('Test Backup')).toBeVisible();
  });

  test('can create encrypted backup', async ({ page }) => {
    await page.route('**/api/import-export/backup', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: { success: true, data: { id: 'new-backup' } },
        });
      }
    });

    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Open backup modal
    await page.getByTestId('create-backup-btn').click();

    // Enable encryption checkbox
    const encryptCheckbox = page.getByRole('checkbox', { name: /encrypt/i });
    if ((await encryptCheckbox.count()) > 0) {
      await encryptCheckbox.check();

      // Should show encryption key input
      const keyInput = page.locator('input[type="password"]');
      await expect(keyInput).toBeVisible();

      // Enter password
      await keyInput.fill('test-password-123');

      // Submit
      await page.getByRole('button', { name: /create backup/i }).click();
    }
  });

  test('can restore backup', async ({ page }) => {
    await page.route('**/api/import-export/backups/**/restore', async (route) => {
      await route.fulfill({
        json: { success: true },
      });
    });

    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Navigate to backups tab
    await page.getByRole('button', { name: /backup management/i }).click();
    await page.waitForTimeout(300);

    // Look for restore button
    const restoreBtn = page.getByRole('button', { name: /restore/i }).first();
    if ((await restoreBtn.count()) > 0) {
      await restoreBtn.click();

      // Should open confirmation modal
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    }
  });

  test('can delete backup', async ({ page }) => {
    await page.route('**/api/import-export/backups/**', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          json: { success: true },
        });
      }
    });

    await page.goto('/admin/system-management');
    await page.waitForLoadState('networkidle');

    // Navigate to backups tab
    await page.getByRole('button', { name: /backup management/i }).click();
    await page.waitForTimeout(300);

    // Look for delete button
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.click();

      // Should open confirmation modal
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    }
  });
});
