import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    // Mock global config which is called on every page load
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });
    // Mock user profile
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        json: {
          id: 'admin',
          username: 'admin',
          role: 'owner',
          permissions: ['*'],
        },
      });
    });
  });

  test('Bots Page - No Bots Configured', async ({ page }) => {
    // Mock bots response to be empty
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });
    // Mock other dependencies
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/llm/profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });

    await page.goto('/admin/bots');

    // Verify empty state is visible
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // Two buttons: one in header, one in empty state
    await expect(page.getByRole('button', { name: 'Create Bot' })).toHaveCount(2);
  });

  test('Bots Page - No Search Results', async ({ page }) => {
    // Mock bots response with some data
    const mockBots = [
      {
        id: 'bot-1',
        name: 'Test Bot 1',
        status: 'active',
        connected: true,
        provider: 'discord',
        llmProvider: 'openai',
        messageCount: 0,
        errorCount: 0,
      },
    ];

    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: mockBots } });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/llm/profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });

    // Mock individual bot calls which might happen
    await page.route('**/api/bots/*/activity*', async (route) => {
      await route.fulfill({ json: { activity: [] } });
    });

    await page.goto('/admin/bots');

    // Ensure bot is visible first
    await expect(page.getByText('Test Bot 1')).toBeVisible();

    // Search for non-existent bot
    await page.getByPlaceholder('Search bots...').fill('NonExistentBot');

    // Verify search empty state
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();

    // Clear search and verify bot is back
    await page.getByRole('button', { name: 'Clear Search' }).click();
    await expect(page.getByText('Test Bot 1')).toBeVisible();
  });

  test('Guards Page - No Profiles', async ({ page }) => {
    // Mock guard profiles to be empty
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');

    // Verify empty state
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page - No Search Results', async ({ page }) => {
    // Mock personas
    const mockPersonas = [
        {
            id: 'p1',
            name: 'Helper',
            description: 'Helpful assistant',
            category: 'general',
            systemPrompt: 'You are helpful.',
            isBuiltIn: false
        }
    ];

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: mockPersonas });
    });
    // Mock config for bots in personas page
    await page.route('**/api/config', async (route) => {
        await route.fulfill({ json: { bots: [] } });
    });

    await page.goto('/admin/personas');

    // Verify persona is visible
    await expect(page.getByText('Helper')).toBeVisible();

    // Search
    await page.getByPlaceholder('Search personas...').fill('NonExistent');

    // Verify empty state
    await expect(page.getByText('No personas found')).toBeVisible();
  });
});
