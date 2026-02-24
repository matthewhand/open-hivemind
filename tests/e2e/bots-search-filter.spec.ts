import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bots Search and Filter', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Helper Bot',
      provider: 'discord',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'default',
      status: 'active',
      connected: true,
      messageCount: 10,
      errorCount: 0,
    },
    {
      id: 'bot-2',
      name: 'Coder Bot',
      provider: 'slack',
      messageProvider: 'slack',
      llmProvider: 'anthropic',
      persona: 'coder',
      status: 'active',
      connected: true,
      messageCount: 5,
      errorCount: 0,
    },
    {
      id: 'bot-3',
      name: 'Artist Bot',
      provider: 'telegram',
      messageProvider: 'telegram',
      llmProvider: 'openai',
      persona: 'artist',
      status: 'inactive',
      connected: false,
      messageCount: 0,
      errorCount: 0,
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('*/**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: mockBots })
      });
    });

    // Mock other endpoints required by BotsPage
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('*/**/api/personas', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('*/**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profiles: { llm: [] } }) });
    });
    await page.route('*/**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false })
      });
    });

    // Mock other global endpoints to prevent 401s
    await page.route('*/**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('*/**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });
    await page.route('*/**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) });
    });
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Helper');

    // Wait for filter to apply (React state update)
    await page.waitForTimeout(500);

    const botCards = page.locator('text=Helper Bot');
    await expect(botCards).toBeVisible();
    await expect(page.locator('text=Coder Bot')).not.toBeVisible();
    await expect(page.locator('text=Artist Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by name');
  });

  test('can search bots by provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('slack');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    const botCards = page.locator('text=Coder Bot');
    await expect(botCards).toBeVisible();
    await expect(page.locator('text=Helper Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by provider');
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
     const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('NonExistentBot');
    await page.waitForTimeout(500);

    // Verify empty state message
    await expect(page.locator('text=No bots found matching your search')).toBeVisible();

    // Verify clear button works (assuming I implement a clear button or just rely on backspacing,
    // but the plan mentioned an empty state with action like PersonasPage has "Clear Filters")
    // If I just implement a simple input, I might not have a dedicated "Clear Filters" button in the empty state
    // unless I implement it. PersonasPage uses EmptyState component which has onAction.
    // I should probably implement a "Clear Search" button in the empty state for good UX.

    const clearButton = page.locator('button:has-text("Clear Search")');
    await expect(clearButton).toBeVisible();

    await clearButton.click();
    await page.waitForTimeout(500);

    // Should see all bots again
    await expect(page.locator('text=Helper Bot')).toBeVisible();
    await expect(page.locator('text=Coder Bot')).toBeVisible();
    await expect(page.locator('text=Artist Bot')).toBeVisible();
    await expect(searchInput).toHaveValue('');

    await assertNoErrors(errors, 'Bot empty state and clear');
  });
});
