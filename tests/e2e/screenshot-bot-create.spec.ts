import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Bot Create Page Screenshots', () => {
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

    // Mock LLM Status (default is configured)
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [{ id: 'openai-default', name: 'OpenAI GPT-4', type: 'openai' }],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );

    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
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
              },
              {
                key: 'claude-3-opus',
                name: 'Claude 3 Opus',
                provider: 'anthropic',
              },
            ],
          },
        }),
      });
    });

    // Mock Personas
    await page.route('/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'friendly-helper',
            name: 'Friendly Helper',
            description: 'A polite and helpful assistant.',
          },
          {
            id: 'dev-expert',
            name: 'Developer Expert',
            description: 'Expert in software development and debugging.',
          },
        ]),
      });
    });

    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );
  });

  test('capture Bot Create page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Bot Create page
    await page.goto('/admin/bots/create');

    // Wait for the page to load and specific elements to be visible
    await expect(page.getByText('Create New Bot')).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Message Platform' })).toBeVisible();

    // Wait for dynamic content (options in select)
    // We can check if the select has populated options
    // The "Persona" select should have "Friendly Helper"
    await expect(page.getByRole('combobox').filter({ hasText: 'Default Assistant' })).toBeVisible();
    // Or just wait a bit to be safe as animations might happen
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/bot-create-page.png', fullPage: true });
  });
});
