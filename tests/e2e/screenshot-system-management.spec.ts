import { test, expect } from '@playwright/test';

test('system management page screenshot', async ({ page }) => {
  // Set viewport
  await page.setViewportSize({ width: 1280, height: 1200 });

  // Mock API endpoints
  await page.route('**/api/config/global', async route => {
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
      })
    });
  });

  await page.route('**/api/import-export/backups', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: '1', name: 'backup-auto-1', createdAt: new Date().toISOString(), size: 1024 * 1024 * 5, description: 'Automatic daily backup' },
          { id: '2', name: 'backup-manual-1', createdAt: new Date(Date.now() - 86400000).toISOString(), size: 1024 * 1024 * 4.8, description: 'Manual backup before update' }
        ]
      })
    });
  });

  // Mock AlertPanel alerts (via props, but page might fetch if it was wired that way, usually via websocket context which we can't easily mock in route, but we can rely on initial state or props if passed)
  // Since `SystemManagement` uses `useWebSocket` for alerts, and we can't easily mock the websocket connection in this simple test without a custom fixture, the alerts stats might be empty (0).
  // However, `AlertPanel` inside `SystemManagement` receives alerts from context.
  // We can try to mock the context provider if we were unit testing, but in E2E we might just see empty alerts.
  // To make the screenshot look good, we might rely on the static layout.
  // Alternatively, we can inject data if possible, but for now we accept empty alerts or mock the websocket if feasible.
  // Since mocking websocket in simple playwright route is hard, we'll proceed with empty alerts which is a valid state.

  await page.route('**/health/api-endpoints', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overall: { status: 'healthy', message: 'All systems operational', stats: { total: 5, online: 5, slow: 0, error: 0 } },
        endpoints: [
          { id: '1', name: 'Main API', url: '/api', status: 'online', responseTime: 45, consecutiveFailures: 0, lastChecked: new Date().toISOString() },
          { id: '2', name: 'Auth Service', url: '/auth', status: 'online', responseTime: 30, consecutiveFailures: 0, lastChecked: new Date().toISOString() }
        ]
      })
    });
  });

  await page.route('**/api/admin/system-info', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        systemInfo: {
          platform: 'linux',
          arch: 'x64',
          nodeVersion: 'v20.10.0',
          uptime: 36000,
          pid: 1234,
          memory: { rss: 1024 * 1024 * 256 },
          database: { connected: true, stats: { poolSize: 10 } }
        }
      })
    });
  });

  await page.route('**/api/admin/env-overrides', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          envVars: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'info'
          }
        }
      })
    });
  });

  // Mock other potentially needed endpoints
  await page.route('**/api/config/llm-profiles', async route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
  await page.route('**/api/bots/templates', async route => route.fulfill({ status: 200, body: JSON.stringify([]) }));

  // Navigate
  await page.goto('/admin/system-management');

  // Assertions
  await expect(page.getByRole('heading', { name: 'System Management' })).toBeVisible();
  await expect(page.getByText('System Configuration')).toBeVisible(); // Tab or section

  // Wait for content
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/system-management.png', fullPage: true });
});
