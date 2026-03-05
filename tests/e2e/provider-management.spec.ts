import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Provider Management E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Provider Management', () => {
  test.setTimeout(90000);

  test('displays provider management page without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/config');

    await page.screenshot({ path: 'test-results/provider-01-page.png', fullPage: true });
    await assertNoErrors(errors, 'Provider management page');
  });

  test('can view provider details without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/config');

    const tabs = page.locator('[role="tab"], .tab');
    if ((await tabs.count()) > 0) {
      await tabs.first().click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'test-results/provider-02-details.png', fullPage: true });

    await assertNoErrors(errors, 'Provider details');
  });

  test('provider forms work without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/config');

    const inputs = page.locator('input, select');
    await page.screenshot({ path: 'test-results/provider-03-forms.png', fullPage: true });

    await assertNoErrors(errors, 'Provider forms');
  });
});
