import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Bot Activity Screenshots', () => {
  test('Capture Bot Activity Logs', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Data
    const mockBot = {
      id: 'bot-activity-demo',
      name: 'Customer Support Bot',
      description: 'Handles customer inquiries',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'support',
      status: 'active',
      connected: true,
      messageCount: 152,
      errorCount: 2,
    };

    const mockLogs = [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
        action: 'INCOMING',
        details: 'User: Hello, I need help with my order.',
        result: 'success',
        metadata: { type: 'RUNTIME', provider: 'discord', channelId: '12345' }
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 1 + 500).toISOString(),
        action: 'PROCESSING',
        details: 'Thinking...',
        result: 'success',
        metadata: { type: 'RUNTIME' }
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 1000 * 60 * 1 + 2000).toISOString(),
        action: 'OUTGOING',
        details: 'Bot: I can help with that. What is your order ID?',
        result: 'success',
        metadata: { type: 'RUNTIME', provider: 'discord', channelId: '12345' }
      },
      {
        id: 'log-4',
        timestamp: new Date(Date.now() - 1000 * 30).toISOString(),
        action: 'INCOMING',
        details: 'User: It is #998877.',
        result: 'success',
        metadata: { type: 'RUNTIME', provider: 'discord', channelId: '12345' }
      },
      {
        id: 'log-5',
        timestamp: new Date(Date.now() - 1000 * 28).toISOString(),
        action: 'TOOL_USE',
        details: 'Calling tool: lookup_order(id="998877")',
        result: 'success',
        metadata: { type: 'RUNTIME' }
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
            id: 'support',
            name: 'Support Agent',
            description: 'Customer support',
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

    // Mock Activity Logs
    await page.route(`**/api/bots/${mockBot.id}/activity*`, async (route) => {
      await route.fulfill({
        json: { success: true, data: { activity: mockLogs } },
      });
    });

    // Mock Chat History (empty is fine)
    await page.route(`**/api/bots/${mockBot.id}/history*`, async (route) => {
      await route.fulfill({
        json: { success: true, history: [] },
      });
    });

    // Navigate to Bots page
    await page.goto('/admin/bots');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content
    await page.waitForSelector(`text=${mockBot.name}`);

    // Screenshot Bots Page (to show no WIP alert)
    await page.screenshot({ path: 'docs/screenshots/bots-page.png', fullPage: true });

    // Click Settings
    await page.locator('button[title="Bot Settings"]').click();

    // Wait for Settings Modal
    await expect(page.locator('.modal-box').first()).toBeVisible();

    // Click "View Logs & Details"
    await page.getByText('View Logs & Details').click();

    // Wait for Details Modal
    // The details modal title is the bot name. Use the last one visible or specific to modal structure
    const detailsModal = page.locator('.modal-box').last();
    await expect(detailsModal).toBeVisible();
    // The name appears twice (header and content), checking first is sufficient
    await expect(detailsModal.getByRole('heading', { name: mockBot.name }).first()).toBeVisible();

    // Wait for logs to render
    await expect(page.getByText('User: Hello, I need help')).toBeVisible();

    // Wait a bit for layout to settle
    await page.waitForTimeout(500);

    // Screenshot Details Modal with Logs
    await page.screenshot({ path: 'docs/screenshots/bot-details-logs.png' });
  });
});
