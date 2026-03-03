import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('Flowise config forms', async ({ page }) => {
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
        configured: true,
        providers: [{ id: 'openai-default', name: 'OpenAI GPT-4', type: 'openai' }],
        botsMissingLlmProvider: [],
        hasMissing: false,
        libraryStatus: {},
      },
    })
  );
  await page.route('/api/config/global', async (route) =>
    route.fulfill({
      status: 200,
      json: { _userSettings: { values: { webuiIntelligenceProvider: 'gpt-4-turbo' } } },
    })
  );

  // Mock LLM Profiles
  await page.route('/api/config/llm-profiles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: {
          llm: [],
        },
      }),
    });
  });

  await page.route('/api/admin/guard-profiles', async (route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('/api/demo/status', async (route) =>
    route.fulfill({ status: 200, json: { enabled: false } })
  );
  await page.route('/api/csrf-token', async (route) =>
    route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
  );

  // Navigate to LLM Providers page
  await page.goto('/admin/providers/llm');

  // Click "Create Profile" button
  await page.getByRole('button', { name: 'Create Profile' }).click();

  // Wait for modal to be visible
  await expect(page.locator('.modal-box')).toBeVisible();

  // click flowise tab
  await page.getByRole('tab', { name: 'Flowise' }).click();

  await page.screenshot({ path: 'test-results/flowise-config-add-modal.png' });

});
