import { test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('LLM Providers Screenshots', () => {
  test('capture LLM providers page screenshots', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, json: { user: { username: "admin", role: "admin" } } });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: {
            llm: [
              {
                key: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                provider: 'openai',
                config: {
                  apiKey: 'sk-proj-********************',
                  model: 'gpt-4-turbo-preview',
                  temperature: 0.7,
                },
              }
            ],
          },
        }),
      });
    });

    await page.goto('/admin/providers/llm');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'docs/screenshots/llm-providers-list.png', fullPage: true });
  });
});
