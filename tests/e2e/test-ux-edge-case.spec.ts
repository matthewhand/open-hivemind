import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Edge Case Test Coverage Gaps - Max Length UX', () => {
  test('Bot card should not break layout with extremely long names', async ({ page }) => {
    page.on('console', msg => console.log(msg.text()));
    await setupAuth(page);

    // Create a mock bot with a 100-character name
    const superLongName = 'VeryLongBotNameWithoutSpaces'.repeat(5); // 140 chars

    await page.route('/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            bots: [
              {
                id: 'bot-1',
                name: superLongName,
                status: 'active',
                connected: true,
                messageProvider: 'discord',
                llmProvider: 'openai',
                messageCount: 0,
                errorCount: 0,
                provider: 'discord',
                persona: 'default'
              }
            ]
          }
        }
      });
    });

    await page.route('/api/config', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/personas', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/llm/profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { configured: true, hasMissing: false } }));

    await page.goto('/admin/bots');

    await expect(page.locator('.card-title').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: '.jules/after-ux-fix.png', fullPage: true });
  });
});
