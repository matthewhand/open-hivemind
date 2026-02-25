import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Message Platforms Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Message Profiles list
    await page.route('/api/config/message-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            profiles: {
              message: [
                {
                  key: 'discord-main',
                  name: 'Discord Production',
                  provider: 'discord',
                  description: 'Main Discord bot for the community server.',
                  config: { token: 'mock-token', applicationId: 'mock-app-id' },
                },
                {
                  key: 'slack-dev',
                  name: 'Slack Dev',
                  provider: 'slack',
                  description: 'Slack bot for internal team testing.',
                  config: { appToken: 'mock-app-token', botToken: 'mock-bot-token' },
                },
              ],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('capture message platforms page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Message Platforms page
    await page.goto('/admin/providers/message');

    // Wait for the page to load and profiles to be displayed
    await expect(page.getByText('Discord Production')).toBeVisible();

    // Take screenshot of the page
    await page.screenshot({ path: 'docs/screenshots/message-providers-page.png', fullPage: true });

    // Click "Configure Discord" button (to show modal)
    // We assume the button text is "Configure Discord" as per current UI
    await page.getByRole('button', { name: 'Configure Discord' }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box').filter({ hasText: 'Add Message Provider' });
    await expect(modal).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/message-provider-modal.png' });
  });
});
