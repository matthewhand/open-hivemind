import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Static Pages Screenshots', () => {
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
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );

    // Mock static pages data if necessary (we assume the API endpoint serves up the list of static pages)
    await page.route('/api/static/pages*', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            path: '/screensaver',
            name: 'Screensaver',
            description: 'A screensaver page.',
          },
          {
            path: '/enhanced-homepage',
            name: 'Enhanced Homepage',
            description: 'A static enhanced homepage demo.',
          },
        ],
      });
    });
  });

  test('Capture Static Pages page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Static Pages page
    await page.goto('/admin/static');

    // Wait for page to render
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/static-pages.png', fullPage: true });
  });
});
