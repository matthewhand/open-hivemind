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
      config: {}
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
      config: {}
    },
    {
      id: 'bot-3',
      name: 'Gamma Bot',
      provider: 'telegram',
      llmProvider: 'openai',
      status: 'disabled',
      connected: false,
      messageCount: 0,
      errorCount: 0,
      config: {}
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: mockBots })
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profiles: { llm: [] } }) });
    });
    await page.route('**/api/bots/*/activity*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { activity: [] } }) });
    });
    await page.route('**/api/bots/*/history*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { history: [] } }) });
    });

    // Mock LLM status to prevent 401s
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false }) });
    });
  });

  const assertNoCriticalErrors = async (errors: string[], context: string) => {
    const filtered = errors.filter(msg => !msg.includes('401 (Unauthorized)'));
    await assertNoErrors(filtered, context);
  };

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Alpha');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    const botRows = page.locator('.card .flex.flex-col.gap-2 > div');
    // We expect 1 bot visible
    await expect(botRows).toHaveCount(1);
    await expect(botRows.first()).toContainText('Alpha Bot');

    await assertNoCriticalErrors(errors, 'Bot search by name');
  });

  test('can search bots by provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('slack');

    await page.waitForTimeout(500);

    const botRows = page.locator('.card .flex.flex-col.gap-2 > div');
    await expect(botRows).toHaveCount(1);
    await expect(botRows.first()).toContainText('Beta Bot');

    await assertNoCriticalErrors(errors, 'Bot search by provider');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('Zeta Bot');
    await page.waitForTimeout(500);

    // Verify empty state message
    await expect(page.locator('text=No bots found matching your search')).toBeVisible();

    // Verify list is empty (or replaced by empty state)
    // The previous locator targeted the children of .flex.flex-col.gap-2.
    // If the list is empty, that container might be empty or not rendered.
    // If I replace the whole list with the empty state message, the locator count should be 0.
    const botRows = page.locator('.card .flex.flex-col.gap-2 > div');
    await expect(botRows).toHaveCount(0);

    await assertNoCriticalErrors(errors, 'Bot search empty state');
  });

  test('clearing search restores list', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('Alpha');
    await page.waitForTimeout(500);

    await expect(page.locator('.card .flex.flex-col.gap-2 > div')).toHaveCount(1);

    await searchInput.fill('');
    await page.waitForTimeout(500);

    await expect(page.locator('.card .flex.flex-col.gap-2 > div')).toHaveCount(3);

    await assertNoCriticalErrors(errors, 'Clear search');
  });
});
