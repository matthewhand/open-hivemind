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

    // Mock Templates API
    await page.route('/api/bot-config/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            templates: {
              'discord-helper': {
                name: 'Helpful Assistant',
                description: 'A general purpose assistant for Discord servers.',
                messageProvider: 'discord',
                llmProvider: 'openai',
                persona: 'Helpful',
                tags: ['general', 'assistant'],
              },
              'slack-coder': {
                name: 'Code Reviewer',
                description: 'Expert in analyzing code snippets and suggesting improvements.',
                messageProvider: 'slack',
                llmProvider: 'anthropic',
                persona: 'Technical',
                tags: ['coding', 'dev'],
              },
              'telegram-fun': {
                name: 'Fun Chatbot',
                description: 'A witty bot for casual conversations on Telegram.',
                messageProvider: 'telegram',
                llmProvider: 'local',
                persona: 'Witty',
                tags: ['fun', 'social'],
              },
            }
          }
        }),
      });
    });
  });

  test('capture Bot Templates page interactions', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to Templates page
    await page.goto('/admin/bots/templates');

    // Wait for the page content
    await expect(page.getByText('Bot Templates')).toBeVisible();
    await expect(page.getByText('Helpful Assistant')).toBeVisible();

    // 1. Capture Initial State (All Templates)
    await page.screenshot({ path: 'docs/screenshots/bot-templates-page.png', fullPage: true });

    // 2. Test Filter Interaction (Click 'Discord' pill)
    // Note: The text on the button might be 'Discord' (capitalized)
    await page.getByRole('button', { name: 'Discord', exact: true }).click();

    // Wait for filter
    await expect(page.getByText('Helpful Assistant')).toBeVisible();
    await expect(page.getByText('Code Reviewer')).toBeHidden();

    // 3. Test Preview Modal
    // Click the eye icon (Preview) on the visible card
    await page.locator('.card').first().getByRole('button', { name: 'Preview Configuration' }).click();

    // Verify Modal
    await expect(page.getByText('Preview: Helpful Assistant')).toBeVisible();
    await expect(page.locator('.mockup-code')).toBeVisible();

    // Capture Modal State
    await page.screenshot({ path: 'docs/screenshots/bot-templates-modal.png' });

    // Close Modal
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByText('Preview: Helpful Assistant')).toBeHidden();

    // 4. Clear Filters
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page.getByText('Code Reviewer')).toBeVisible();
  });
});
