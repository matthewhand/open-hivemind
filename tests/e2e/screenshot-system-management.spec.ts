import { test, expect } from '@playwright/test';

test.describe('System Management Page', () => {
  test('should display system management dashboard correctly', async ({ page }) => {
    // Mock global config
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _userSettings: {
            values: {
              refreshInterval: 5000,
              logLevel: 'info',
              maxConnections: 500,
              enableDebugMode: false,
              enableAutoBackup: true,
              backupInterval: 86400000, // 24h
              alertThresholds: {
                cpu: 80,
                memory: 85,
                disk: 90,
                responseTime: 500,
              }
            }
          }
        }),
      });
    });

    // Mock backup list
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'backup-1',
              name: 'backup-auto-2023-10-27',
              createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
              size: 1024 * 1024 * 5.5, // 5.5 MB
              description: 'Daily automatic backup',
            },
            {
              id: 'backup-2',
              name: 'backup-manual-2023-10-26',
              createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
              size: 1024 * 1024 * 5.2, // 5.2 MB
              description: 'Pre-upgrade snapshot',
            }
          ]
        }),
      });
    });

    // Mock system info
    await page.route('**/api/admin/system-info', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          systemInfo: {
            platform: 'linux',
            arch: 'x64',
            nodeVersion: 'v20.9.0',
            uptime: 3600 * 48, // 48 hours
            pid: 12345,
            memory: { rss: 1024 * 1024 * 150 },
            database: {
                connected: true,
                stats: { poolSize: 5 }
            }
          }
        }),
      });
    });

    // Mock env overrides
    await page.route('**/api/admin/env-overrides', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            envVars: {
              'NODE_ENV': 'production',
              'LOG_LEVEL': 'info'
            }
          }
        }),
      });
    });

    // Mock API endpoints status
    await page.route('**/health/api-endpoints', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          overall: {
            status: 'healthy',
            message: 'All systems operational',
            stats: { total: 5, online: 5, error: 0 }
          },
          endpoints: [
            { id: '1', name: 'Primary API', url: '/api/v1', status: 'online', responseTime: 45, consecutiveFailures: 0, lastChecked: new Date().toISOString() },
            { id: '2', name: 'Auth Service', url: '/auth', status: 'online', responseTime: 60, consecutiveFailures: 0, lastChecked: new Date().toISOString() }
          ]
        }),
      });
    });

    // Navigate to page
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/system-management');

    // Wait for content
    await expect(page.getByRole('heading', { name: 'System Management' })).toBeVisible();
    await expect(page.getByText('Active Alerts')).toBeVisible();

    // Switch tabs to verify they render
    await page.getByRole('tab', { name: 'Configuration' }).click();
    await expect(page.getByText('System Configuration', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Backups' }).click();
    await expect(page.getByText('Backup History')).toBeVisible();
    await expect(page.getByText('Daily automatic backup')).toBeVisible();

    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect(page.getByText('System Performance & Monitoring')).toBeVisible();

    // Take screenshot of the Performance tab (most data dense)
    await page.screenshot({ path: 'docs/screenshots/system-management-performance.png', fullPage: true });

    // Go back to Config tab for another screenshot
    await page.getByRole('tab', { name: 'Configuration' }).click();
    await page.screenshot({ path: 'docs/screenshots/system-management-config.png', fullPage: true });
  });
});
