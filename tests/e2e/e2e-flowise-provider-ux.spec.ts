import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Flowise Provider UX Check', () => {
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
  });

  test('check if Flowise is available in LLM Providers modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/llm');
    await expect(page.locator('.card').first()).toBeVisible();
    await page.getByRole('button', { name: 'Create Profile' }).first().click();
    await expect(page.locator('.modal-box')).toBeVisible();
    await page.screenshot({ path: 'test-results/flowise-add-profile-modal-check.png' });

    // Click Flowise tab
    await page.getByRole('tab', { name: /Flowise/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/flowise-form.png' });
  });
});
