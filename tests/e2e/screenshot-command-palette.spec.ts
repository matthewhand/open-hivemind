import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Command Palette Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
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
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );
    await page.route('**/api/bots', async (route) => {
      await route.fulfill({ status: 200, json: { data: { bots: [] } } });
    });
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/personas', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
  });

  test('capture command palette screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to a page
    await page.goto('/admin/overview');

    // Wait for the page content to load
    await page.waitForTimeout(2000);

    // Open Command Palette with Control+K
    // Using Meta+K for mac as well just in case, but Control+K should work on playwright chromium
    await page.keyboard.press('Control+K');

    // Wait for the Command Palette to be visible
    const inputLocator = page.locator('input[placeholder="Type a command or search..."]');
    await expect(inputLocator).toBeVisible();

    // Small delay to let animations settle
    await page.waitForTimeout(500);

    // Take screenshot of the empty Command Palette
    await page.screenshot({ path: 'docs/screenshots/command-palette.png' });

    // Type a search query
    await inputLocator.fill('set');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Take screenshot of the filtered Command Palette
    await page.screenshot({ path: 'docs/screenshots/command-palette-search.png' });
  });
});
