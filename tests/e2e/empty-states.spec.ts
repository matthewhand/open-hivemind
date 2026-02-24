import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Bots Page should show empty state when no bots configured', async ({ page }) => {
    // Mock config to return empty bots
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: [] }),
      });
    });

    // Mock other dependencies
    await page.route('**/api/config/global', async (route) => route.fulfill({ json: {} }));
    await page.route('**/api/personas', async (route) => route.fulfill({ json: [] }));
    await page.route('**/api/config/llm-profiles', async (route) => route.fulfill({ json: { profiles: { llm: [] } } }));

    await page.goto('/admin/bots');

    // Verify empty state
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Create Bot' })).toBeVisible();
  });

  test('Bots Page should show search empty state when no matches found', async ({ page }) => {
    // Mock config to return some bots
    const mockBots = [{
      id: 'bot-1',
      name: 'Test Bot',
      provider: 'openai',
      llmProvider: 'gpt-4',
      status: 'active',
      connected: true,
      messageCount: 0,
      errorCount: 0
    }];

    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: mockBots }),
      });
    });

     // Mock other dependencies
    await page.route('**/api/config/global', async (route) => route.fulfill({ json: {} }));
    await page.route('**/api/personas', async (route) => route.fulfill({ json: [] }));
    await page.route('**/api/config/llm-profiles', async (route) => route.fulfill({ json: { profiles: { llm: [] } } }));

    await page.goto('/admin/bots');

    // Verify bot is visible first
    await expect(page.getByText('Test Bot')).toBeVisible();

    // Search for non-existent bot
    await page.getByPlaceholder('Search bots...').fill('NonExistentBot');

    // Verify empty state
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('Guards Page should show empty state when no profiles exist', async ({ page }) => {
    // Mock profiles to return empty list
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/admin/guards');

    // Verify empty state
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page should show empty state when no personas exist', async ({ page }) => {
     // Mock personas to return empty list
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    // Mock bots
    await page.route('**/api/config', async (route) => route.fulfill({ json: { bots: [] } }));

    await page.goto('/admin/personas');

    // Verify empty state
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Create Persona' })).toBeVisible();
  });
});
