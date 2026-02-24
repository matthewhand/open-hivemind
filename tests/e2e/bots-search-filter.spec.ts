import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bots Search and Filter', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Alpha Bot',
      status: 'active',
      connected: true,
      messageCount: 10,
      errorCount: 0,
      provider: 'discord',
      llmProvider: 'openai',
      persona: 'default',
    },
    {
      id: 'bot-2',
      name: 'Beta Bot',
      status: 'active',
      connected: false,
      messageCount: 5,
      errorCount: 2,
      provider: 'slack',
      llmProvider: 'anthropic',
      persona: 'technical',
    },
    {
      id: 'bot-3',
      name: 'Gamma Bot',
      status: 'inactive',
      connected: false,
      messageCount: 0,
      errorCount: 0,
      provider: 'telegram',
      llmProvider: 'google',
      persona: 'creative',
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route(url => url.pathname.endsWith('/api/config'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: mockBots })
      });
    });

    await page.route(url => url.pathname.includes('/api/config/global'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    await page.route(url => url.pathname.includes('/api/personas'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route(url => url.pathname.includes('/api/config/llm-profiles'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profiles: { llm: [] } })
      });
    });

    await page.route(url => url.pathname.includes('/api/config/llm-status'), async (route) => {
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

    await page.route(url => url.pathname.includes('/api/admin/guard-profiles'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Alpha');

    // Wait for filter to apply (React state update)
    await page.waitForTimeout(500);

    const botCards = page.locator('text=Alpha Bot');
    await expect(botCards).toBeVisible();
    await expect(page.locator('text=Beta Bot')).not.toBeVisible();
    await expect(page.locator('text=Gamma Bot')).not.toBeVisible();

    await page.screenshot({ path: 'test-results/bots-search.png', fullPage: true });

    await assertNoErrors(errors, 'Bot search');
  });

  test('can search bots by provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('slack');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    await expect(page.locator('text=Beta Bot')).toBeVisible();
    await expect(page.locator('text=Alpha Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot provider search');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('Zeta NonExistent');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No bots found matching "Zeta NonExistent"')).toBeVisible();

    await assertNoErrors(errors, 'Bot empty search state');
  });
});
