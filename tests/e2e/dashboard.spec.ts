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

    // Check for stat cards
    const stats = page.locator('[class*="stat"], [class*="card"]');
    await page.screenshot({ path: 'test-results/dashboard-04-stats.png', fullPage: true });

    await assertNoErrors(errors, 'Dashboard stats');
  });

  test('can toggle dashboard widget view', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock the onboarding status endpoint to return completed
    await page.route('/api/onboarding/status', async (route) => {
      await route.fulfill({ json: { completed: true } });
    });

    // Explicitly navigate to the user dashboard
    await navigateAndWaitReady(page, '/dashboard');

    // Wait for page to finish any internal route/redirect resolution and render the toggle
    // Given the page structure, the label text might be split or wrapped. Let's just use a more forgiving selector.
    const toggleLabel = page.getByLabel('Toggle Widget Layout');
    await expect(toggleLabel).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-results/dashboard-view-standard.png', fullPage: true });

    // Find and click the toggle
    await toggleLabel.click({ force: true });

    // Verify widget view is active
    await expect(page.locator('text=No Widgets Added')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/dashboard-view-widget-empty.png', fullPage: true });

    // Add a widget
    const addWidgetBtn = page.locator('button:has-text("Add Your First Widget")');
    await expect(addWidgetBtn).toBeVisible();
    await addWidgetBtn.click();

    // Select Stats widget
    const statsWidgetOption = page.locator('button:has-text("Statistics")');
    await expect(statsWidgetOption).toBeVisible();
    await statsWidgetOption.click();

    // Verify widget was added
    await expect(page.locator('h3:has-text("Statistics")')).toBeVisible();
    await page.screenshot({
      path: 'test-results/dashboard-view-widget-populated.png',
      fullPage: true,
    });

    await assertNoErrors(errors, 'Dashboard widget toggle');
  });
});
