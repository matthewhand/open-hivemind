import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock common endpoints to return empty data
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });

    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    // Mock other potential calls to avoid errors
    await page.route('**/api/admin/mcp-servers', async (route) => {
        await route.fulfill({ json: [] });
    });
     await page.route('**/api/health', async (route) => {
        await route.fulfill({ json: { status: 'ok' } });
    });
  });

  test('Bots Page shows empty state when no bots configured', async ({ page }) => {
    await page.goto('/admin/bots');

    // Verify "No bots configured" empty state
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // Use last() because the header also has a 'Create Bot' button
    await expect(page.getByRole('button', { name: 'Create Bot' }).last()).toBeVisible();
  });

  test('Bots Page shows search empty state when no matches found', async ({ page }) => {
    // Override mock to return some bots so we can test search filtering
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        json: {
          bots: [
            {
              id: 'bot-1',
              name: 'Test Bot',
              provider: 'openai',
              llmProvider: 'gpt-4',
              status: 'active',
              connected: true,
              messageCount: 0,
              errorCount: 0,
            },
          ],
        },
      });
    });

    await page.goto('/admin/bots');

    // Verify bot is visible first
    await expect(page.getByText('Test Bot')).toBeVisible();

    // Search for non-existent bot
    const searchInput = page.getByPlaceholder('Search bots...');
    await searchInput.fill('NonExistentBot');

    // Verify "No bots found matching" empty state
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();

    // Click clear search and verify bot is back
    await page.getByRole('button', { name: 'Clear Search' }).click();
    await expect(page.getByText('Test Bot')).toBeVisible();
  });

  test('Personas Page shows empty state when no personas found', async ({ page }) => {
    await page.goto('/admin/personas');

    // Verify "No personas found" empty state
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    // Use last() because the header also has a 'Create Persona' button
    await expect(page.getByRole('button', { name: 'Create Persona' }).last()).toBeVisible();
  });

  test('Personas Page shows search empty state when no matches found', async ({ page }) => {
      // Override mock to return some personas
      await page.route('**/api/personas', async (route) => {
          await route.fulfill({
              json: [
                  {
                      id: 'persona-1',
                      name: 'Test Persona',
                      description: 'A test persona',
                      category: 'general',
                      systemPrompt: 'You are a test.',
                      isBuiltIn: false,
                  }
              ]
          });
      });

      await page.goto('/admin/personas');
      await expect(page.getByRole('heading', { name: 'Test Persona' })).toBeVisible();

      // Search
      const searchInput = page.getByPlaceholder('Search personas...');
      await searchInput.fill('NonExistentPersona');

      // Verify empty state (variant secondary)
      // Note: The text is "No personas found" but description differs
      await expect(page.getByText('No personas found')).toBeVisible();
      await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();

      // Clear filters
      await page.getByRole('button', { name: 'Clear Filters' }).click();
      await expect(page.getByRole('heading', { name: 'Test Persona' })).toBeVisible();
  });

  test('Guards Page shows empty state when no profiles found', async ({ page }) => {
    await page.goto('/admin/guards');

    // Verify "No Guard Profiles" empty state
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies and access controls.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });
});
