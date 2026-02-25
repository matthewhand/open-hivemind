import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock common endpoints to prevent 404s/errors
    await page.route('**/api/csrf-token', async route => {
      await route.fulfill({ json: { token: 'mock-token' } });
    });

    // Default mocks (can be overridden in specific tests)
    await page.route('**/api/config/global', async route => {
        await route.fulfill({ json: {} });
    });
    await page.route('**/api/config/llm-profiles', async route => {
        await route.fulfill({ json: { profiles: { llm: [] } } });
    });
    // Mock LLM status used by hooks
    await page.route('**/api/config/llm-status', async route => {
        await route.fulfill({ json: { defaultConfigured: false, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } });
    });
    // Mock health check
    await page.route('**/api/dashboard/api/status', async route => {
        await route.fulfill({ json: { bots: [], uptime: 100 } });
    });
  });

  test('Bots Page shows empty state when no bots configured', async ({ page }) => {
    // Mock API to return no bots
    await page.route('**/api/config', async route => {
        await route.fulfill({ json: { bots: [] } });
    });
    await page.route('**/api/personas', async route => {
        await route.fulfill({ json: [] });
    });

    await page.goto('/admin/bots');

    // Verify empty state
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // Use last() because there is also a "Create Bot" button in the page header
    await expect(page.getByRole('button', { name: 'Create Bot' }).last()).toBeVisible();
  });

  test('Bots Page shows search empty state', async ({ page }) => {
      // Mock with one bot
      const mockBots = [{
          id: 'bot1',
          name: 'Test Bot',
          provider: 'openai',
          llmProvider: 'openai',
          status: 'active',
          connected: true,
          messageCount: 0,
          errorCount: 0
      }];

      await page.route('**/api/config', async route => {
          await route.fulfill({ json: { bots: mockBots } });
      });
      await page.route('**/api/personas', route => route.fulfill({ json: [] }));

      // Mock activity logs/history for the bot to avoid errors if it tries to fetch on load (though it shouldn't unless preview)
      await page.route('**/api/bots/*/activity*', route => route.fulfill({ json: { activity: [] } }));
      await page.route('**/api/bots/*/history*', route => route.fulfill({ json: { history: [] } }));

      await page.goto('/admin/bots');

      // Verify bot is visible. Use heading or strong tag to be specific.
      // BotsPage renders bot name in a span with font-bold text-lg
      await expect(page.locator('span.font-bold', { hasText: 'Test Bot' })).toBeVisible();

      // Search for non-existent bot
      await page.getByPlaceholder('Search bots...').fill('NonExistentBot');

      // Verify search empty state
      await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
      await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();

      // Verify clear search works
      await page.getByRole('button', { name: 'Clear Search' }).click();
      await expect(page.locator('span.font-bold', { hasText: 'Test Bot' })).toBeVisible();
  });

  test('Guards Page shows empty state when no profiles', async ({ page }) => {
      // Mock empty profiles
      await page.route('**/api/admin/guard-profiles', async route => {
          await route.fulfill({ json: { data: [] } });
      });

      await page.goto('/admin/guards');

      // Verify empty state
      await expect(page.getByText('No Guard Profiles')).toBeVisible();
      await expect(page.getByText('Create a guard profile to enforce security policies.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page shows empty state when no personas', async ({ page }) => {
      // Mock empty personas
      await page.route('**/api/personas', async route => {
          await route.fulfill({ json: [] });
      });
      await page.route('**/api/config', async route => {
          await route.fulfill({ json: { bots: [] } });
      });

      await page.goto('/admin/personas');

      // Verify empty state
      await expect(page.getByText('No personas found')).toBeVisible();
      await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    // Use last() because there is also a "Create Persona" button in the page header
    await expect(page.getByRole('button', { name: 'Create Persona' }).last()).toBeVisible();
  });

  test('Personas Page shows search empty state', async ({ page }) => {
      // Mock with one persona
      const mockPersonas = [{
          id: 'p1',
          name: 'Test Persona',
          description: 'A test persona',
          category: 'general',
          systemPrompt: 'You are a test.',
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      }];

      await page.route('**/api/personas', async route => {
          await route.fulfill({ json: mockPersonas });
      });
      await page.route('**/api/config', async route => {
          await route.fulfill({ json: { bots: [] } });
      });

      await page.goto('/admin/personas');

      // Verify persona is visible. Use heading to be specific and avoid matching description or other text.
      await expect(page.getByRole('heading', { name: 'Test Persona' })).toBeVisible();

      // Search for non-existent persona
      await page.getByPlaceholder('Search personas...').fill('NonExistent');

      // Verify search empty state (secondary variant)
      await expect(page.getByText('No personas found')).toBeVisible();
      await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();

      // Verify clear filters works
      await page.getByRole('button', { name: 'Clear Filters' }).click();
      await expect(page.getByRole('heading', { name: 'Test Persona' })).toBeVisible();
  });
});
