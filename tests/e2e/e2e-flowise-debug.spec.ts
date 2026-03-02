import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test('Flowise config forms', async ({ page }) => {
  const errors = await setupTestWithErrorDetection(page);
  await navigateAndWaitReady(page, '/admin/llm-providers');

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/flowise-providers-page.png', fullPage: true });

  // Try to click Add LLM Provider or Add Provider
  const addButton = page.locator('button:has-text("Add")').first();
  if (await addButton.count() > 0) {
    await addButton.click();
    await page.waitForTimeout(1000);

    // Select Flowise tab
    await page.locator('text="Flowise"').first().click().catch(() => null);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/flowise-add-verify.png', fullPage: true });
  } else {
    console.log("Add button not found");
  }

});
