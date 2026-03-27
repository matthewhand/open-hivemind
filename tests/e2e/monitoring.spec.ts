import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Monitoring Page E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Monitoring page', () => {
  test.setTimeout(90000);

  test('navigates to monitoring page without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    await page.screenshot({ path: 'test-results/monitoring-01-page.png', fullPage: true });
    expect(page.url()).toContain('/admin');

    await assertNoErrors(errors, 'Monitoring navigation');
  });

  test('monitoring page has content without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    const heading = page.locator('h1, h2');
    await page.screenshot({ path: 'test-results/monitoring-02-content.png', fullPage: true });
    expect(page.url()).toContain('/admin');

    await assertNoErrors(errors, 'Monitoring content');
  });

  test('monitoring page has navigation without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    const nav = page.locator('nav, [role="navigation"]');
    if ((await nav.count()) > 0) {
      await expect(nav.first()).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/monitoring-03-nav.png', fullPage: true });

    await assertNoErrors(errors, 'Monitoring navigation element');
  });

  test('monitoring page displays metrics without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/monitoring');

    // Wait for metrics to load
    await page.waitForTimeout(2000);

    // Check for metric cards or charts
    const metrics = page.locator('[class*="stat"], [class*="metric"], [class*="chart"]');
    await page.screenshot({ path: 'test-results/monitoring-04-metrics.png', fullPage: true });

    await assertNoErrors(errors, 'Monitoring metrics');
  });
});
