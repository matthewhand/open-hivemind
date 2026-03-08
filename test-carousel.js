const { test, expect } = require('@playwright/test');
test('test', async ({ page }) => {
  await page.goto('http://localhost:3028/#/dashboard');
  await page.waitForTimeout(10000);
});
