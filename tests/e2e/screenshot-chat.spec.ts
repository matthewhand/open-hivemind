import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Chat Monitor Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    // Common mocks
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          configured: true,
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

    // Mock Bots List
    await page.route('/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 'bot-1',
            name: 'Support Bot',
            status: 'active',
            connected: true,
            messageProvider: 'discord',
            llmProvider: 'openai',
            messageCount: 150,
            errorCount: 0,
            provider: 'discord',
          },
          {
            id: 'bot-2',
            name: 'Dev Assistant',
            status: 'active',
            connected: false,
            messageProvider: 'slack',
            llmProvider: 'anthropic',
            messageCount: 42,
            errorCount: 2,
            provider: 'slack',
          },
        ],
      });
    });

    // Mock Bot History
    await page.route('/api/bots/*/history*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            history: [
              {
                id: 'msg-1',
                content: 'Hi, I have a question about the advanced settings.',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                author: {
                  id: 'user-1',
                  username: 'Alice',
                  bot: false,
                  avatar: 'https://ui-avatars.com/api/?name=Alice',
                },
              },
              {
                id: 'msg-2',
                content:
                  'Hello Alice! I can certainly help you with that. Which settings are you referring to?',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60).toISOString(),
                author: { id: 'bot-1', username: 'Support Bot', bot: true },
              },
              {
                id: 'msg-3',
                content: 'Previous conversation history has been summarized due to length.',
                createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                author: { id: 'system', username: 'System', role: 'system', bot: false },
              },
              {
                id: 'msg-4',
                content:
                  'I see. For the LLM provider configuration, you need to set the API key first.',
                createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                author: { id: 'bot-1', username: 'Support Bot', bot: true },
              },
              {
                id: 'msg-5',
                content: 'Got it, thanks! One more thing, how do I change the persona?',
                createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
                author: {
                  id: 'user-1',
                  username: 'Alice',
                  bot: false,
                  avatar: 'https://ui-avatars.com/api/?name=Alice',
                },
              },
              {
                id: 'msg-6',
                content:
                  'You can update the persona in the Bot Settings tab. Just look for the "Persona" field.',
                createdAt: new Date(Date.now() - 1000 * 30).toISOString(),
                author: { id: 'bot-1', username: 'Support Bot', bot: true },
              },
              {
                id: 'msg-5',
                content: 'Make sure it is valid and has the correct permissions.',
                createdAt: new Date(Date.now() - 1000 * 60 * 26.5).toISOString(),
                author: { id: 'bot-1', username: 'Support Bot', bot: true },
              },
              {
                id: 'msg-6',
                content: 'Ah, I see. I was using the wrong token. It works now!',
                createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
                author: {
                  id: 'user-1',
                  username: 'Alice',
                  bot: false,
                  avatar: 'https://ui-avatars.com/api/?name=Alice',
                },
              },
              {
                id: 'msg-7',
                content: 'Great! Is there anything else I can help you with?',
                createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
                author: { id: 'bot-1', username: 'Support Bot', bot: true },
              },
              {
                id: 'msg-8',
                content: 'No, that is all. Thanks!',
                createdAt: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
                author: {
                  id: 'user-1',
                  username: 'Alice',
                  bot: false,
                  avatar: 'https://ui-avatars.com/api/?name=Alice',
                },
              },
            ],
          },
        },
      });
    });
  });

  test('capture Chat Monitor screenshots', async ({ page }) => {
    await page.goto('/admin/chat');

    // Wait for bots to load
    await expect(page.getByText('Active Bots')).toBeVisible();

    // Select the first bot to show history
    await page.click('button:has-text("Support Bot")');

    // Wait for chat to load
    await expect(
      page.getByText('Hi, I have a question about the advanced settings.')
    ).toBeVisible();

    // Verify rollup message is visible
    await expect(
      page.getByText('Previous conversation history has been summarized due to length.')
    ).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/chat-monitor.png', fullPage: true });
  });
});
