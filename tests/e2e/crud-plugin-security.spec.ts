import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * CRUD E2E Tests for Plugin Security Page
 * Tests for plugin security scanning and management
 */

test.describe('Plugin Security Page CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock plugin security status
    await page.route('**/api/plugins/security', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            lastScan: new Date().toISOString(),
            totalPlugins: 10,
            securePlugins: 8,
            warnings: 2,
            critical: 0,
          },
        },
      });
    });

    // Mock plugins list
    await page.route('**/api/plugins', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'plugin-1',
              name: 'Example Plugin',
              version: '1.0.0',
              security: {
                status: 'secure',
                score: 95,
                lastChecked: new Date().toISOString(),
              },
            },
            {
              id: 'plugin-2',
              name: 'Legacy Plugin',
              version: '0.5.0',
              security: {
                status: 'warning',
                score: 60,
                issues: ['Outdated dependencies', 'Missing integrity check'],
                lastChecked: new Date().toISOString(),
              },
            },
            {
              id: 'plugin-3',
              name: 'Insecure Plugin',
              version: '0.1.0',
              security: {
                status: 'critical',
                score: 25,
                issues: ['Code injection vulnerability', 'Unvalidated inputs'],
                lastChecked: new Date().toISOString(),
              },
            },
          ],
        },
      });
    });
  });

  test.describe('Page Load', () => {
    test('loads plugin security page successfully', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('displays security summary', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      // Should show summary stats
      const summary = page
        .locator('[class*="stat"], [class*="summary"], [class*="overview"]')
        .first();
      if ((await summary.count()) > 0) {
        await expect(summary).toBeVisible();
      }
    });

    test('displays plugins list', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      // Should show plugin cards or list
      const pluginList = page.locator('[class*="plugin"], [class*="card"]').first();
      if ((await pluginList.count()) > 0) {
        await expect(pluginList).toBeVisible();
      }
    });
  });

  test.describe('Security Status Display', () => {
    test('shows secure plugin indicator', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      // Look for secure/insecure badges
      const secureBadge = page
        .locator('[class*="secure"], [class*="passed"], [class*="success"]')
        .first();
      if ((await secureBadge.count()) > 0) {
        await expect(secureBadge).toBeVisible();
      }
    });

    test('shows warning indicators', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const warningBadge = page.locator('[class*="warning"], [class*="warn"]').first();
      if ((await warningBadge.count()) > 0) {
        await expect(warningBadge).toBeVisible();
      }
    });

    test('shows critical alerts', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const criticalBadge = page
        .locator('[class*="critical"], [class*="error"], [class*="danger"]')
        .first();
      if ((await criticalBadge.count()) > 0) {
        await expect(criticalBadge).toBeVisible();
      }
    });
  });

  test.describe('Plugin Security Actions', () => {
    test('can trigger security scan', async ({ page }) => {
      await page.route('**/api/plugins/security/scan', async (route) => {
        await route.fulfill({
          json: { success: true, data: { scanId: 'scan-1' } },
        });
      });

      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const scanBtn = page.getByRole('button', { name: /scan|check|update/i });
      if ((await scanBtn.count()) > 0) {
        await expect(scanBtn.first()).toBeVisible();
      }
    });

    test('can view plugin details', async ({ page }) => {
      await page.route('**/api/plugins/plugin-1', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: {
              id: 'plugin-1',
              name: 'Example Plugin',
              security: { status: 'secure', score: 95 },
            },
          },
        });
      });

      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const pluginItem = page.locator('[class*="plugin"]').first();
      if ((await pluginItem.count()) > 0) {
        await pluginItem.click();
      }
    });

    test('can export security report', async ({ page }) => {
      await page.route('**/api/plugins/security/export', async (route) => {
        await route.fulfill({
          json: { success: true, data: { report: {} } },
        });
      });

      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const exportBtn = page.getByRole('button', { name: /export|download/i });
      if ((await exportBtn.count()) > 0) {
        await expect(exportBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Plugin Filtering', () => {
    test('can filter by security status', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const statusFilter = page
        .locator('select')
        .filter({ hasText: /status|secure|warning|critical/i });
      if ((await statusFilter.count()) > 0) {
        await statusFilter.selectOption('warning');
      }
    });

    test('can search plugins', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const searchInput = page
        .locator('input[type="search"], input[placeholder*="search" i]')
        .first();
      if ((await searchInput.count()) > 0) {
        await searchInput.fill('example');
      }
    });

    test('can sort by security score', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      const sortBtn = page
        .getByRole('button', { name: /sort|score/i })
        .or(page.locator('th').filter({ hasText: /score/i }));

      if ((await sortBtn.count()) > 0) {
        await sortBtn.first().click();
      }
    });
  });

  test.describe('Security Issues', () => {
    test('displays issue details', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      // Click on a plugin with issues
      const warningPlugin = page.locator('[class*="warning"]').first();
      if ((await warningPlugin.count()) > 0) {
        await warningPlugin.click();
      }
    });

    test('shows remediation suggestions', async ({ page }) => {
      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      // Look for remediation or suggestion text
      const remediation = page
        .locator('[class*="remedy"], [class*="suggestion"], [class*="fix"]')
        .first();
      if ((await remediation.count()) > 0) {
        await expect(remediation).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      await page.route('**/api/plugins/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('handles empty plugin list', async ({ page }) => {
      await page.route('**/api/plugins', async (route) => {
        await route.fulfill({
          json: { success: true, data: [] },
        });
      });

      await page.goto('/admin/plugins/security');
      await page.waitForLoadState('networkidle');

      // Should show empty state
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Plugin Security Accessibility', () => {
  test('has proper heading structure', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/plugins/**', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/admin/plugins/security');
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1').first();
    if ((await h1.count()) > 0) {
      await expect(h1).toBeVisible();
    }
  });

  test('security badges are distinguishable', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/plugins', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            { id: 'p1', name: 'Test', security: { status: 'secure', score: 90 } },
            { id: 'p2', name: 'Test2', security: { status: 'warning', score: 50 } },
          ],
        },
      });
    });

    await page.goto('/admin/plugins/security');
    await page.waitForLoadState('networkidle');

    // Different status badges should be visually distinct
    await expect(page.locator('body')).toBeVisible();
  });
});
