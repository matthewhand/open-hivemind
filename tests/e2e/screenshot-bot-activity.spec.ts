import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Bot Activity Logs Screenshots', () => {
  test('Capture Bot Details with Activity Logs', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Data
    const mockBot = {
      id: 'activity-bot',
      name: 'Activity Bot',
      description: 'A bot with activity logs',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'default',
      status: 'active',
      connected: true,
      messageCount: 15,
      errorCount: 1,
    };

    const mockActivityLogs = [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        botName: 'Activity Bot',
        action: 'MESSAGE_PROCESSED',
        details: 'Replied to user message',
        metadata: { type: 'chat', tokens: 150 },
        result: 'success',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        botName: 'Activity Bot',
        action: 'LLM_REQUEST',
        details: 'Sent prompt to OpenAI',
        metadata: { model: 'gpt-4' },
        result: 'success',
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        botName: 'Activity Bot',
        action: 'ERROR',
        details: 'Connection timeout',
        metadata: { error: 'ECONNRESET' },
        result: 'failure',
      },
    ];

    // Mock API responses
    await page.route('**/api/config/llm-profiles', async route => {
      await route.fulfill({ json: { profiles: { llm: [{ key: 'openai', name: 'GPT-4', provider: 'openai' }] } } });
    });

    await page.route('**/api/personas', async route => {
      await route.fulfill({ json: [{ id: 'default', name: 'Default Assistant', description: 'Helpful assistant', systemPrompt: 'You are helpful.' }] });
    });

    await page.route('**/api/config/global', async route => {
        await route.fulfill({ json: { openai: { values: {} }, discord: { values: {} } } });
    });

    // Handle Config GET
    await page.route('**/api/config', async route => {
        if (route.request().method() === 'GET') {
             await route.fulfill({ json: { bots: [mockBot], legacyMode: false, environment: 'test', warnings: [] } });
        } else {
             await route.continue();
        }
    });

    // Handle Bot Activity GET
    await page.route(`**/api/bots/${mockBot.id}/activity*`, async route => {
        // Corrected response structure to match backend: { success: true, data: { activity: [...] } }
        await route.fulfill({ json: { success: true, data: { activity: mockActivityLogs } } });
    });

    // Handle Bot History GET (empty for now to avoid errors)
    await page.route(`**/api/bots/${mockBot.id}/history*`, async route => {
        await route.fulfill({ json: { success: true, data: { history: [] } } });
    });

    // Navigate to Bots page
    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Bot Management")');

    // Click "Bot Settings"
    const settingsButton = page.locator('button[title="Bot Settings"]').first();
    await settingsButton.click();

    // Click "View Logs & Details"
    const viewDetailsButton = page.locator('button:has-text("View Logs & Details")').first();
    await expect(viewDetailsButton).toBeVisible();
    await viewDetailsButton.click();

    // Wait for "Recent Activity" header in the new modal
    // Using a more specific locator to avoid ambiguity
    const recentActivityHeader = page.getByRole('heading', { name: 'Recent Activity' });
    await expect(recentActivityHeader).toBeVisible({ timeout: 10000 });

    // Wait for logs to render
    await expect(page.getByText('Replied to user message')).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'docs/images/bot-details-activity.png' });
  });
});
