import { expect, test } from '@playwright/test';

test.describe('Bot Activity Screenshots', () => {
  test('Capture Bot Activity Logs', async ({ page }) => {
    // Intercept APIs
    await page.route('/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              id: 'bot-1',
              name: 'Screenshot Bot',
              status: 'online',
              provider: 'discord',
              llmProfile: 'openai',
            },
          ],
        },
      });
    });

    await page.route('/api/bots/bot-1/activity?limit=*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          activity: [
            {
              id: 'log-1',
              timestamp: new Date().toISOString(),
              action: 'message_received',
              details: 'Received user message "Hello"',
            },
            {
              id: 'log-2',
              timestamp: new Date().toISOString(),
              action: 'message_sent',
              details: 'Replied "Hi there!"',
            },
          ],
        },
      });
    });

    // Go to Bots page
    await page.goto('/bots');

    // Screenshot
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'docs/screenshots/bots-page.png', fullPage: true });
  });
});
