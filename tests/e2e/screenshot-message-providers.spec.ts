import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Message Providers Screenshots', () => {
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
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Message Profiles
    await page.route('/api/config/message-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profiles: {
              message: [
                {
                  key: 'community-discord',
                  name: 'Community Discord',
                  provider: 'discord',
                  description: 'Main community server for general chat',
                  config: {
                    clientId: '1234567890',
                  },
                },
                {
                  key: 'support-slack',
                  name: 'Support Slack',
                  provider: 'slack',
                  description: 'Internal support workspace',
                  config: {},
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

  test('capture message providers page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Message Providers page
    await page.goto('/admin/providers/message');

    // Wait for the page to load and profiles to be displayed
    // Look for the "Configured Platforms" header or one of the mock profiles
    await expect(page.getByText('Configured Platforms')).toBeVisible();
    await expect(page.getByText('Community Discord')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/message-providers-list.png', fullPage: true });

    // Click "Configure Discord" button
    // The text in the button is "Configure Discord" based on `Configure {config.displayName}`
    await page.getByRole('button', { name: 'Configure Discord' }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Add Message Provider')).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/message-add-provider-modal.png' });
  });
});
