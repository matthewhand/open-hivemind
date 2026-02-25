import { test, expect } from '@playwright/test';

test.describe('System Management Screenshots', () => {
  test('system management screenshot', async ({ page }) => {
    // Setup authentication
    await page.addInitScript(() => {
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
        const fakeUser = JSON.stringify({
            id: 'admin',
            username: 'admin',
            email: 'admin@open-hivemind.com',
            role: 'owner',
            permissions: ['*'],
        });
        localStorage.setItem('auth_tokens', JSON.stringify({
            accessToken: fakeToken,
            refreshToken: fakeToken,
            expiresIn: 3600,
        }));
        localStorage.setItem('auth_user', fakeUser);
    });

    // Mock API endpoints
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      });
    });

    await page.route('**/api/import-export/backups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: '1', name: 'backup-1', createdAt: new Date().toISOString(), size: 1024 * 1024 * 5, description: 'automatic backup' },
            { id: '2', name: 'backup-2', createdAt: new Date(Date.now() - 86400000).toISOString(), size: 1024 * 1024 * 4.8, description: 'manual backup' }
          ]
        }),
      });
    });

    await page.route('**/health/api-endpoints', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                overall: { status: 'healthy', stats: { online: 5, total: 5, error: 0 } },
                endpoints: []
            })
        });
    });

    await page.route('**/api/admin/system-info', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                systemInfo: {
                    platform: 'linux',
                    arch: 'x64',
                    nodeVersion: 'v18.16.0',
                    uptime: 36000,
                    pid: 1234,
                    memory: { rss: 1024 * 1024 * 200 },
                    database: { connected: true, stats: { poolSize: 10 } }
                }
            })
        });
    });

    await page.route('**/api/admin/env-overrides', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    envVars: {
                        NODE_ENV: 'production',
                        LOG_LEVEL: 'info'
                    }
                }
            })
        });
    });

    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [],
          warnings: [],
          legacyMode: false,
          environment: 'production'
        }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'admin',
                username: 'admin',
                role: 'owner'
            }),
        });
    });

    // Mock WebSocket context init calls
    await page.route('**/api/dashboard/api/status', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ bots: [], uptime: 100 })
        });
    });

    await page.setViewportSize({ width: 1280, height: 1200 });

    // Go to admin root
    await page.goto('/admin/overview');

    // Check if we are on login
    if (page.url().includes('/login')) {
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin/overview');
    }

    // Now navigate to system management
    await page.goto('/admin/system-management');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'System Management' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Active Alerts')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/system-management.png', fullPage: true });
  });
});
