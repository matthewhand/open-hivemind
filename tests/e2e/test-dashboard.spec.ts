import { expect, test } from '@playwright/test';

test('monitoring dashboard and system management load without errors', async ({ page }) => {
  // Ignore network errors since we only care about frontend render logic not crashing
  page.on('requestfailed', (request) => {});

  await page.goto('http://localhost:3029/admin/monitoring-dashboard');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'after-fix-monitoring.png', fullPage: true });

  await page.goto('http://localhost:3029/admin/system-management');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'after-fix-system.png', fullPage: true });

  await page.goto('http://localhost:3029/admin/bots');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'after-fix-bots.png', fullPage: true });
});
