import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('System Management Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
        route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
        route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
        route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock System Management specific endpoints

    // 1. Global Config
    await page.route('/api/config/global', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          _userSettings: {
            values: {
              refreshInterval: 10000,
              logLevel: 'info',
              maxConnections: 500,
              enableAutoBackup: true,
              backupInterval: 86400000,
              alertThresholds: {
                cpu: 90,
                memory: 90,
                disk: 95,
                responseTime: 2000
              }
            }
          }
        }
      })
    );

    // 2. Backups
    await page.route('/api/import-export/backups', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                success: true,
                data: [
                    { id: '1', name: 'backup-auto-1', createdAt: new Date().toISOString(), size: 1024 * 1024 * 5, description: 'Daily automatic backup' },
                    { id: '2', name: 'backup-manual-1', createdAt: new Date(Date.now() - 86400000).toISOString(), size: 1024 * 1024 * 4.8, description: 'Pre-update manual backup' }
                ]
            }
        })
    );

    // 3. System Info & Env Overrides (Performance Tab)
    await page.route('/api/admin/system-info', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                systemInfo: {
                    platform: 'linux',
                    arch: 'x64',
                    nodeVersion: 'v20.11.0',
                    uptime: 12345,
                    pid: 101,
                    memory: { rss: 1024 * 1024 * 200 },
                    database: {
                        connected: true,
                        stats: { poolSize: 5 }
                    }
                }
            }
        })
    );

    await page.route('/api/admin/env-overrides', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                data: {
                    envVars: {
                        NODE_ENV: 'production',
                        PORT: '3000',
                        DATABASE_URL: 'postgres://user:pass@db:5432/app'
                    }
                }
            }
        })
    );

    // 4. API Endpoints Status
    await page.route('/health/api-endpoints', async (route) =>
        route.fulfill({
            status: 200,
            json: {
                overall: {
                    status: 'healthy',
                    message: 'All endpoints operational',
                    stats: { total: 3, online: 3, slow: 0, offline: 0, error: 0 }
                },
                endpoints: [
                    { id: '1', name: 'Auth Service', url: 'http://auth:3001', status: 'online', responseTime: 10, lastChecked: new Date().toISOString() },
                    { id: '2', name: 'LLM Gateway', url: 'http://llm:3002', status: 'online', responseTime: 150, lastChecked: new Date().toISOString() }
                ]
            }
        })
    );

    // 5. Alerts - Mock WebSocket context if possible, or mocked hook behavior.
    // Since we can't easily mock websocket context via playwright route intercept,
    // we rely on the component handling empty alerts gracefully or if the component fetches alerts via HTTP too.
    // The current implementation uses `useWebSocket` hook which connects to WS.
    // However, `AlertPanel` accepts `alerts` prop. `SystemManagement` passes alerts from context.
    // To make sure we have data in screenshot, we might need to rely on `SystemManagement` default state or mocked context.
    // Mocking React context in Playwright is hard without component testing.
    // BUT `SystemManagement` component in the refactor uses `alerts` from context.
    // If context is empty, alerts section will be empty.
    // Let's proceed with empty alerts for the screenshot or assume some default.
    // Wait, `SystemManagement` uses `useWebSocket`.
    // We can try to mock the WS connection but that's complex.
    // Alternatively, just screenshot the page structure.
  });

  test('capture system management page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/system-management');

    // Wait for header
    await expect(page.getByRole('heading', { name: 'System Management' })).toBeVisible();

    // Click on Backups tab to show table
    await page.getByRole('tab', { name: 'Backups' }).click();
    await expect(page.getByRole('heading', { name: 'Backup History' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/system-management-page.png', fullPage: true });
  });
});
