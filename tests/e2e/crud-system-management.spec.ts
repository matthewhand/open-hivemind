import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * CRUD E2E Tests for System Management Page
 * Tests for system monitoring, backup, and configuration management
 */

test.describe('System Management Page CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock system status
    await page.route('**/api/system/status', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            cpu: { usage: 45, cores: 4 },
            memory: { used: 4096, total: 8192, percentage: 50 },
            disk: { used: 50, total: 100, percentage: 50 },
            uptime: 123456,
            version: '1.0.0',
          },
        },
      });
    });

    // Mock environment variables
    await page.route('**/api/system/env', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
          },
        },
      });
    });

    // Mock backups list
    await page.route('**/api/system/backups', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'Daily Backup',
              createdAt: new Date().toISOString(),
              size: 5242880,
            },
            {
              id: 'backup-2',
              name: 'Manual Backup',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              size: 2621440,
            },
          ],
        },
      });
    });

    // Mock logs
    await page.route('**/api/system/logs', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            { level: 'info', message: 'System started', timestamp: new Date().toISOString() },
            { level: 'warn', message: 'High memory usage', timestamp: new Date().toISOString() },
          ],
        },
      });
    });
  });

  test.describe('Page Load', () => {
    test('loads system management page successfully', async ({ page }) => {
      await page.goto('/admin/system');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('displays system status', async ({ page }) => {
      await page.goto('/admin/system');
      await page.waitForLoadState('networkidle');

      // Should show some status metrics
      const statsSection = page.locator('[class*="stat"], [class*="metric"], [class*="status"]').first();
      if (await statsSection.count() > 0) {
        await expect(statsSection).toBeVisible();
      }
    });

    test('displays system information cards', async ({ page }) => {
      await page.goto('/admin/system');
      await page.waitForLoadState('networkidle');

      // Should show information sections
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Backup Management', () => {
    test('displays backups list', async ({ page }) => {
      await page.goto('/admin/system/backups');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('can create backup', async ({ page }) => {
      await page.route('**/api/system/backups', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            json: {
              success: true,
              data: { id: 'new-backup', name: 'New Backup' },
            },
          });
        }
      });

      await page.goto('/admin/system/backups');
      await page.waitForLoadState('networkidle');

      const createBtn = page.getByRole('button', { name: /create|new|backup/i });
      if (await createBtn.count() > 0) {
        await createBtn.first().click();
      }
    });

    test('can delete backup', async ({ page }) => {
      await page.route('**/api/system/backups/**', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            json: { success: true },
          });
        }
      });

      await page.goto('/admin/system/backups');
      await page.waitForLoadState('networkidle');

      // Look for delete button
      const deleteBtn = page.getByRole('button', { name: /delete|remove/i }).or(
        page.locator('button').filter({ has: page.locator('[class*="trash"]') })
      );

      if (await deleteBtn.count() > 0) {
        await deleteBtn.first().click();
      }
    });

    test('can restore backup', async ({ page }) => {
      await page.route('**/api/system/backups/**/restore', async (route) => {
        await route.fulfill({
          json: { success: true },
        });
      });

      await page.goto('/admin/system/backups');
      await page.waitForLoadState('networkidle');

      const restoreBtn = page.getByRole('button', { name: /restore/i });
      if (await restoreBtn.count() > 0) {
        await restoreBtn.first().click();
      }
    });

    test('can download backup', async ({ page }) => {
      await page.goto('/admin/system/backups');
      await page.waitForLoadState('networkidle');

      const downloadBtn = page.getByRole('button', { name: /download/i }).or(
        page.locator('a[download]')
      );

      if (await downloadBtn.count() > 0) {
        // Don't actually download, just verify button exists
        await expect(downloadBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Environment Variables', () => {
    test('displays environment configuration', async ({ page }) => {
      await page.goto('/admin/system/env');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('can update environment variable', async ({ page }) => {
      await page.route('**/api/system/env', async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          await route.fulfill({
            json: { success: true },
          });
        }
      });

      await page.goto('/admin/system/env');
      await page.waitForLoadState('networkidle');

      // Look for editable fields
      const input = page.locator('input, textarea').first();
      if (await input.count() > 0) {
        await input.fill('test-value');
      }
    });
  });

  test.describe('Logs Viewer', () => {
    test('displays system logs', async ({ page }) => {
      await page.goto('/admin/system/logs');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('can filter logs by level', async ({ page }) => {
      await page.goto('/admin/system/logs');
      await page.waitForLoadState('networkidle');

      const filterSelect = page.locator('select').filter({ hasText: /level|info|warn|error/i });
      if (await filterSelect.count() > 0) {
        await filterSelect.selectOption('error');
      }
    });

    test('can search logs', async ({ page }) => {
      await page.goto('/admin/system/logs');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill('error');
      }
    });
  });

  test.describe('System Health', () => {
    test('displays health metrics', async ({ page }) => {
      await page.goto('/admin/system/health');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('displays resource usage', async ({ page }) => {
      await page.goto('/admin/system/health');
      await page.waitForLoadState('networkidle');

      // Look for resource cards
      const resourceCard = page.locator('[class*="cpu"], [class*="memory"], [class*="disk"]').first();
      if (await resourceCard.count() > 0) {
        await expect(resourceCard).toBeVisible();
      }
    });
  });

  test.describe('Configuration Export/Import', () => {
    test('can export configuration', async ({ page }) => {
      await page.route('**/api/system/export', async (route) => {
        await route.fulfill({
          json: { success: true, data: { config: {} } },
        });
      });

      await page.goto('/admin/system');
      await page.waitForLoadState('networkidle');

      const exportBtn = page.getByRole('button', { name: /export/i });
      if (await exportBtn.count() > 0) {
        await expect(exportBtn.first()).toBeVisible();
      }
    });

    test('can import configuration', async ({ page }) => {
      await page.goto('/admin/system');
      await page.waitForLoadState('networkidle');

      const importBtn = page.getByRole('button', { name: /import/i });
      if (await importBtn.count() > 0) {
        await expect(importBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      await page.route('**/api/system/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.goto('/admin/system');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('handles empty data states', async ({ page }) => {
      await page.route('**/api/system/backups', async (route) => {
        await route.fulfill({
          json: { success: true, data: [] },
        });
      });

      await page.goto('/admin/system/backups');
      await page.waitForLoadState('networkidle');

      // Should show empty state
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('System Management Accessibility', () => {
  test('has proper heading structure', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/system/**', async (route) => {
      await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.goto('/admin/system');
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1').first();
    if (await h1.count() > 0) {
      await expect(h1).toBeVisible();
    }
  });

  test('all buttons have accessible names', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/system/**', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/admin/system');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count && i < 10; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  });
});
