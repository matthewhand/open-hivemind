import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Message Providers Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock Message Profiles
    await page.route('/api/config/message-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: {
            message: [
              {
                key: 'discord-prod',
                name: 'Production Discord',
                provider: 'discord',
                description: 'Main server bot for customer support',
                config: { token: '*****' }
              },
              {
                key: 'slack-internal',
                name: 'Internal Slack',
                provider: 'slack',
                description: 'Internal team notifications',
                config: { token: '*****' }
              }
            ]
          }
        })
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('/api/config', async (route) => route.fulfill({ status: 200, json: { bots: [] } }));
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/health/detailed', async (route) => route.fulfill({ status: 200, json: { status: 'ok' } }));
    await page.route('/api/webui/system-status', async (route) => route.fulfill({ status: 200, json: { bots: { total: 5, active: 3 } } }));
  });

  test('capture Message Providers page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/message');

    // Wait for header
    await expect(page.getByRole('heading', { name: 'Message Platforms' })).toBeVisible();

    // Wait for cards to load
    await expect(page.getByText('Production Discord')).toBeVisible();
    await expect(page.getByText('Internal Slack')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/message-providers-page.png', fullPage: true });
  });
});
