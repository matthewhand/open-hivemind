import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('LLM Providers Screenshots', () => {
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
          defaultProviders: [{ id: 'openai-default', name: 'OpenAI GPT-4', type: 'openai' }],
          botsMissingLlmProvider: [],
          hasMissing: false,
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
              },
              {
                key: 'claude-3-opus',
                name: 'Claude 3 Opus',
                provider: 'anthropic',
                config: {
                  apiKey: 'sk-ant-********************',
                  model: 'claude-3-opus-20240229',
                },
              },
              {
                key: 'local-mistral',
                name: 'Local Mistral',
                provider: 'ollama',
                config: {
                  baseUrl: 'http://localhost:11434',
                  model: 'mistral:latest',
                },
              },
            ],
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

  test('capture LLM providers page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to LLM Providers page
    await page.goto('/admin/providers/llm');

    // Wait for the page to load and profiles to be displayed
    // We look for the "Total Profiles" stat card or the first profile card
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GPT-4 Turbo' }).first()).toBeVisible();

    // Wait for stats animation to complete (we expect 3 profiles and 3 types)
    await expect(page.locator('.card').filter({ hasText: 'Total Profiles' }).getByText('3')).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Provider Types' }).getByText('3')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/llm-providers-list.png', fullPage: true });

    // Click "Create Profile" button
    await page.getByRole('button', { name: 'Create Profile' }).click();

    // Wait for modal to be visible
    await expect(page.locator('.modal-box')).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/llm-add-profile-modal.png' });
  });
});
