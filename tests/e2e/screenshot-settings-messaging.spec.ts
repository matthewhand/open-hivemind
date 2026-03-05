import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Messaging Screenshots', () => {
  test('Capture Settings Messaging Page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Navigate to settings messaging page
    await page.goto('/admin/settings?tab=messaging');
    await page.waitForSelector('h5:has-text("Messaging Behavior")');

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-messaging.png', fullPage: true });
  });
});
