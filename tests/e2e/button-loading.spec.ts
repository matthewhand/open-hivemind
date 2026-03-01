import { test, expect } from '@playwright/test';
import path from 'path';

test('Check button loading UI visually - AFTER', async ({ page }) => {
  const filePath = path.resolve(process.cwd(), 'src/client/button-mockup.html');
  await page.goto('file://' + filePath);

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/button-loading-after-light.png' });
});
