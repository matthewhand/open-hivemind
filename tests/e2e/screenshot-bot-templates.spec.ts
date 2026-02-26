import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Bot Templates Page Screenshots', () => {
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

    // Mock Templates API
    await page.route('/api/bots/templates', async (route) => {
      const templates = [
        {
          id: '1',
          name: 'Support Assistant',
          description: 'A helpful support bot for Discord servers.',
          messageProvider: 'discord',
          persona: 'Support Agent',
          llmProvider: 'openai',
          tags: ['support', 'help'],
          featured: true,
        },
        {
          id: '2',
          name: 'DevOps Monitor',
          description: 'Monitors system alerts and notifies the team.',
          messageProvider: 'slack',
          persona: 'Technical',
          llmProvider: 'anthropic',
          tags: ['devops', 'alerts'],
          featured: false,
        },
        {
          id: '3',
          name: 'Sales Lead',
          description: 'Engages with potential customers and qualifies leads.',
          messageProvider: 'mattermost',
          persona: 'Sales',
          llmProvider: 'ollama',
          tags: ['sales', 'business'],
          featured: false,
        },
         {
          id: '4',
          name: 'General Chat',
          description: 'A general purpose chat bot.',
          messageProvider: 'discord',
          persona: 'Casual',
          llmProvider: 'openai',
          tags: ['chat'],
          featured: false,
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { templates },
        }),
      });
    });
  });

  test('capture Bot Templates page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Bot Templates page
    await page.goto('/admin/bots/templates');

    // Wait for the page to load
    await expect(page.getByText('Bot Templates')).toBeVisible();
    await expect(page.getByText('Support Assistant')).toBeVisible();

    // Wait for everything to settle
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/bot-templates-page.png', fullPage: true });
  });
});
