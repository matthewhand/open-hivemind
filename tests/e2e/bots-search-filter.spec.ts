import { expect, test } from '@playwright/test';
import { assertNoErrors, setupTestWithErrorDetection } from './test-utils';

test.describe('Bots Search and Filter', () => {
  test.setTimeout(60000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Alpha Bot',
      provider: 'discord-1',
      llmProvider: 'openai-1',
      status: 'active',
      connected: true,
      messageCount: 10,
      errorCount: 0,
      config: {},
    },
    {
      id: 'bot-2',
      name: 'Beta Bot',
      provider: 'slack-1',
      llmProvider: 'anthropic-1',
      status: 'disabled',
      connected: false,
      messageCount: 5,
      errorCount: 1,
      config: {},
    },
    {
      id: 'bot-3',
      name: 'Gamma Bot',
      provider: 'telegram-1',
      llmProvider: 'ollama-1',
      status: 'active',
      connected: true,
      messageCount: 100,
      errorCount: 0,
      config: {},
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock health endpoints (called by AuthContext and useHealthBadges)
    await page.route('*/**/health', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ platform: 'local', status: 'healthy' }) });
    });
    await page.route('*/**/api/health/detailed', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ status: 'healthy', checks: {} }) });
    });

    // Mock the API response for bots
    await page.route('*/**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: mockBots,
          providers: { message: [], llm: [] }
        })
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });
    await page.route('*/**/api/personas', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.route('*/**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ profiles: { llm: [] } }) });
    });
    // Mock status endpoint used by useLlmStatus hook
    await page.route('*/**/api/config/llm-status', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ defaultConfigured: true, botsMissingLlmProvider: [], hasMissing: false, defaultProviders: [] }) });
    });

    // Mock any other potential background calls
    await page.route('*/**/api/auth/me', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ id: 'admin', role: 'owner' }) });
    });
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/bots');
    await expect(page.locator('h1', { hasText: 'Bot Management' })).toBeVisible();
    await expect(page.locator('text=Alpha Bot')).toBeVisible(); // Wait for data load

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
    await expect(page.locator('h1', { hasText: 'Bot Management' })).toBeVisible();
    await expect(page.locator('text=Alpha Bot')).toBeVisible();

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('slack');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Beta Bot')).toBeVisible();
    await expect(page.locator('text=Alpha Bot')).not.toBeVisible();
    await expect(page.locator('text=Gamma Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by provider');
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
     const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/bots');
    await expect(page.locator('h1', { hasText: 'Bot Management' })).toBeVisible();
    await expect(page.locator('text=Alpha Bot')).toBeVisible();

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('Zeta NonExistent');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No bots found matching "Zeta NonExistent"')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Alpha Bot')).toBeVisible();
    await expect(page.locator('text=Beta Bot')).toBeVisible();
    await expect(page.locator('text=Gamma Bot')).toBeVisible();

    await assertNoErrors(errors, 'Bot empty search');
  });
});
