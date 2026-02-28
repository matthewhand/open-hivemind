import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Bot Activity Screenshots', () => {
  test('Capture Bot Activity Logs', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('requestfailed', (request) =>
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
    );

    // Mock Data
    const mockBot = {
      id: 'screenshot-bot',
      name: 'Screenshot Bot',
      description: 'A bot for screenshots',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'default',
      status: 'generating', // Set to generating so isTyping will be true
      connected: true,
      messageCount: 42,
      errorCount: 0,
      config: { discord: { token: '***' }, openai: { apiKey: '***' } },
    };

    const mockActivityLogs = [
      {
        id: 'log1',
        timestamp: new Date().toISOString(),
        action: 'INCOMING',
        details: 'Message length: 15',
        result: 'success',
        metadata: {
          type: 'MESSAGE',
          channelId: '123',
          userId: 'user1',
        },
      }
    ];

    const mockHistoryLogs = [
      {
        id: 'msg1',
        content: 'Hi Bot, how are you?',
        createdAt: new Date(Date.now() - 5000).toISOString(),
        author: { id: 'user1', username: 'User', bot: false },
        role: 'user'
      }
    ];

    // Mock API responses
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        json: { profiles: { llm: [{ key: 'openai', name: 'GPT-4', provider: 'openai' }] } },
      });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'default',
            name: 'Default Assistant',
            description: 'Helpful assistant',
            systemPrompt: 'You are helpful.',
          },
        ],
      });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: { openai: { values: {} }, discord: { values: {} } } });
    });

    // Handle Config GET
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: { bots: [mockBot], legacyMode: false, environment: 'test', warnings: [] },
        });
      } else {
        await route.continue();
      }
    });

    // Handle Activity Logs GET
    await page.route('**/api/bots/screenshot-bot/activity*', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { activity: mockActivityLogs } }),
      });
    });

    // Handle History GET
    await page.route('**/api/bots/*/history*', async (route) => {
      await route.fulfill({
        json: { success: true, data: { history: mockHistoryLogs } },
      });
    });

    // Navigate to Bots page
    await page.goto('/admin/bots');

    // Wait for content
    await expect(page.getByText('Screenshot Bot')).toBeVisible({ timeout: 10000 });

    // Open Settings Modal
    const settingsButton = page.locator('button[title="Bot Settings"]').first();
    await settingsButton.click();

    // Wait for Settings Modal
    const settingsModal = page.locator('.modal-box', { hasText: 'Core Configuration' });
    await expect(settingsModal).toBeVisible();

    // Click "View Logs & Details"
    await settingsModal.getByRole('button', { name: /View Logs & Details/i }).click();

    // Wait for Details Modal (Preview Modal)
    const detailsModal = page.locator('.modal-box', { hasText: 'Recent Activity' });
    await expect(detailsModal).toBeVisible();

    // Wait for the chat to render
    await expect(page.getByText('Chat History')).toBeVisible({ timeout: 5000 });

    // Scroll down to the Chat History section so it's fully visible in the screenshot
    const chatHistoryHeader = page.getByText('Chat History');
    await chatHistoryHeader.scrollIntoViewIfNeeded();

    // Look for the typing indicator dot (or the chat bubbles generally)
    await page.waitForTimeout(1000); // Give a bit of time for modal to fully slide in

    // Screenshot Details Modal
    await page.screenshot({ path: 'docs/screenshots/bot-details-modal.png' });
  });
});
