import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Chat Monitor Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    // Common mocks
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, json: { user: { username: 'admin', role: 'admin' } } });
    });
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );

    // Mock Bots List
    await page.route('**/api/bots', async (route) => {
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
        ],
      });
    });

    // Mock Bot History
    await page.route('**/api/bots/*/history*', async (route) => {
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
              }
            ],
          },
        },
      });
    });
  });

  test('capture Chat Monitor screenshots', async ({ page }) => {
    await page.goto('/admin/chat');

    // Wait for network idle to ensure React renders
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Force screenshot without assertions
    await page.screenshot({ path: 'docs/screenshots/chat-monitor.png', fullPage: true });
  });

  test('capture Chat Interface screenshot', async ({ page }) => {
    await page.goto('/admin/chat');

    // Wait for network idle to ensure React renders
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Force screenshot without assertions
    await page.screenshot({ path: 'docs/screenshots/chat-interface.png', fullPage: true });
  });
});
