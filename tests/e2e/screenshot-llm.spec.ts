import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('LLM Providers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock LLM Status
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          configured: true,
          defaultConfigured: true,
          defaultProviders: [{ id: 'gpt-4', name: 'GPT-4', type: 'openai' }],
          libraryStatus: {
            openai: { installed: true, package: 'openai' },
            anthropic: { installed: true, package: '@anthropic-ai/sdk' }
          },
        },
      })
    );

    // Mock Global Config
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          _userSettings: {
            values: { webuiIntelligenceProvider: 'openai-gpt4' }
          }
        }
      })
    );

    // Mock LLM Profiles
    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          profiles: {
            llm: [
              {
                key: 'openai-gpt4',
                name: 'GPT-4 Turbo',
                provider: 'openai',
                config: {
                  apiKey: 'sk-........................',
                  model: 'gpt-4-turbo-preview',
                  temperature: 0.7
                }
              },
              {
                key: 'claude-3-opus',
                name: 'Claude 3 Opus',
                provider: 'anthropic',
                config: {
                  apiKey: 'sk-ant-......................',
                  model: 'claude-3-opus-20240229',
                  maxTokens: 4096
                }
              },
              {
                key: 'local-mistral',
                name: 'Local Mistral',
                provider: 'ollama',
                config: {
                  baseUrl: 'http://localhost:11434',
                  model: 'mistral:latest'
                }
              }
            ]
          }
        },
      })
    );
  });

  test('capture LLM providers page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to LLM Providers page
    await page.goto('/admin/providers/llm');

    // Wait for the page to load and profiles to be displayed
    // We look for a profile card by heading to be specific
    await expect(page.getByRole('heading', { name: 'GPT-4 Turbo' })).toBeVisible();

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
