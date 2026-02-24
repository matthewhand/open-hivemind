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
      llmProvider: 'local',
      status: 'inactive',
      connected: false,
      messageCount: 0,
      errorCount: 0,
      config: {}
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

    // Mock other endpoints to avoid errors
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });
    await page.route('*/**/api/personas', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.route('*/**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ profiles: { llm: [] } }) });
    });
    // Mock polled endpoints to prevent networkidle timeouts
    await page.route('*/**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ defaultConfigured: true }) });
    });
    await page.route('*/**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'healthy' }) });
    });
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/bots');
    await page.waitForSelector('text=Alpha Bot');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Alpha');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    await expect(page.locator('text=Alpha Bot')).toBeVisible();
    await expect(page.locator('text=Beta Bot')).not.toBeVisible();
    await expect(page.locator('text=Gamma Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by name');
  });

  test('can search bots by provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/bots');
    await page.waitForSelector('text=Beta Bot');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('slack');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Beta Bot')).toBeVisible();
    await expect(page.locator('text=Alpha Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by provider');
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/bots');
    await page.waitForSelector('text=Alpha Bot');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('Zeta NonExistent');
    await page.waitForTimeout(500);

    // Matches the implementation text I plan to add
    await expect(page.locator('text=No bots found matching')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Alpha Bot')).toBeVisible();
    await expect(page.locator('text=Beta Bot')).toBeVisible();
    await expect(page.locator('text=Gamma Bot')).toBeVisible();

    await assertNoErrors(errors, 'Bot empty state');
  });
});
