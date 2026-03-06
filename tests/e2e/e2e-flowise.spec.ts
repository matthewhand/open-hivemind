import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test('Flowise config forms', async ({ page }) => {
  // Mock successful authentication check
  await page.route('/api/auth/check', async (route) => {
    await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
  });

  // Try to click edit on flowise if it exists
  const flowiseCard = page.locator('text="Flowise"');
  if (await flowiseCard.count() > 0) {
      await flowiseCard.first().locator('..').locator('..').locator('button:has-text("Edit")').click().catch(() => null);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/flowise-config-verify.png', fullPage: true });
  }
});
