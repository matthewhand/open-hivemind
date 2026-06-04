import { expect, test } from '@playwright/test';
import { setupAuth, navigateAndWaitReady } from './test-utils';

test.describe('Command Palette Screenshots', () => {
  test('Capture Command Palette', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    // Mock Bots list
    await page.route('**/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            bots: [
              {
                id: 'bot-1',
                name: 'Support Bot',
                status: 'active',
                connected: true,
              },
              {
                id: 'bot-2',
                name: 'Data Analyzer',
                status: 'active',
                connected: false,
              }
            ]
          }
        }
      });
    });

    // Navigate to dashboard
    await page.setViewportSize({ width: 1280, height: 800 });
    await navigateAndWaitReady(page, '/admin/bots');

    // Press Ctrl+K or Cmd+K
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+K' : 'Control+K');

    // Wait for the Command Palette to appear
    const commandPalette = page.locator('[role="dialog"][aria-label="Command palette"]');
    await expect(commandPalette).toBeVisible();

    // Type to show some results
    await page.locator('[aria-label="Command palette search"]').fill('Bot');

    // Wait for results
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/command-palette.png' });
  });
});
