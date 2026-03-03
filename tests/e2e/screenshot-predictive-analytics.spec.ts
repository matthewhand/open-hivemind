import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Predictive Analytics Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication state before each test
    await setupAuth(page, 'admin');
  });

  test('capture predictive analytics with and without confidence bands', async ({ page }) => {
    // Navigate directly to the temporary predictive analytics page
    await page.goto('/admin/predictive-analytics');

    // Wait for the page to load
    await expect(page.locator('text=Predictive Analytics').first()).toBeVisible({ timeout: 10000 });

    // Wait for the mock API to load and the chart to appear
    await expect(page.locator('.recharts-responsive-container')).toBeVisible({ timeout: 15000 });

    // Wait an additional second to let the chart render fully
    await page.waitForTimeout(1000);

    // Screenshot with confidence bands (default is on)
    await page.screenshot({ path: 'docs/screenshots/predictive-analytics-with-bands.png', fullPage: true });

    // Toggle off confidence bands
    const toggle = page.locator('input.toggle-primary').first();
    await toggle.uncheck();

    // Give it a moment to re-render the chart without the bands
    await page.waitForTimeout(1000);

    // Screenshot without confidence bands
    await page.screenshot({ path: 'docs/screenshots/predictive-analytics-without-bands.png', fullPage: true });
  });
});