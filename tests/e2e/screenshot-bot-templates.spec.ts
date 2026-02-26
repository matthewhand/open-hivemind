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
    await page.route('/api/personas', async (route) => {
        await route.fulfill({ status: 200, json: [] });
    });


    // Mock Templates API (using the correct endpoint /api/bot-config/templates and object structure)
    await page.route('/api/bot-config/templates', async (route) => {
      const templates = {
        discord_basic: {
          name: 'Helpful Assistant',
          description: 'A general purpose assistant that can help with various tasks.',
          messageProvider: 'discord',
          llmProvider: 'openai',
          persona: 'Helpful', // Injected for frontend filtering test
          tags: ['general', 'assistant'],
        },
        slack_coder: {
          name: 'Code Reviewer',
          description: 'Expert in analyzing code and suggesting improvements.',
          messageProvider: 'slack',
          llmProvider: 'anthropic',
          persona: 'Technical',
          tags: ['coding', 'dev'],
        },
        telegram_fun: {
          name: 'Fun Chatbot',
          description: 'A witty bot for casual conversations.',
          messageProvider: 'telegram',
          llmProvider: 'local',
          persona: 'Witty',
          tags: ['fun', 'social'],
        },
        mattermost_support: {
           name: 'Customer Support',
           description: 'Handles customer queries efficiently.',
           messageProvider: 'mattermost',
           llmProvider: 'openai',
           persona: 'Professional',
           tags: ['support', 'business'],
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { templates }
        }),
      });
    });
  });

  test('capture Bot Templates page screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Templates page
    await page.goto('/admin/bots/templates');

    // Wait for the page to load and content to be visible
    await expect(page.getByText('Bot Templates')).toBeVisible();
    await expect(page.getByText('Helpful Assistant')).toBeVisible();

    // Wait a bit for images/badges to render
    await page.waitForTimeout(500);

    // Take screenshot of the full list
    await page.screenshot({ path: 'docs/screenshots/bot-templates-page.png', fullPage: true });

    // Test Interaction: Search for 'Code'
    const searchInput = page.getByPlaceholder('Search templates...');
    await searchInput.fill('Code');
    await page.waitForTimeout(300);
    await expect(page.getByText('Code Reviewer')).toBeVisible();
    await expect(page.getByText('Helpful Assistant')).toBeHidden();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);
    await expect(page.getByText('Helpful Assistant')).toBeVisible();

    // Test Interaction: Filter by Platform 'Discord'
    const platformSelect = page.locator('select').nth(0); // First select is Platform
    await platformSelect.selectOption('discord'); // Use value (which is 'discord' from the data)

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // Verify filtering
    await expect(page.getByText('Helpful Assistant')).toBeVisible(); // Discord bot
    await expect(page.getByText('Code Reviewer')).toBeHidden(); // Slack bot
  });
});
