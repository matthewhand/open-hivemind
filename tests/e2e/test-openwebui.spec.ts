import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('OpenWebUI missing from ProviderConfigModal', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/admin/bots');

  // Wait for bots to load
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: 'before-fix-bots-page.png' });
});
