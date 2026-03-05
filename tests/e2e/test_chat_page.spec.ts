import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('ChatPage Optimistic Message Rollback', () => {
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
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { configured: true, hasMissing: false } })
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
        ],
      });
    });

    // Mock initial History
    await page.route('/api/bots/*/history*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            history: [
              {
                id: 'msg-1',
                content: 'Hello World',
                createdAt: new Date().toISOString(),
                author: {
                  id: 'user-1',
                  username: 'Alice',
                  bot: false,
                },
              },
            ],
          },
        },
      });
    });
  });

  test('sending a message optimistically updates and rolls back on failure', async ({ page }) => {
    // Setup delayed failure mock for message sending so we can see the optimistic state
    await page.route('/api/bots/*/message', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay to see optimistic UI
      await route.fulfill({
        status: 500,
        json: { error: 'Failed to send message' },
      });
    });

    await page.goto('/admin/chat');

    // Wait for bots to load
    await expect(page.getByText('Active Bots')).toBeVisible();

    // Select the first bot
    await page.click('button:has-text("Support Bot")');

    // Wait for chat history to load
    await expect(page.getByText('Hello World')).toBeVisible();

    // Type a message
    const testMessage = 'This is a test message to fail';
    await page.fill('input[placeholder="Type a message..."]', testMessage);

    // Send the message
    await page.press('input[placeholder="Type a message..."]', 'Enter');

    // Verify optimistic UI (Message exists and "Sending..." indicator)
    await expect(page.getByText(testMessage)).toBeVisible();
    await expect(page.getByText('Sending...')).toBeVisible();

    // Take a screenshot of the optimistic state
    await page.screenshot({ path: 'docs/screenshots/chatpage-optimistic.png' });

    // Wait for the failure to resolve and rollback to occur
    // The rollback will mark the optimistic message as failed, instead of removing it
    await expect(page.getByText('Retry')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText(testMessage)).toBeVisible();

    // Take a screenshot of the rollback state
    await page.screenshot({ path: 'docs/screenshots/chatpage-rollback.png' });
  });
});
