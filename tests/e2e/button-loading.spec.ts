import { test, expect } from '@playwright/test';
import path from 'path';

test('Check button loading UI visually - AFTER', async ({ page }) => {
  const filePath = path.resolve(process.cwd(), 'src/client/button-mockup.html');
  await page.goto('file://' + filePath);

  // Wait for external resources (CSS) to load
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  // Verify buttons are visible before taking screenshot
  const buttons = page.locator('button.btn');
  await expect(buttons.first()).toBeVisible();
  await expect(buttons).toHaveCount(14);

  // Verify loading spinners are present
  const loadingSpinners = page.locator('span.loading-spinner');
  await expect(loadingSpinners).toHaveCount(10);

  // Verify specific button states
  const noLoadButtons = page.locator('button:has-text("No Load")');
  await expect(noLoadButtons).toHaveCount(4);

  await page.screenshot({ path: 'docs/screenshots/button-loading-after-light.png' });
});
