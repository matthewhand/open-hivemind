import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Default mocks to prevent 404s/errors
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });
    await page.route('**/api/health', async (route) => {
        await route.fulfill({ status: 200, json: { status: 'ok' } });
    });
  });

  test('Bots Page shows empty state when no bots exist', async ({ page }) => {
    // Mock bots API to return empty list
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/admin/bots');
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Bot' }).first()).toBeVisible();
  });

  test('Bots Page shows no results state when search yields nothing', async ({ page }) => {
    // Mock bots API with one bot
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        json: {
          bots: [{
            id: 'bot1',
            name: 'Existing Bot',
            provider: 'openai',
            connected: true,
            status: 'active',
            messageCount: 0,
            errorCount: 0
          }]
        }
      });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/admin/bots');
    await expect(page.getByText('Existing Bot')).toBeVisible();

    // Search for non-existent bot
    await page.getByPlaceholder('Search bots...').fill('NonExistentBot');

    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('Guards Page shows empty state when no profiles exist', async ({ page }) => {
    // Mock guards API
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page shows empty state when no personas exist', async ({ page }) => {
    // Mock personas API
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    // Mock config
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    await page.goto('/admin/personas');
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Persona' }).first()).toBeVisible();
  });

   test('Personas Page shows no results state when search yields nothing', async ({ page }) => {
    // Mock personas API with some personas
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        json: [{
          id: 'p1',
          name: 'Existing Persona',
          description: 'Test',
          isBuiltIn: false,
          category: 'general',
          systemPrompt: 'You are a helper.',
          assignedBotNames: []
        }]
      });
    });
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    await page.goto('/admin/personas');
    await expect(page.getByText('Existing Persona')).toBeVisible();

    // Search for non-existent persona
    await page.getByPlaceholder('Search personas...').fill('NonExistentPersona');

    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });
});
