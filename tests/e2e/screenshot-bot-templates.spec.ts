import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Bot Templates Screenshots', () => {
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

    // Mock Bot Templates
    await page.route('/api/bots/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            templates: [
              {
                id: '1',
                name: 'Python Expert',
                description: 'A coding assistant specialized in Python development, debugging, and best practices.',
                messageProvider: 'discord',
                persona: 'Developer',
                llmProvider: 'OpenAI GPT-4',
                tags: ['coding', 'python', 'help'],
                featured: true,
              },
              {
                id: '2',
                name: 'Friendly Greeter',
                description: 'Welcomes new users and answers basic questions about the community.',
                messageProvider: 'slack',
                persona: 'Helper',
                llmProvider: 'Claude 3',
                tags: ['community', 'welcome'],
                featured: false,
              },
              {
                id: '3',
                name: 'News Summarizer',
                description: 'Digests daily news and posts summaries to a channel.',
                messageProvider: 'mattermost',
                persona: 'Analyst',
                llmProvider: 'Gemini Pro',
                tags: ['news', 'summary'],
                featured: false,
              },
            ],
          },
        }),
      });
    });
  });

  test('capture Bot Templates page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Bot Templates page
    await page.goto('/admin/bots/templates');

    // Wait for the page to load and templates to be displayed
    // Waiting for a card or specific text
    await expect(page.locator('.card').first()).toBeVisible();

    // Wait for header
    await expect(page.getByRole('heading', { name: 'Bot Templates' })).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/bot-templates-list.png', fullPage: true });

    // Mock filtering (optional, but good to verify it works visually if we implement it)
    // For now, just the main list is enough for docs.
  });
});
