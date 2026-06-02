import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Help & FAQ Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API requests needed for the app frame to load
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

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

    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );

    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );
  });

  test('Capture Help Page Main View', async ({ page }) => {
    // Navigate to Help page
    await page.goto('/admin/help');

    // Wait for content to load
    await expect(page.locator('h1:has-text("Help & FAQ")')).toBeVisible();
    await expect(page.locator('h2:has-text("Frequently Asked Questions")')).toBeVisible();

    // Take screenshot of the page
    await page.screenshot({ path: 'docs/screenshots/help-page.png', fullPage: true });

    // Open an FAQ item to show how it looks
    const faqItem = page.locator('.collapse').filter({ hasText: 'How do I get started?' });
    await faqItem.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Take screenshot of expanded item
    await page.screenshot({ path: 'docs/screenshots/help-page-expanded.png' });
  });
});
