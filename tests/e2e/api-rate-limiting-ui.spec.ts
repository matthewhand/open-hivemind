import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('API Rate Limiting UI', () => {
  test('Capture Rate Limiting Section', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Navigate to security settings page
    await page.goto('/admin/settings?tab=security');

    // Wait for the Security Settings to load
    await page.waitForSelector('h5:has-text("Security Settings")');

    // Screenshot the Rate Limiting card specifically
    const rateLimitingCard = page.locator('h6:has-text("Rate Limiting")').locator('..');
    await rateLimitingCard.screenshot({ path: 'docs/screenshots/api-rate-limiting-before.png' });
  });
});
