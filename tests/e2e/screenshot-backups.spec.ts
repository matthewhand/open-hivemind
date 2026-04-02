import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Backups Management Page Screenshots', () => {
  test('Capture Backups Management Page and workflows', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Data
    const mockBackups = [
      {
        id: 'backup-123',
        name: 'Weekly-Backup',
        description: 'Scheduled weekly backup with all configurations',
        createdAt: new Date('2024-03-25T10:00:00Z').toISOString(),
        createdBy: 'admin',
        configCount: 12,
        versionCount: 45,
        templateCount: 8,
        size: 5242880, // 5MB
        checksum: 'abc123def456',
        encrypted: false,
        compressed: true,
      },
      {
        id: 'backup-456',
        name: 'Pre-Deployment',
        description: 'Before upgrading to v2.0 - critical checkpoint',
        createdAt: new Date('2024-03-24T15:30:00Z').toISOString(),
        createdBy: 'admin',
        configCount: 15,
        versionCount: 52,
        templateCount: 10,
        size: 2621440, // 2.5MB
        checksum: 'def456ghi789',
        encrypted: true,
        compressed: true,
      },
      {
        id: 'backup-789',
        name: 'Post-Migration',
        description: 'Safe checkpoint after database migration',
        createdAt: new Date('2024-03-26T09:15:00Z').toISOString(),
        createdBy: 'admin',
        configCount: 10,
        versionCount: 38,
        templateCount: 6,
        size: 1258291, // 1.2MB
        checksum: 'ghi789jkl012',
        encrypted: false,
        compressed: true,
      },
      {
        id: 'backup-101',
        name: 'Emergency-Backup',
        description: 'Emergency backup before critical fix',
        createdAt: new Date('2024-03-20T18:45:00Z').toISOString(),
        createdBy: 'admin',
        configCount: 8,
        versionCount: 30,
        templateCount: 5,
        size: 943718, // ~920KB
        checksum: 'jkl012mno345',
        encrypted: true,
        compressed: true,
      },
    ];

    // Mock API responses
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({ json: { success: true, data: mockBackups } });
    });

    await page.route('**/api/import-export/backup', async (route) => {
      // Mock success for creation
      await route.fulfill({
        json: {
          success: true,
          message: 'Backup created successfully',
          data: {
            filePath: '/config/backups/backup-new-backup-1234567890.json.gz',
            size: 3145728,
            checksum: 'new123abc456',
          },
        },
      });
    });

    await page.route('**/api/import-export/backups/*/restore', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: 'Backup restored successfully',
          data: { importedCount: 12, skippedCount: 0, errorCount: 0 },
        },
      });
    });

    await page.route('**/api/import-export/backups/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          json: { success: true, message: 'Backup deleted successfully' },
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to Backups page
    await page.goto('/admin/backups');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to load properly
    await expect(page.locator('h1:has-text("Backup Management")')).toBeVisible();
    await expect(page.getByText('Weekly-Backup')).toBeVisible();

    // Wait for stats cards to be visible
    await expect(page.getByText('Total Backups')).toBeVisible();
    await expect(page.getByText('Total Size')).toBeVisible();
    await expect(page.getByText('Encrypted Backups')).toBeVisible();

    // Screenshot 1: Main Backups Management Page
    await page.screenshot({
      path: 'docs/screenshots/backups-management.png',
      fullPage: true,
    });

    // Test Create Backup Flow
    const createButton = page.getByRole('button', { name: /Create Backup/i }).first();
    await createButton.click();

    // Wait for create modal to appear
    const createModal = page
      .locator('.modal-box')
      .filter({ hasText: 'Create System Backup' })
      .first();
    await expect(createModal).toBeVisible();

    // Fill in backup details
    await createModal.getByLabel('Backup Name').fill('Production-Snapshot');
    await createModal
      .getByLabel('Description (Optional)')
      .fill('Complete production environment snapshot before release');

    // Enable encryption
    await createModal.getByLabel('Encrypt backup').click();
    await expect(createModal.getByLabel('Encryption Key')).toBeVisible();
    await createModal.getByLabel('Encryption Key').fill('SecureKey12345');

    // Wait for UI to settle
    await page.waitForTimeout(500);

    // Screenshot 2: Create Backup Modal with Encryption
    await page.screenshot({ path: 'docs/screenshots/backups-create-modal.png' });

    // Close create modal
    await createModal.getByRole('button', { name: /Cancel/i }).click();
    await expect(createModal).not.toBeVisible();

    // Test Restore Backup Flow
    const restoreButtons = page.getByRole('button', { name: /Restore/i });
    const firstRestoreButton = restoreButtons.first();
    await firstRestoreButton.click();

    // Wait for restore modal
    const restoreModal = page
      .locator('.modal-box')
      .filter({ hasText: 'Restore from Backup' })
      .first();
    await expect(restoreModal).toBeVisible();

    // Wait for backup details to be visible
    await expect(restoreModal.getByText('Backup Details')).toBeVisible();
    await expect(restoreModal.getByText('Weekly-Backup')).toBeVisible();

    // Wait for UI to settle
    await page.waitForTimeout(500);

    // Screenshot 3: Restore Backup Modal
    await page.screenshot({ path: 'docs/screenshots/backups-restore-modal.png' });

    // Close restore modal
    await restoreModal.getByRole('button', { name: /Cancel/i }).click();
    await expect(restoreModal).not.toBeVisible();

    // Test Restore Encrypted Backup Flow
    // Find the encrypted backup (Pre-Deployment) and click its restore button
    const preDeploymentRow = page.locator('tr', { hasText: 'Pre-Deployment' });
    const encryptedRestoreButton = preDeploymentRow.getByRole('button', { name: /Restore/i });
    await encryptedRestoreButton.click();

    // Wait for restore modal for encrypted backup
    const encryptedRestoreModal = page
      .locator('.modal-box')
      .filter({ hasText: 'Restore from Backup' })
      .first();
    await expect(encryptedRestoreModal).toBeVisible();

    // Check that decryption key field is visible
    await expect(encryptedRestoreModal.getByLabel('Decryption Key')).toBeVisible();
    await expect(encryptedRestoreModal.getByText('This backup is encrypted')).toBeVisible();

    // Fill in decryption key
    await encryptedRestoreModal.getByLabel('Decryption Key').fill('MyDecryptionKey123');

    // Wait for UI to settle
    await page.waitForTimeout(500);

    // Screenshot 4: Restore Encrypted Backup Modal
    await page.screenshot({ path: 'docs/screenshots/backups-restore-encrypted.png' });

    // Close modal
    await encryptedRestoreModal.getByRole('button', { name: /Cancel/i }).click();
    await expect(encryptedRestoreModal).not.toBeVisible();

    // Test Search Functionality
    const searchInput = page.getByPlaceholder('Search backups...');
    await searchInput.fill('Weekly');

    // Wait for filtered results
    await expect(page.getByText('Weekly-Backup')).toBeVisible();
    await expect(page.getByText('Pre-Deployment')).not.toBeVisible();

    await page.waitForTimeout(300);

    // Screenshot 5: Search Results
    await page.screenshot({ path: 'docs/screenshots/backups-search.png', fullPage: true });

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);

    // Test Delete Backup Flow
    const deleteButtons = page.getByRole('button', { name: /Delete/i });
    const firstDeleteButton = deleteButtons.first();
    await firstDeleteButton.click();

    // Wait for confirmation modal
    const deleteConfirmModal = page.locator('.modal-box').filter({ hasText: 'Delete Backup' });
    await expect(deleteConfirmModal).toBeVisible();
    await expect(
      deleteConfirmModal.getByText(/Are you sure you want to delete the backup/)
    ).toBeVisible();

    await page.waitForTimeout(500);

    // Screenshot 6: Delete Confirmation Modal
    await page.screenshot({ path: 'docs/screenshots/backups-delete-confirmation.png' });

    // Close delete modal
    await deleteConfirmModal.getByRole('button', { name: /Cancel/i }).click();
    await expect(deleteConfirmModal).not.toBeVisible();

    // Verify all required elements are present
    await expect(page.getByText('Backup Management')).toBeVisible();
    await expect(page.getByText('Total Backups')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Backup/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();

    // Verify table headers
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('Description')).toBeVisible();
    await expect(page.getByText('Size')).toBeVisible();
    await expect(page.getByText('Created')).toBeVisible();

    // Verify encrypted badge is visible
    await expect(page.getByText('Encrypted').first()).toBeVisible();
  });

  test('Capture Empty State', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock empty backups
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/admin/backups');
    await page.waitForLoadState('domcontentloaded');

    // Wait for empty state
    await expect(page.getByText('No backups yet')).toBeVisible();
    await expect(page.getByText('Create your first backup to get started')).toBeVisible();

    await page.waitForTimeout(500);

    // Screenshot: Empty State
    await page.screenshot({ path: 'docs/screenshots/backups-empty-state.png', fullPage: true });
  });
});
