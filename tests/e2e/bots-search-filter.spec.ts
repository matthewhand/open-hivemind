import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bots Search and Filter', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Alpha Bot',
      provider: 'discord',
      llmProvider: 'openai',
      status: 'active',
      connected: true,
      messageCount: 10,
      errorCount: 0,
      config: {},
    },
    {
      id: 'bot-2',
      name: 'Beta Bot',
      provider: 'slack',
      llmProvider: 'anthropic',
      status: 'active',
      connected: true,
      messageCount: 5,
      errorCount: 0,
      config: {},
    },
    {
      id: 'bot-3',
      name: 'Gamma Bot',
      provider: 'telegram',
      llmProvider: 'gemini',
      status: 'stopped',
      connected: false,
      messageCount: 0,
      errorCount: 0,
      config: {},
    }
  ];

  test.beforeEach(async ({ page }) => {
    // 1. Catch-all mock for API requests to prevent 401s from unmocked endpoints
    // This must be added FIRST so specific mocks added later take precedence (LIFO)
    await page.route('**/api/**', async (route) => {
        // Log for debugging if needed
        // console.log('Catch-all mocking:', route.request().url());
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({})
        });
    });

    // Mock the API response for bots
    await page.route('*/**/api/config', async (route) => {
      if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ bots: mockBots })
          });
      } else {
          await route.continue();
      }
    });

    // Mock other endpoints
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    await page.route('*/**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('*/**/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profiles: { llm: [] } })
      });
    });

    // Mock LLM status
    await page.route('*/**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false
        })
      });
    });

    // Mock bots specific endpoints
    await page.route('*/**/api/bots/*/activity*', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { activity: [] } })
        });
    });

    await page.route('*/**/api/bots/*/history*', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { history: [] } })
        });
    });
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Alpha');
    await page.waitForTimeout(500); // React state update

    const botCards = page.locator('.group').filter({ hasText: 'Alpha Bot' });
    await expect(botCards).toHaveCount(1);
    await expect(page.locator('text=Beta Bot')).not.toBeVisible();
    await expect(page.locator('text=Gamma Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by name');
  });

  test('can search bots by provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('slack');
    await page.waitForTimeout(500);

    const botCards = page.locator('.group').filter({ hasText: 'Beta Bot' });
    await expect(botCards).toHaveCount(1);
    await expect(page.locator('text=Alpha Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by provider');
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('Zeta NonExistent');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No bots found matching "Zeta NonExistent"')).toBeVisible();

    const clearButton = page.locator('button:has-text("Clear Search")');
    await expect(clearButton).toBeVisible();

    await clearButton.click();
    await page.waitForTimeout(500);

    const botCards = page.locator('.group'); // Using the .group class on the bot card
    await expect(botCards).toHaveCount(3);
    await expect(searchInput).toHaveValue('');

    await assertNoErrors(errors, 'Bot search empty state and clear');
  });
});
