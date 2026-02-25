import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Catch-all for API to prevent backend hits
    // Register this FIRST so specific handlers registered later take precedence
    await page.route('**/api/**', async (route) => {
      // Fallback for unmocked endpoints
      if (route.request().url().includes('/api/')) {
         // console.log('Unhandled API request:', route.request().url());
         await route.fulfill({ status: 404, body: 'Not mocked' });
      } else {
         await route.continue();
      }
    });

    // Mock common endpoints to avoid unhandled requests causing issues
    await page.route('**/api/config/llm-status', async route => route.fulfill({ json: { status: {} } }));
    await page.route('**/api/demo/status', async route => route.fulfill({ json: { active: false } }));
    await page.route('**/api/health/detailed', async route => route.fulfill({ json: { status: 'ok' } }));
    await page.route('**/api/config/llm-profiles', async route => route.fulfill({ json: { profiles: { llm: [] } } }));
    await page.route('**/api/admin/llm-profiles', async route => route.fulfill({ json: { profiles: { llm: [] } } }));
    await page.route('**/api/csrf-token', async route => route.fulfill({ json: { token: 'test-token' } }));
  });

  test('BotsPage shows empty state when no bots configured', async ({ page }) => {
    // Mock API to return empty bots list
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    // We also need to mock other calls to avoid errors
    await page.route('**/api/config/global', async (route) => route.fulfill({ json: {} }));
    await page.route('**/api/personas', async (route) => route.fulfill({ json: [] }));
    await page.route('**/api/admin/llm-profiles', async (route) => route.fulfill({ json: { profiles: { llm: [] } } }));

    await page.goto('/admin/bots');

    // Verify empty state
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Bot' }).first()).toBeVisible();
  });

  test('BotsPage shows no results state when search yields nothing', async ({ page }) => {
    // Mock API with some bots
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [{ id: 'bot1', name: 'Test Bot', status: 'active', provider: 'openai', llmProvider: 'gpt-4' }] } });
    });
    // Mock other calls
    await page.route('**/api/config/global', async (route) => route.fulfill({ json: {} }));
    await page.route('**/api/personas', async (route) => route.fulfill({ json: [] }));
    await page.route('**/api/admin/llm-profiles', async (route) => route.fulfill({ json: { profiles: { llm: [] } } }));
    // Mock activity/history for bots
    await page.route('**/api/bots/*/activity*', async (route) => route.fulfill({ json: { activity: [] } }));
    await page.route('**/api/bots/*/history*', async (route) => route.fulfill({ json: { history: [] } }));

    await page.goto('/admin/bots');

    // Wait for bots to load
    await expect(page.getByText('Test Bot')).toBeVisible();

    // Search for non-existent bot
    await page.fill('input[placeholder="Search bots..."]', 'NonExistentBot');

    // Verify empty search state
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('PersonasPage shows empty state when no personas configured', async ({ page }) => {
    // Mock API to return empty personas
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/config', async (route) => route.fulfill({ json: { bots: [] } }));

    await page.goto('/admin/personas');

    // Verify empty state
    await expect(page.getByText('No personas configured')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Persona' }).first()).toBeVisible();
  });

  test('PersonasPage shows no results state when search yields nothing', async ({ page }) => {
     // Mock API with some personas
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [{ id: 'p1', name: 'Test Persona', isBuiltIn: false, assignedBotNames: [], category: 'general', systemPrompt: 'test' }] });
    });
    await page.route('**/api/config', async (route) => route.fulfill({ json: { bots: [] } }));

    await page.goto('/admin/personas');

    // Wait for personas to load
    await expect(page.getByText('Test Persona')).toBeVisible();

    // Search for non-existent persona
    await page.fill('input[placeholder="Search personas..."]', 'NonExistentPersona');

    // Verify empty search state
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });

  test('GuardsPage shows empty state when no profiles configured', async ({ page }) => {
    // Mock API to return empty profiles
    await page.route(url => url.pathname.includes('/guard-profiles'), async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');

    // Verify empty state
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });
});
