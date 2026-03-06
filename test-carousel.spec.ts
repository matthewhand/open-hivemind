import { test, expect } from '@playwright/test';
test('test', async ({ page }) => {
  let errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('http://localhost:3028/#/admin/overview');
  await page.waitForTimeout(10000);
  console.log(errors);
});
