import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Bot Lifecycle E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Bot Lifecycle', () => {
  test.setTimeout(90000);

  test('can navigate bot lifecycle without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    // Start/stop buttons
    const actionBtn = page.locator('button:has-text("Start"), button:has-text("Stop")').first();
    if ((await actionBtn.count()) > 0) {
      await page.screenshot({ path: 'test-results/bot-lifecycle-01-actions.png', fullPage: true });
    }

    await assertNoErrors(errors, 'Bot lifecycle navigation');
  });

  test('shows bot status indicators without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const statusBadges = page.locator('[class*="badge"], [class*="status"]');
    await page.screenshot({ path: 'test-results/bot-lifecycle-02-status.png', fullPage: true });

    await assertNoErrors(errors, 'Bot status display');
  });
});
