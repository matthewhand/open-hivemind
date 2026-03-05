import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Config UI Fixes E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Config UI Fixes', () => {
  test.setTimeout(90000);

  test('config page renders without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/config');

    const content = page.locator('main, [class*="content"]').first();
    await expect(content).toBeVisible();
    await page.screenshot({ path: 'test-results/config-ui-01-render.png', fullPage: true });

    await assertNoErrors(errors, 'Config UI render');
  });

  test('config forms work correctly', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/config');

    const inputs = page.locator('input, select, textarea');
    await page.screenshot({ path: 'test-results/config-ui-02-forms.png', fullPage: true });

    await assertNoErrors(errors, 'Config UI forms');
  });
});
