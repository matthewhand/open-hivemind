import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bots Search and Filter', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Support Bot',
      provider: 'discord',
      messageProvider: 'discord',
      llmProvider: 'openai',
      status: 'active',
      connected: true,
      messageCount: 10,
      errorCount: 0,
    },
    {
      id: 'bot-2',
      name: 'Internal Helper',
      provider: 'slack',
      messageProvider: 'slack',
      llmProvider: 'anthropic',
      status: 'active',
      connected: false,
      messageCount: 5,
      errorCount: 2,
    },
    {
      id: 'bot-3',
      name: 'Creative Writer',
      provider: 'telegram',
      messageProvider: 'telegram',
      llmProvider: 'openai-gpt4',
      status: 'disabled',
      connected: false,
      messageCount: 0,
      errorCount: 0,
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('*/**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: mockBots }),
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
    await page.route('*/**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('*/**/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profiles: { llm: [] } }),
      });
    });
    await page.route('*/**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        }),
      });
    });
    await page.route('*/**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Support');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    const botRows = page.locator('.bg-base-100.border.border-base-300.rounded-xl');
    // We expect 1 visible row
    const visibleBot = botRows.filter({ hasText: 'Support Bot' });
    await expect(visibleBot).toBeVisible();

    // Check others are not visible
    await expect(page.locator('text=Internal Helper')).not.toBeVisible();
    await expect(page.locator('text=Creative Writer')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by name');
    await page.screenshot({ path: 'docs/screenshots/verification-bots-search.png' });
  });

  test('can search bots by provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('slack');
    await page.waitForTimeout(500);

    const botRows = page.locator('.bg-base-100.border.border-base-300.rounded-xl');
    const visibleBot = botRows.filter({ hasText: 'Internal Helper' });
    await expect(visibleBot).toBeVisible();

    await expect(page.locator('text=Support Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by provider');
  });

  test('can search bots by llm provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('anthropic');
    await page.waitForTimeout(500);

    const botRows = page.locator('.bg-base-100.border.border-base-300.rounded-xl');
    const visibleBot = botRows.filter({ hasText: 'Internal Helper' });
    await expect(visibleBot).toBeVisible();

    await expect(page.locator('text=Support Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by llm provider');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('NonExistentBot');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No bots found matching')).toBeVisible();

    await assertNoErrors(errors, 'Bot empty search state');
  });
});
