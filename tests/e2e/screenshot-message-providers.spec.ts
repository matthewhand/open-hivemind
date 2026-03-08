import { test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Message Providers Screenshots', () => {
  test('capture message providers page screenshots', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, json: { user: { username: "admin", role: "admin" } } });
    });

    await page.route('**/api/config/message-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: {
            message: [
              {
                key: 'discord-main',
                name: 'Community Discord',
                provider: 'discord',
                config: {
                  token: 'mock-token',
                },
              }
            ],
          },
        }),
      });
    });

    await page.goto('/admin/providers/message');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'docs/screenshots/message-providers-list.png', fullPage: true });
  });
});
