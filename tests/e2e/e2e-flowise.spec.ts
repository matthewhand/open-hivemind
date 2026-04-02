import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test('Flowise config forms', async ({ page }) => {
  const errors = await setupTestWithErrorDetection(page);
  await navigateAndWaitReady(page, '/admin/llm-providers');

  // Try to click edit on flowise if it exists
  const flowiseCard = page.locator('text="Flowise"');
  if ((await flowiseCard.count()) > 0) {
    await flowiseCard
      .first()
      .locator('..')
      .locator('..')
      .locator('button:has-text("Edit")')
      .click()
      .catch(() => null);
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'test-results/flowise-config-verify.png', fullPage: true });
  }
});
