import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    // Mock global config
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: {} });
    });
    // Mock global settings
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });
    // Mock LLM profiles
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });
    // Mock personas
    await page.route('**/api/personas', async (route) => {
        await route.fulfill({ json: [] });
    });
    // Mock bots (default empty)
    await page.route('**/api/bots', async (route) => {
        await route.fulfill({ json: [] });
    });
    // Mock guards (default empty)
    await page.route('**/api/admin/guard-profiles', async (route) => {
        await route.fulfill({ json: { data: [] } });
    });
    // Mock health/status endpoints to prevent network errors
    await page.route('**/api/health', async (route) => route.fulfill({ json: { status: 'ok' } }));
    await page.route('**/api/dashboard/api/status', async (route) => route.fulfill({ json: { status: 'ok' } }));
    await page.route('**/api/csrf-token', async (route) => route.fulfill({ json: { token: 'fake-csrf-token' } }));
    await page.route('**/api/config/llm-status', async (route) => route.fulfill({ json: { defaultConfigured: false, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } }));
    await page.route('**/api/health/detailed', async (route) => route.fulfill({ json: { status: 'ok' } }));
    await page.route('**/api/demo/status', async (route) => route.fulfill({ json: { active: false } }));
  });

  test('Bots Page shows empty state when no bots configured', async ({ page }) => {
    await page.goto('/admin/bots');
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // Use .last() to pick the empty state button if multiple exist (header + empty state)
    await expect(page.getByRole('button', { name: 'Create Bot' }).last()).toBeVisible();
  });

  test('Bots Page shows empty state when search returns no results', async ({ page }) => {
    // Mock one bot so the initial state is not empty
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        json: {
          bots: [
            { id: 'bot1', name: 'Test Bot', description: 'Test', provider: 'openai', llmProvider: 'openai', status: 'active', connected: true, messageCount: 0, errorCount: 0 }
          ]
        }
      });
    });

    await page.goto('/admin/bots');
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.getByText('Test Bot', { exact: true })).toBeVisible();

    // Search for non-existent bot
    await page.getByPlaceholder('Search bots...').fill('NonExistentBot');
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('Guards Page shows empty state when no profiles exist', async ({ page }) => {
    await page.goto('/admin/guards');
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page shows empty state when no personas exist', async ({ page }) => {
     await page.route('**/api/personas', async (route) => {
        await route.fulfill({ json: [] });
    });
    await page.goto('/admin/personas');
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    // Use .last() to avoid strict mode violation
    await expect(page.getByRole('button', { name: 'Create Persona' }).last()).toBeVisible();
  });

  test('Personas Page shows empty state when search returns no results', async ({ page }) => {
     await page.route('**/api/personas', async (route) => {
        await route.fulfill({ json: [
            { id: 'p1', name: 'Test Persona', description: 'Test', isBuiltIn: false, category: 'general', systemPrompt: 'You are a test.' }
        ] });
    });
    await page.goto('/admin/personas');
    await expect(page.getByText('Test Persona')).toBeVisible();

    // Search for non-existent persona
    await page.getByPlaceholder('Search personas...').fill('NonExistentPersona');
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });
});
