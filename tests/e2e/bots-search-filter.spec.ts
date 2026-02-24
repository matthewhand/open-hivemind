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

    // Mock other endpoints to prevent 404s/errors
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ profiles: { llm: [] } }) });
    });
    // Add mock for llm status to prevent errors
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ defaultConfigured: true }) });
    });
    // Add mock for health check
    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'healthy' }) });
    });
    // Add mock for bot activity to prevent errors when page loads
     await page.route('**/api/bots/*/activity*', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { activity: [] } }) });
    });
    // Add mock for history
    await page.route('**/api/bots/*/history*', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: { history: [] } }) });
    });
    // Add mock for guard profiles
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
  });

  test('can search bots by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Alpha');
    await page.waitForTimeout(500); // Allow React state to update

    const botCards = page.locator('.card .bg-base-100'); // Selector for bot list item

    // We expect 1 bot visible
    const alphaBot = page.getByText('Alpha Bot');
    await expect(alphaBot).toBeVisible();
    await expect(page.getByText('Beta Bot')).not.toBeVisible();
    await expect(page.getByText('Gamma Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by name');
  });

  test('can search bots by provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');

    await searchInput.fill('slack');
    await page.waitForTimeout(500);

    await expect(page.getByText('Beta Bot')).toBeVisible();
    await expect(page.getByText('Alpha Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'Bot search by provider');
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const searchInput = page.locator('input[placeholder="Search bots..."]');
    await searchInput.fill('Zeta NonExistent');
    await page.waitForTimeout(500);

    // Look for the "No bots found" message we plan to add
    await expect(page.getByText('No bots found matching')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    await expect(page.getByText('Alpha Bot')).toBeVisible();
    await expect(page.getByText('Beta Bot')).toBeVisible();
    await expect(page.getByText('Gamma Bot')).toBeVisible();

    await assertNoErrors(errors, 'Bot search empty state');
  });
});
