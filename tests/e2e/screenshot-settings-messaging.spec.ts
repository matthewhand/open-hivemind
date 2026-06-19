import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Messaging Screenshots', () => {
  test('Capture Settings Messaging Page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
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
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    // Navigate to settings messaging page
    // Messaging settings moved from /admin/settings?tab=messaging to the
    // Message Providers page settings tab (SystemSettings flags the old path stale).
    await page.goto('/admin/message?tab=settings');
    await page.getByRole('heading', { name: 'Messaging Behavior' }).waitFor({ state: 'visible' });

    // Screenshot initial state
    await page.screenshot({ path: 'docs/screenshots/settings-messaging.png', fullPage: true });
  });
});
