import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

test.describe('API Documentation Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock background polling endpoints
    await page.route('**/api/health/**', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );

    // Mock API Docs endpoint
    await page.route('**/api/docs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            groups: [
              {
                prefix: '/api/bots',
                routes: [
                  {
                    method: 'GET',
                    path: '/api/bots',
                    middleware: ['auth'],
                    description: 'Get all bots',
                    tag: 'bots'
                  },
                  {
                    method: 'POST',
                    path: '/api/bots',
                    middleware: ['auth', 'validate'],
                    description: 'Create a new bot',
                    tag: 'bots'
                  }
                ]
              },
              {
                prefix: '/api/config',
                routes: [
                  {
                    method: 'GET',
                    path: '/api/config',
                    middleware: ['auth'],
                    description: 'Get system config',
                    tag: 'config'
                  }
                ]
              }
            ]
          }
        })
      });
    });
  });

  test('Capture API Docs Page', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Navigate to API Docs page (from AppRouter.tsx path)
    await navigateAndWaitReady(page, '/admin/api-docs');

    // Wait for the header to appear
    await page.waitForSelector('h1:has-text("API Documentation")', { timeout: 10000 });

    // Wait for route cards to appear
    await page.waitForSelector('.collapse-title');

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/api-docs-page.png', fullPage: true });

    // Verify content exists
    await expect(page.locator('h2 code').first()).toHaveText('/api/bots');
  });
});
