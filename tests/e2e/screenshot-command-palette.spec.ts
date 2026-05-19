import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Command Palette Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    // mock endpoints to prevent errors on dashboard
    await page.route('/api/dashboard/metrics', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/dashboard/metrics/activity-volume*', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/dashboard/metrics/llm-provider-stats*', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
  });

  test('capture command palette screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/overview');

    // Wait for the overview page to fully load
    await page.waitForSelector('h1:has-text("Ecosystem Status")', { timeout: 5000 }).catch(() => {});

    // Press Ctrl+K to open the palette
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500); // Wait for animation

    // Fallback: try Command+K if Ctrl+K didn't work (macOS)
    if (!await page.$('input[placeholder="Type a command or search..."]')) {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(500);
    }

    // Check if palette is visible, if not find the right shortcut or locator
    // Let's just wait for a common text in palette
    await page.waitForSelector('input[placeholder="Type a command or search..."]', { timeout: 2000 });

    await page.screenshot({ path: 'docs/screenshots/command-palette-empty.png' });

    // Type to search
    await page.keyboard.type('bot');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'docs/screenshots/command-palette-search.png' });
  });
});
