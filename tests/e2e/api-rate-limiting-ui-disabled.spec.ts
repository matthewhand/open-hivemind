import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('API Rate Limiting UI', () => {
  test('Capture Rate Limiting Section Disabled', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/admin/settings?tab=security');
    await page.waitForSelector('h5:has-text("Security Settings")');

    // Find toggle and uncheck it
    const toggle = page.locator('label:has-text("Enable rate limiting") input');
    await toggle.uncheck();

    const rateLimitingCard = page.locator('h6:has-text("Rate Limiting")').locator('..');
    await rateLimitingCard.screenshot({ path: 'docs/screenshots/api-rate-limiting-disabled-before.png' });
  });
});
