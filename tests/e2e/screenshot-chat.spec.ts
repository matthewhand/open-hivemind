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
            provider: 'discord'
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
            provider: 'slack'
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
                        content: 'Hello! I am your AI assistant. How can I help you today?',
                        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                        author: { id: 'bot-1', username: 'Support Bot', bot: true }
                    },
                    {
                        id: 'msg-2',
                        content: 'I have a question about the new feature.',
                        createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
                        author: { id: 'user-1', username: 'Alice', bot: false, avatar: 'https://ui-avatars.com/api/?name=Alice' }
                    },
                     {
                        id: 'msg-rollup',
                        content: 'Previous conversation history summarized due to length...',
                        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                        author: { id: 'system', username: 'System', role: 'system', bot: false }
                    },
                    {
                        id: 'msg-3',
                        content: 'Could you clarify which specific feature you are referring to?',
                        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                        author: { id: 'bot-1', username: 'Support Bot', bot: true }
                    },
                    {
                        id: 'msg-4',
                        content: 'The dashboard analytics one.',
                        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
                        author: { id: 'user-1', username: 'Alice', bot: false, avatar: 'https://ui-avatars.com/api/?name=Alice' }
                    }
                ]
            }
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
    await expect(page.getByText('Hello! I am your AI assistant.')).toBeVisible();
    await expect(page.getByText('Previous conversation history summarized')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/chat-monitor.png', fullPage: true });
  });
});
