import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots - Messaging Tab', () => {
  test('Capture Messaging Settings Page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock the global config so we have a consistent state
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: {
            values: {
              MESSAGE_ONLY_WHEN_SPOKEN_TO: true,
              MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: false,
              MESSAGE_UNSOLICITED_ADDRESSED: true,
              MESSAGE_UNSOLICITED_UNADDRESSED: false,
              MESSAGE_UNSOLICITED_BASE_CHANCE: 0.05,
              MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: 120000,
              MESSAGE_ADD_USER_HINT: true,
              MESSAGE_SEMANTIC_RELEVANCE_ENABLED: true,
              MESSAGE_SEMANTIC_RELEVANCE_BONUS: 20
            }
          }
        })
      });
    });

    // 1. Navigate to default settings page
    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-general.png' });

    // 2. Navigate to Messaging tab
    await page.click('text="Messaging"');

    // Check if the semantic text is present
    const isSemanticTextPresent = await page.locator('text="Semantic Search Relevance"').isVisible();
    console.log("Is semantic search text present?", isSemanticTextPresent);

    await page.waitForTimeout(2000); // Give it some time to render

    // Screenshot what we have so far
    await page.screenshot({ path: 'docs/screenshots/settings-messaging-debug.png', fullPage: true });

  });
});
