import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Bot Configuration Page Screenshots', () => {
  test('Capture Bot Configuration Page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          "OpenAI": {
            "values": {
              "OPENAI_API_KEY": "sk-123",
              "OPENAI_MODEL": "gpt-4",
              "ENABLE_LOGGING": true
            },
            "schema": {
              "properties": {
                "OPENAI_API_KEY": { "sensitive": true, "format": "string", "doc": "API Key" },
                "OPENAI_MODEL": { "enum": ["gpt-3.5-turbo", "gpt-4"], "format": "string" },
                "ENABLE_LOGGING": { "format": "boolean" }
              }
            }
          }
        }
      });
    });

    await page.goto('/admin/configuration');
    await page.waitForSelector('.collapse'); // Wait for accordion to load
    await page.waitForTimeout(500); // Small delay for rendering

    // Ensure the first one is open
    await page.evaluate(() => {
       const el = document.querySelector('.collapse input[type="radio"], .collapse input[type="checkbox"]');
       if (el) (el as HTMLInputElement).checked = true;
    });

    await page.waitForTimeout(500); // Wait for expansion animation

    await page.screenshot({ path: 'before-fix.png', fullPage: true });
  });
});
