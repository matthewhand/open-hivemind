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

    // Use filter to be specific about which 'Message Platform' text we want (the heading)
    await expect(page.locator('h3').filter({ hasText: 'Message Platform' })).toBeVisible();

    // Verify Platform Buttons are visible
    await expect(page.getByText('Discord', { exact: true })).toBeVisible();
    await expect(page.getByText('Slack', { exact: true })).toBeVisible();

    // Verify Default Persona Preview
    await expect(page.getByText('A helpful, general-purpose AI assistant')).toBeVisible();

    // Verify LLM Provider Select is visible
    const llmSelect = page.getByRole('combobox').filter({ hasText: 'Use System Default' });
    await expect(llmSelect).toBeVisible();

    // Optional: Select a different persona to show dynamic update (and capture that state)
    // For screenshot purposes, maybe select "Friendly Helper" to show non-default state?
    // Let's stick to default for a clean "initial state" look, but ensure the preview is there.

    // Wait for animations to settle
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/bot-create-page.png', fullPage: true });
  });
});
