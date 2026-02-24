import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    // Mock global config for all tests
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/llm/profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });
  });

  test('Bots Page shows empty state when no bots configured', async ({ page }) => {
    // Mock bots response as empty
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });
    await page.route('**/api/personas', async (route) => {
        await route.fulfill({ json: [] });
    });

    await page.goto('/admin/bots');
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // Use .first() or .last() to resolve strict mode violation as header also has this button
    await expect(page.getByRole('button', { name: 'Create Bot' }).last()).toBeVisible();
  });

  test('Bots Page shows search empty state', async ({ page }) => {
     // Mock bots response with one bot
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [{ id: 'bot1', name: 'Existing Bot', status: 'active', connected: true }] } });
    });
    await page.route('**/api/personas', async (route) => {
        await route.fulfill({ json: [] });
    });

    await page.goto('/admin/bots');
    await expect(page.getByText('Existing Bot')).toBeVisible();

    // Search for non-existent bot
    await page.fill('input[placeholder="Search bots..."]', 'NonExistentBot');
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search criteria')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('Guards Page shows empty state when no profiles', async ({ page }) => {
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies and access controls.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page shows empty state when no personas', async ({ page }) => {
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/admin/personas');
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    // Use .first() or .last() to resolve strict mode violation as header also has this button
    await expect(page.getByRole('button', { name: 'Create Persona' }).last()).toBeVisible();
  });

    test('Personas Page shows search empty state', async ({ page }) => {
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [{ id: 'p1', name: 'Existing Persona', description: 'Test', isBuiltIn: false, assignedBotNames: [] }] });
    });

    await page.goto('/admin/personas');
    await expect(page.getByText('Existing Persona')).toBeVisible();

    // Search for non-existent persona
    await page.fill('input[placeholder="Search personas..."]', 'NonExistentPersona');
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });
});
