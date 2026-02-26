import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Chat Monitor Enhanced Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    // Common mocks
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
     await page.route('**/api/config/llm-status', async (route) =>
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
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Bots List with more bots to demonstrate search
    await page.route('**/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 'bot-1', name: 'Support Bot', status: 'active', connected: true, messageProvider: 'discord', llmProvider: 'openai', messageCount: 150, errorCount: 0, provider: 'discord' },
          { id: 'bot-2', name: 'Dev Assistant', status: 'active', connected: false, messageProvider: 'slack', llmProvider: 'anthropic', messageCount: 42, errorCount: 2, provider: 'slack' },
          { id: 'bot-3', name: 'Sales Agent', status: 'active', connected: true, messageProvider: 'discord', llmProvider: 'openai', messageCount: 89, errorCount: 0, provider: 'discord' },
        ],
      });
    });

    // Mock Bot History for Bot 1
    await page.route('**/api/bots/bot-1/history*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
            success: true,
            data: {
                history: [
                    { id: 'msg-1', content: 'Hello! I am Support Bot.', createdAt: new Date().toISOString(), author: { id: 'bot-1', username: 'Support Bot', bot: true } },
                    { id: 'msg-2', content: 'Hi, I need help.', createdAt: new Date().toISOString(), author: { id: 'user-1', username: 'User', bot: false } }
                ]
            }
        },
      });
    });
  });

  test('verify chat monitor search and export', async ({ page }) => {
    await page.goto('/admin/chat');

    // 1. Verify Search
    const searchInput = page.getByPlaceholder('Search bots...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Support');

    // Verify list is filtered
    await expect(page.getByText('Support Bot')).toBeVisible();
    await expect(page.getByText('Dev Assistant')).not.toBeVisible();

    // Take screenshot of search
    await page.screenshot({ path: 'docs/screenshots/chat-monitor-search.png' });

    // 2. Verify Export Button
    await page.click('button:has-text("Support Bot")');
    await expect(page.getByTitle('Export Chat History')).toBeVisible();

    // Take screenshot of chat with export button
    await page.screenshot({ path: 'docs/screenshots/chat-monitor-export.png' });
  });
});
