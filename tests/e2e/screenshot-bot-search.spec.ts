import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Bot Search Screenshots', () => {
  test('Capture Bot Search and Filter Interface', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    const mockBots = [
      {
        id: 'bot-1',
        name: 'Support Agent',
        description: 'Handles customer support queries',
        status: 'active',
        connected: true,
        messageProvider: 'discord',
        llmProvider: 'openai',
        provider: 'discord',
        messageCount: 0,
        errorCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bot-2',
        name: 'Sales Assistant',
        description: 'Assists with sales inquiries',
        status: 'inactive',
        connected: false,
        messageProvider: 'slack',
        llmProvider: 'anthropic',
        provider: 'slack',
        messageCount: 0,
        errorCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    // Mock the API response to return a list of bots
    await page.route('**/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { bots: mockBots } },
      });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { profiles: { llm: [] } } });
    });

    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: [] } });
    });

    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'healthy' } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      });
    });

    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    });

    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { active: false } });
    });

    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { data: [] } });
    });

    // Navigate to the bots page
    await page.goto('/admin/bots');

    // Wait for the bots to load and the search input to be visible
    await page.waitForSelector('input[placeholder="Search..."], input[placeholder="Search agents..."]');

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Wait for animations to settle
    await page.waitForTimeout(500);

    // Screenshot the Bots Page which has the search and filter bar
    await page.screenshot({ path: 'docs/screenshots/bots-page.png', fullPage: true });

    // Type in the search box
    const searchInput = page.locator('input[placeholder="Search..."], input[placeholder="Search agents..."]').first();
    await searchInput.fill('Support');

    // Wait for the UI to update
    await page.waitForTimeout(500);

    // Screenshot the filtered results
    await page.screenshot({ path: 'docs/screenshots/bot-search-filtered.png', fullPage: true });
  });

  test('Capture Bot Details Modal (sidebar preview)', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    const mockBots = [
      {
        id: 'bot-1',
        name: 'Support Agent',
        description: 'Handles customer support queries across multiple channels with context-aware responses.',
        status: 'active',
        connected: true,
        messageProvider: 'discord',
        llmProvider: 'openai',
        llmModel: 'gpt-4-turbo',
        provider: 'discord',
        messageCount: 1284,
        errorCount: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bot-2',
        name: 'Sales Assistant',
        description: 'Assists with sales inquiries',
        status: 'inactive',
        connected: false,
        messageProvider: 'slack',
        llmProvider: 'anthropic',
        llmModel: 'claude-3-opus',
        provider: 'slack',
        messageCount: 0,
        errorCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    // Mock the API response to return a list of bots
    await page.route('**/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: { bots: mockBots } },
      });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { profiles: { llm: [] } } });
    });

    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: [] } });
    });

    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'healthy' } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      });
    });

    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    });

    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { active: false } });
    });

    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { data: [] } });
    });

    // Mock bot activity and history endpoints for the preview sidebar
    await page.route('**/api/bots/*/activity*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            activity: [
              { id: 'log-1', timestamp: new Date().toISOString(), action: 'message_received', details: 'Received message from user' },
              { id: 'log-2', timestamp: new Date().toISOString(), action: 'message_sent', details: 'Replied with support response' },
              { id: 'log-3', timestamp: new Date().toISOString(), action: 'message_received', details: 'Follow-up question received' },
            ],
          },
        },
      });
    });

    await page.route('**/api/bots/*/history*', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, data: { history: [] } },
      });
    });

    // Navigate to the bots page
    await page.goto('/admin/bots');

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Wait for bots to load
    await page.waitForSelector('text=Support Agent');

    // Click on the first bot card to open the preview sidebar
    await page.getByText('Support Agent').first().click();

    // Wait for the preview sidebar to appear with bot details
    await page.waitForSelector('text=Description');
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/bot-details-modal.png', fullPage: true });
  });
});
