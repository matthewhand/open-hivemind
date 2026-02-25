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
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Bot Templates list
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
                name: 'Customer Support Agent',
                description: 'A friendly agent designed to handle customer inquiries and troubleshooting.',
                messageProvider: 'discord',
                persona: 'Support Hero',
                llmProvider: 'openai',
                tags: ['support', 'customer-service', 'friendly'],
                featured: true
              },
              {
                id: '2',
                name: 'Code Assistant',
                description: 'Helps with coding tasks, debugging, and explaining complex concepts.',
                messageProvider: 'slack',
                persona: 'Dev Buddy',
                llmProvider: 'anthropic',
                tags: ['development', 'coding', 'technical'],
                featured: true
              },
              {
                id: '3',
                name: 'Creative Writer',
                description: 'Assists with brainstorming, story writing, and creative content generation.',
                messageProvider: 'mattermost',
                persona: 'The Bard',
                llmProvider: 'openai',
                tags: ['creative', 'writing', 'content'],
                featured: false
              },
              {
                id: '4',
                name: 'Team Facilitator',
                description: 'Helps organize meetings, summarize discussions, and track action items.',
                messageProvider: 'slack',
                persona: 'Organizer',
                llmProvider: 'google',
                tags: ['productivity', 'management'],
                featured: false
              }
            ]
          }
        }),
      });
    });
  });

  test('capture bot templates page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Bot Templates page
    await page.goto('/admin/bots/templates');

    // Wait for the page to load and templates to be displayed
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByText('Customer Support Agent')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/bot-templates-list.png', fullPage: true });
  });
});
