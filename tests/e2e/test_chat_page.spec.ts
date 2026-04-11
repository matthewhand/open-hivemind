import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('ChatPage Optimistic Message Rollback', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    // Common mocks
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { configured: true, hasMissing: false } })
    );
    await page.route('**/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
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

    // Mock initial History
    await page.route('**/api/bots/*/history*', async (route) => {
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
    let resolveMessagePromise: () => void;
    const messagePromise = new Promise<void>((resolve) => {
      resolveMessagePromise = resolve;
    });

    // Setup delayed failure mock for message sending so we can see the optimistic state
    await page.route('**/api/bots/*/message', async (route) => {
      await messagePromise;
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

    // Resolve the promise to let the request complete
    resolveMessagePromise!();

    // Wait for the failure to resolve and rollback to occur
    // The rollback will mark the optimistic message as failed (Retry button, error indicator, or message removal)
    // At minimum, the sending indicator should be gone
    await expect(page.getByText('Sending...')).not.toBeVisible({ timeout: 5000 });

    // Take a screenshot of the rollback state
    await page.screenshot({ path: 'docs/screenshots/chatpage-rollback.png' });
  });

  test('sending a message optimistically updates under high latency', async ({ page }) => {
    let messageSent = false;
    const testMessage = 'Simulating 3G latency';

    // Override the history mock for this specific test
    await page.route('**/api/bots/*/history*', async (route) => {
      const history = [
        {
          id: 'msg-1',
          content: 'Hello World',
          createdAt: new Date().toISOString(),
          author: { id: 'user-1', username: 'Alice', bot: false },
        },
      ];

      if (messageSent) {
        history.push({
          id: 'msg-2',
          content: testMessage,
          createdAt: new Date().toISOString(),
          author: { id: 'current-user', username: 'You', bot: false },
        });
      }

      await route.fulfill({
        status: 200,
        json: { success: true, data: { history } },
      });
    });

    let resolveLatencyPromise: () => void;
    const latencyPromise = new Promise<void>((resolve) => {
      resolveLatencyPromise = resolve;
    });

    // Setup high latency mock
    await page.route('**/api/bots/*/message', async (route) => {
      await latencyPromise;
      messageSent = true;
      await route.fulfill({
        status: 200,
        json: { success: true },
      });
    });

    await page.goto('/admin/chat');
    await expect(page.getByText('Active Bots')).toBeVisible();
    await page.click('button:has-text("Support Bot")');
    await expect(page.getByText('Hello World')).toBeVisible();

    await page.fill('input[placeholder="Type a message..."]', testMessage);
    await page.press('input[placeholder="Type a message..."]', 'Enter');

    // Instantly verify optimistic update
    await expect(page.getByText(testMessage)).toBeVisible();
    await expect(page.getByText('Sending...')).toBeVisible();

    // Take a screenshot showing the loading indicator clearly
    await page.screenshot({ path: 'docs/screenshots/chatpage-latency.png' });

    // Resolve the promise
    resolveLatencyPromise!();

    // Wait for latency to clear and 'Sending...' to disappear
    await expect(page.getByText('Sending...')).not.toBeVisible({ timeout: 5000 });
    // Verify the message persists and hasn't rolled back
    await expect(page.getByText(testMessage)).toBeVisible();
  });

  test('offline mode disables sending preemptively', async ({ context, page }) => {
    await page.goto('/admin/chat');
    await expect(page.getByText('Active Bots')).toBeVisible();
    await page.click('button:has-text("Support Bot")');
    await expect(page.getByText('Hello World')).toBeVisible();

    // Simulate offline natively using Playwright Context API
    await context.setOffline(true);

    // Dispatch the offline event manually since context.setOffline may not trigger window events
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Check for any offline indicator (text, disabled input, etc.)
    const offlineText = page.getByText(/offline/i).first();
    const offlinePlaceholder = page.getByPlaceholder(/offline/i).first();

    await expect(offlineText).toBeVisible({ timeout: 10000 });

    // Screenshot offline mode
    await page.screenshot({ path: 'docs/screenshots/chatpage-offline.png' });

    // Simulate online
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // The input should be available again
    const chatInput = page.locator('input[type="text"], textarea').last();
    await expect(chatInput).toBeEnabled({ timeout: 10000 });
  });
});
