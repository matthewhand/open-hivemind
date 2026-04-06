import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('API Docs Screenshots', () => {
  test('Capture API Docs page screenshot', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock background polling endpoints
    await page.route('**/api/health/**', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/**', async (route) => route.fulfill({ status: 200, json: {} }));

    // Go to API Docs page
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/api-docs');

    // Wait for the page to load
    // The page uses a Swagger UI element which might not use an h1 heading with 'API Documentation'
    // when loaded inside an iframe or dynamically. Wait for a known element or wait for load state.
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Wait for potential iframe/swagger initialization

    // Screenshot
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'docs/screenshots/api-docs-page.png', fullPage: true });
  });
});
