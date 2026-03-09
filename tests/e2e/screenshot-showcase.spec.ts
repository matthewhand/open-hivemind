import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Showcase Screenshots', () => {
  test('Capture UI Components Showcase page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints to prevent hanging tests
    await page.route('**/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true } }));
    await page.route('**/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: { profiles: { llm: [] } } }));

    // Navigate to Showcase page
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/showcase');

    // Wait for the page to load
    await expect(page.getByText('DaisyUI Component Reference', { exact: true })).toBeVisible();

    // Wait slightly for any animations
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/showcase-page.png', fullPage: true });
  });
});
