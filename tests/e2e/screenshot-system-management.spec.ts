import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('System Management Page Screenshots', () => {
  test('capture System Management page (Performance Tab)', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock Global Config (for System Config tab)
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          _userSettings: {
            values: {
              refreshInterval: 5000,
              logLevel: 'info',
              maxConnections: 500,
              enableDebugMode: false,
              enableAutoBackup: true,
              backupInterval: 86400000,
              alertThresholds: {
                cpu: 80,
                memory: 85,
                disk: 90,
                responseTime: 500,
              },
            },
          },
        },
      });
    });

    // Mock System Backups (for Backups tab)
    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 'backup-1',
            name: 'weekly-backup-2023-10-25',
            description: 'Automatic weekly backup',
            size: 5242880, // 5MB
            createdAt: new Date('2023-10-25T02:00:00Z').toISOString(),
          },
          {
            id: 'backup-2',
            name: 'pre-deployment-backup',
            description: 'Manual backup before update',
            size: 4194304, // 4MB
            createdAt: new Date('2023-10-24T15:30:00Z').toISOString(),
          },
        ],
      });
    });

    // Mock API Endpoints Status (for Performance tab)
    await page.route('**/health/api-endpoints', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          overall: {
            status: 'healthy',
            message: 'All systems operational',
            stats: { total: 5, online: 5, slow: 0, offline: 0, error: 0 },
          },
          endpoints: [
            {
              id: '1',
              name: 'Authentication Service',
              url: '/api/auth',
              status: 'online',
              responseTime: 12,
              lastChecked: new Date().toISOString(),
              consecutiveFailures: 0,
            },
            {
              id: '2',
              name: 'Database Connection',
              url: 'postgres://internal',
              status: 'online',
              responseTime: 4,
              lastChecked: new Date().toISOString(),
              consecutiveFailures: 0,
            },
            {
              id: '3',
              name: 'LLM Gateway',
              url: 'https://api.openai.com',
              status: 'online',
              responseTime: 145,
              lastChecked: new Date().toISOString(),
              consecutiveFailures: 0,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Mock System Info (for Performance tab)
    await page.route('**/api/admin/system-info', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          systemInfo: {
            platform: 'linux',
            arch: 'x64',
            nodeVersion: 'v18.16.0',
            uptime: 123456,
            pid: 1001,
            memory: {
              rss: 1024 * 1024 * 150, // 150MB
            },
            database: {
              connected: true,
              stats: {
                poolSize: 10,
              },
            },
          },
        },
      });
    });

    // Mock Env Overrides (for Performance tab)
    await page.route('**/api/admin/env-overrides', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          envVars: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
            API_PORT: '3000',
            DB_HOST: 'postgres-primary',
          },
        },
      });
    });

    // Mock other required endpoints to prevent 404s
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );
    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Navigate to System Management page
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/system-management');

    // Wait for the page to load
    await expect(page.getByText('System Management', { exact: true })).toBeVisible();

    // Switch to Performance Tuning tab
    await page.getByText('Performance Tuning').click();

    // Wait for performance data to load (look for specific data we mocked)
    await expect(page.getByText('Overall Status')).toBeVisible();
    await expect(page.getByText('Authentication Service')).toBeVisible();
    await expect(page.getByText('NODE_ENV')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/system-management-page.png', fullPage: true });
  });
});
