import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock global config to avoid errors
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });

    // Mock dashboard status
    await page.route('**/api/dashboard/api/status', async (route) => {
      await route.fulfill({ json: { status: 'ok' } });
    });
  });

  test('BotsPage: Shows empty state when no bots configured', async ({ page }) => {
    // Mock 0 bots
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });
    // Mock other required endpoints
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });

    await page.goto('/admin/bots');

    // Check for "No bots configured" empty state
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Bot' }).first()).toBeVisible();
  });

  test('BotsPage: Shows empty state when search returns no results', async ({ page }) => {
    // Mock some bots
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        json: {
          bots: [
            { id: 'bot1', name: 'Test Bot', status: 'active', connected: true, messageCount: 0, errorCount: 0 }
          ]
        }
      });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });
    // Mock bot history/activity endpoints which might be called
    await page.route('**/api/bots/bot1/activity**', async (route) => {
        await route.fulfill({ json: { activity: [] } });
    });
    await page.route('**/api/bots/bot1/history**', async (route) => {
        await route.fulfill({ json: { history: [] } });
    });


    await page.goto('/admin/bots');

    // Verify bot is present
    await expect(page.getByText('Test Bot')).toBeVisible();

    // Search for non-existent bot
    await page.getByPlaceholder('Search bots...').fill('NonExistentBot');

    // Check for "No bots found matching" empty state
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('GuardsPage: Shows empty state when no profiles exist', async ({ page }) => {
    // Mock 0 profiles
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');

    // Check for "No Guard Profiles" empty state
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' }).first()).toBeVisible();
  });

  test('PersonasPage: Shows empty state when no personas exist', async ({ page }) => {
    // Mock 0 personas
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    await page.goto('/admin/personas');

    // Check for "No personas found" empty state
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Persona' }).first()).toBeVisible();
  });

  test('PersonasPage: Shows empty state when search returns no results', async ({ page }) => {
    // Mock some personas
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        json: [
          { id: 'p1', name: 'Test Persona', description: 'Test', category: 'general', systemPrompt: 'Test', assignedBotNames: [] }
        ]
      });
    });
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    await page.goto('/admin/personas');

    // Verify persona is present
    await expect(page.getByText('Test Persona')).toBeVisible();

    // Search for non-existent persona
    await page.getByPlaceholder('Search personas...').fill('NonExistentPersona');

    // Check for "No results found" empty state
    await expect(page.getByText('No results found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });
});
