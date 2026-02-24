import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    // Mock health/status check to prevent errors
    await page.route('**/api/dashboard/api/status', async route => route.fulfill({ json: { bots: [], uptime: 100 } }));
    await page.route('**/api/csrf-token', async route => route.fulfill({ json: { token: 'mock-csrf' } }));
  });

  test('BotsPage shows empty state when no bots configured', async ({ page }) => {
    // Mock API to return empty bots list
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });
    // Mock other necessary endpoints
    await page.route('**/api/config/global', async route => route.fulfill({ json: {} }));
    await page.route('**/api/personas', async route => route.fulfill({ json: [] }));
    await page.route('**/api/config/llm-profiles', async route => route.fulfill({ json: { profiles: { llm: [] } } }));

    await page.goto('/admin/bots');
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Create Bot' })).toBeVisible();
  });

  test('BotsPage shows empty state when search returns no results', async ({ page }) => {
     // Mock API to return some bots
    const bots = [{ id: 'bot1', name: 'Test Bot', status: 'active', connected: true, messageCount: 0, errorCount: 0, provider: 'openai', llmProvider: 'gpt-4' }];
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots } });
    });
    await page.route('**/api/config/global', async route => route.fulfill({ json: {} }));
    await page.route('**/api/personas', async route => route.fulfill({ json: [] }));
    await page.route('**/api/config/llm-profiles', async route => route.fulfill({ json: { profiles: { llm: [] } } }));

    await page.goto('/admin/bots');
    await expect(page.getByText('Test Bot')).toBeVisible();

    // Search for non-existent bot
    await page.getByPlaceholder('Search bots...').fill('NonExistentBot');
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search query')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('GuardsPage shows empty state when no profiles exist', async ({ page }) => {
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies.')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'New Profile' })).toBeVisible();
  });

  test('PersonasPage shows empty state when no personas exist', async ({ page }) => {
     await page.route('**/api/config', async route => route.fulfill({ json: { bots: [] } }));
     await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/admin/personas');
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Create Persona' })).toBeVisible();
  });

   test('PersonasPage shows empty state when search returns no results', async ({ page }) => {
     await page.route('**/api/config', async route => route.fulfill({ json: { bots: [] } }));
     const personas = [{ id: 'p1', name: 'Test Persona', description: 'desc', isBuiltIn: false, assignedBotNames: [] }];
     await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: personas });
    });

    await page.goto('/admin/personas');
    await expect(page.getByText('Test Persona')).toBeVisible();

    // Search for non-existent persona
    await page.getByPlaceholder('Search personas...').fill('NonExistentPersona');
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });
});
