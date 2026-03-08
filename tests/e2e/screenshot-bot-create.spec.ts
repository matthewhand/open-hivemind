import { test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Bot Creation Screenshots', () => {
  test('Capture Bot Creation Wizard', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API requests
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { profiles: { llm: [{ id: 'gpt-4', name: 'GPT-4' }] } } });
    });

    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { guards: [] } });
    });

    await page.route('**/api/bots', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, json: { user: { username: "admin", role: "admin" } } });
    });

    // Navigate to Bots page
    await page.goto('/admin/bots');
    await page.waitForTimeout(2000);

    // Screenshot Step 1
    await page.screenshot({ path: 'docs/screenshots/bot-create-step1.png' });

  });
});
