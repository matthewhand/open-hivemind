import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('Visual Proof: Barrel Export Audit and Tree-Shaking Optimisation', async ({ page }) => {
  // Navigate to Dashboard
  await page.goto('http://localhost:3028/');
  await page.waitForLoadState('networkidle');

  // Verify dashboard loaded properly and components rendered
  await expect(page.locator('text=Open Hivemind')).toBeVisible();

  // Save baseline screenshot
  await page.screenshot({ path: '.jules/before-barrel-export.png', fullPage: true });
});
