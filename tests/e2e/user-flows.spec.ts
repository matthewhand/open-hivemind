import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupTestWithErrorDetection,
  waitForPageReady,
} from './test-utils';

/**
 * User Flows E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('User Flows', () => {
  test.setTimeout(120000);

  test('complete bot creation flow without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    // Open create modal
    const createBtn = page
      .locator('button')
      .filter({ hasText: /create|new|add/i })
      .first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Fill form
      const nameInput = page.locator('input').first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill('E2E Test Bot');
      }

      // Close modal
      await page.keyboard.press('Escape');
    }
    await page.screenshot({ path: 'test-results/flow-01-bot-creation.png', fullPage: true });

    await assertNoErrors(errors, 'Bot creation flow');
  });

  test('complete navigation flow without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Navigate through main sections
    await navigateAndWaitReady(page, '/admin/overview');
    await navigateAndWaitReady(page, '/admin/bots');
    await navigateAndWaitReady(page, '/admin/config');
    await navigateAndWaitReady(page, '/admin/settings');
    await navigateAndWaitReady(page, '/admin/personas');

    await page.screenshot({ path: 'test-results/flow-02-navigation.png', fullPage: true });
    await assertNoErrors(errors, 'Navigation flow');
  });

  test('complete settings modification flow without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/settings');

    // Interact with settings
    const inputs = page.locator('input:visible');
    if ((await inputs.count()) > 0) {
      const firstInput = inputs.first();
      await firstInput.clear();
      await firstInput.fill('E2E Modified Value');
    }

    await page.screenshot({ path: 'test-results/flow-03-settings.png', fullPage: true });
    await assertNoErrors(errors, 'Settings modification flow');
  });
});
