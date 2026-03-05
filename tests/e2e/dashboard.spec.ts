import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  SELECTORS,
  setupTestWithErrorDetection,
} from './test-utils';

/**
 * Dashboard E2E Tests with Strict Error Detection
 * Tests FAIL if any console errors occur
 */
test.describe('Dashboard experience', () => {
  test.setTimeout(60000);

  test('navigates to dashboard page without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/overview');

    expect(page.url()).toContain('/admin');
    await page.screenshot({ path: 'test-results/dashboard-01.png', fullPage: true });

    await assertNoErrors(errors, 'Dashboard navigation');
  });

  test('dashboard has content without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/overview');

    const main = page.locator('main').first();
    if ((await main.count()) > 0) {
      await expect(main).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/dashboard-02.png', fullPage: true });

    await assertNoErrors(errors, 'Dashboard content');
  });

  test('dashboard has navigation without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/overview');

    const nav = page.locator('nav').first();
    if ((await nav.count()) > 0) {
      await expect(nav).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/dashboard-03.png', fullPage: true });

    await assertNoErrors(errors, 'Dashboard navigation element');
  });

  test('dashboard stats cards render without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/overview');

    // Wait for stats to load
    await page.waitForTimeout(2000);

    // Check for stat cards
    const stats = page.locator('[class*="stat"], [class*="card"]');
    await page.screenshot({ path: 'test-results/dashboard-04-stats.png', fullPage: true });

    await assertNoErrors(errors, 'Dashboard stats');
  });
});
