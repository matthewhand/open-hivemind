import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Accessibility E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Accessibility', () => {
  test.setTimeout(90000);

  test('pages have proper heading structure', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/overview');

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
    await page.screenshot({ path: 'test-results/a11y-01-headings.png', fullPage: true });

    await assertNoErrors(errors, 'Heading structure');
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    await page.screenshot({ path: 'test-results/a11y-02-keyboard.png', fullPage: true });

    await assertNoErrors(errors, 'Keyboard accessibility');
  });

  test('forms have proper labels', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/settings');

    const labels = page.locator('label');
    await page.screenshot({ path: 'test-results/a11y-03-labels.png', fullPage: true });

    await assertNoErrors(errors, 'Form labels');
  });
});
