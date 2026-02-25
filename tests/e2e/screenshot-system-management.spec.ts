import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('System Management Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock System Config
    await page.route('/api/config/global', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          _userSettings: {
            values: {
              refreshInterval: 5000,
              logLevel: 'info',
              maxConnections: 1000,
              enableDebugMode: false,
              enableAutoBackup: true,
              backupInterval: 86400000,
              alertThresholds: { cpu: 80, memory: 85, disk: 90, responseTime: 500 }
            }
          }
        }
      })
    );

    // Mock Backups
    await page.route('/api/import-export/backups', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              id: 'backup-123',
              name: 'backup-2023-10-27',
              description: 'Automatic daily backup',
              size: 1048576 * 5.2,
              createdAt: new Date().toISOString(),
              type: 'automatic'
            },
            {
              id: 'backup-456',
              name: 'backup-manual-1',
              description: 'Pre-deployment backup',
              size: 1048576 * 5.5,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              type: 'manual'
            }
          ]
        }
      })
    );

    // Mock API Endpoints Status
    await page.route('/api/health/api-endpoints', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          overall: {
            status: 'healthy',
            message: 'All systems operational',
            stats: { total: 5, online: 5, slow: 0, offline: 0, error: 0 }
          },
          endpoints: [
            { id: '1', name: 'OpenAI', url: 'https://api.openai.com/v1', status: 'online', responseTime: 245, lastChecked: new Date().toISOString(), consecutiveFailures: 0 },
            { id: '2', name: 'Discord', url: 'https://discord.com/api', status: 'online', responseTime: 120, lastChecked: new Date().toISOString(), consecutiveFailures: 0 },
            { id: '3', name: 'Database', url: 'postgres://localhost:5432', status: 'online', responseTime: 5, lastChecked: new Date().toISOString(), consecutiveFailures: 0 }
          ]
        }
      })
    );

    // Mock System Info
    await page.route('/api/admin/system-info', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          systemInfo: {
            platform: 'linux',
            arch: 'x64',
            nodeVersion: 'v20.9.0',
            uptime: 123456,
            pid: 1234,
            memory: { rss: 1024 * 1024 * 256 },
            database: {
              connected: true,
              stats: { poolSize: 10 }
            }
          }
        }
      })
    );

    // Mock Env Overrides
    await page.route('/api/admin/env-overrides', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          data: {
            envVars: {
              NODE_ENV: 'production',
              LOG_LEVEL: 'info',
              DB_HOST: 'localhost'
            }
          }
        }
      })
    );

    // Mock other polling to prevent errors
    await page.route('/api/health/detailed', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/dashboard/api/status', async (route) => route.fulfill({ status: 200, json: { bots: [], uptime: 0 } }));
    await page.route('/api/dashboard/api/activity', async (route) => route.fulfill({ status: 200, json: { events: [] } }));
    await page.route('/api/config', async (route) => route.fulfill({ status: 200, json: { bots: [] } }));
  });

  test('capture System Management screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 1000 });

    // Navigate to System Management
    await page.goto('/admin/system-management');

    // Wait for page header and stats
    await expect(page.getByRole('heading', { name: 'System Management', exact: true })).toBeVisible();
    await expect(page.getByText('Active Alerts')).toBeVisible();

    // 1. Alerts Tab (Default)
    // Wait for "Alerts" tab content (using the filter buttons as indicator)
    await expect(page.getByRole('button', { name: 'All (' })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/system-management-alerts.png', fullPage: true });

    // 2. Configuration Tab
    await page.getByRole('tab', { name: 'Configuration' }).click();
    await expect(page.getByRole('heading', { name: 'System Configuration' })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/system-management-config.png', fullPage: true });

    // 3. Backups Tab
    await page.getByRole('tab', { name: 'Backups' }).click();
    await expect(page.getByRole('heading', { name: 'Backup History' })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/system-management-backups.png', fullPage: true });

    // 4. Performance Tab
    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect(page.getByRole('heading', { name: 'System Performance & Monitoring' })).toBeVisible();
    // Wait for API status table
    await expect(page.getByText('OpenAI', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/system-management-performance.png', fullPage: true });

    // 5. Create Backup Modal
    await page.getByRole('button', { name: 'Create Backup' }).click();
    const modal = page.locator('.modal-box').filter({ hasText: 'Create System Backup' });
    await expect(modal).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/system-management-backup-modal.png' });
  });
});
