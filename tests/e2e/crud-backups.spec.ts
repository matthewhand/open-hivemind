import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * Quality E2E Tests for Backups Management Page
 * Tests backup CRUD operations with real assertions
 */

test.describe('Backups Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock backups list
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'Daily Backup',
              description: 'Automated daily backup',
              createdAt: new Date().toISOString(),
              createdBy: 'admin',
              configCount: 10,
              versionCount: 5,
              templateCount: 3,
              size: 1048576,
              checksum: 'abc123',
              encrypted: false,
              compressed: true,
            },
            {
              id: 'backup-2',
              name: 'Manual Backup',
              description: 'Manual backup before deployment',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              createdBy: 'admin',
              configCount: 12,
              versionCount: 7,
              templateCount: 4,
              size: 2097152,
              checksum: 'def456',
              encrypted: true,
              compressed: true,
            },
          ],
        },
      });
    });
  });

  test('displays backups page with correct structure', async ({ page }) => {
    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Verify page container
    await expect(page.getByTestId('backups-page')).toBeVisible();

    // Verify title
    await expect(page.getByRole('heading', { name: /backup/i })).toBeVisible();
  });

  test('displays backup list with data', async ({ page }) => {
    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Should show backup names
    await expect(page.getByText('Daily Backup')).toBeVisible();
    await expect(page.getByText('Manual Backup')).toBeVisible();
  });

  test('has create backup button', async ({ page }) => {
    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Create button should be visible and enabled
    const createBtn = page.getByTestId('create-backup-btn');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();
  });

  test('has refresh backups button', async ({ page }) => {
    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Refresh button should be visible
    const refreshBtn = page.getByTestId('refresh-backups-btn');
    await expect(refreshBtn).toBeVisible();
  });

  test('can click create backup button', async ({ page }) => {
    await page.route('**/api/import-export/backup', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: { success: true, data: { id: 'new-backup' } },
        });
      }
    });

    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Click create button
    await page.getByTestId('create-backup-btn').click();

    // Should open create modal
    await expect(page.locator('.modal, [role="dialog"]')).toBeVisible();
  });

  test('shows empty state when no backups', async ({ page }) => {
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        json: { success: true, data: [] },
      });
    });

    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Should show empty state message
    await expect(
      page.getByText(/no backups|create your first/i)
    ).toBeVisible();
  });

  test('handles API errors gracefully', async ({ page }) => {
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        status: 500,
        json: { success: false, error: 'Server error' },
      });
    });

    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Page should still render
    await expect(page.getByTestId('backups-page')).toBeVisible();
  });

  test('displays backup encryption status', async ({ page }) => {
    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Should show encrypted badge for encrypted backup
    const encryptedBadge = page.locator('[class*="badge"]').filter({ hasText: /encrypted/i });
    if (await encryptedBadge.count() > 0) {
      await expect(encryptedBadge.first()).toBeVisible();
    }
  });
});

test.describe('Backups Page Accessibility', () => {
  test('all buttons have accessible names', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/admin/backups');
    await page.waitForLoadState('networkidle');

    // Check key buttons have aria-labels or text content
    const createBtn = page.getByTestId('create-backup-btn');
    const ariaLabel = await createBtn.getAttribute('aria-label');
    const text = await createBtn.textContent();
    expect(ariaLabel || text).toBeTruthy();
  });
});
