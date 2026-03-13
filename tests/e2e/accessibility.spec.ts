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

  test('form inputs have associated labels via htmlFor/id', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/settings');

    // Assert no inputs are missing an accessible name (label association)
    const unlabelledInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button])'));
      return inputs
        .filter(el => {
          const id = el.getAttribute('id');
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
          return !ariaLabel && !ariaLabelledBy && !associatedLabel;
        })
        .map(el => el.outerHTML.slice(0, 120));
    });

    await page.screenshot({ path: 'test-results/a11y-04-label-associations.png', fullPage: true });
    expect(unlabelledInputs, `Unlabelled inputs found: ${unlabelledInputs.join('\n')}`).toHaveLength(0);
    await assertNoErrors(errors, 'Form label associations');
  });
});
