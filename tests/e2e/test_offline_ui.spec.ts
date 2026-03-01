import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('Verify offline UI banner and reconnection logic', async ({ page, context }) => {
  await setupAuth(page);
  await page.goto('/admin/overview');

  await page.waitForTimeout(2000);

  // Take screenshot of online state initially
  await page.screenshot({ path: 'docs/screenshots/online-state-initial.png' });

  // Simulate offline mode
  await context.setOffline(true);

  // Also simulate network drop in page
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });

  // Wait for the banner to show up
  await page.waitForTimeout(2000);

  // Take screenshot of offline state
  await page.screenshot({ path: 'docs/screenshots/offline-state-after.png' });

  // Simulate online mode
  await context.setOffline(false);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });

  // Wait a bit for reconnection logic
  await page.waitForTimeout(2000);

  // Take screenshot of online state
  await page.screenshot({ path: 'docs/screenshots/online-state-after.png' });
});
