import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Settings Maintenance Page', () => {
  test('Capture Maintenance Tab', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock System Info
    const mockSystemInfo = {
      systemInfo: {
        uptime: 3600 * 24 * 3 + 3600 * 5 + 60 * 12, // 3d 5h 12m
        memory: {
          rss: 1024 * 1024 * 256, // 256 MB
          heapTotal: 1024 * 1024 * 512,
          heapUsed: 1024 * 1024 * 128,
          external: 0,
          arrayBuffers: 0
        },
        nodeVersion: 'v20.11.0',
        platform: 'linux',
        arch: 'x64',
        pid: 12345,
        database: {
          connected: true,
          stats: { users: 5, bots: 10 }
        },
        environment: 'production'
      }
    };

    // Mock API responses
    await page.route('**/api/admin/system-info', async route => {
      await route.fulfill({ json: mockSystemInfo });
    });

    await page.route('**/api/config/global', async route => {
      await route.fulfill({ json: { _userSettings: {}, config: {} } });
    });

    // Navigate to Settings page
    await navigateAndWaitReady(page, '/admin/settings');

    // Click Maintenance Tab
    await page.getByText('Maintenance').click();

    // Wait for content to load
    await expect(page.getByText('System Maintenance')).toBeVisible();
    await expect(page.getByText('3d 5h 12m 0s')).toBeVisible(); // Uptime

    // Wait for animation/layout settle
    await page.waitForTimeout(500);

    // Screenshot Maintenance Tab
    await page.screenshot({ path: 'docs/images/settings-maintenance.png', fullPage: true });
  });
});
