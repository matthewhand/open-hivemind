import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock global config for all tests as it's commonly requested
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });

    // Mock LLM profiles
    await page.route('**/api/config/llm-profiles', async (route) => {
        await route.fulfill({ json: { profiles: { llm: [] } } });
    });

    // Mock CSRF token
    await page.route('**/api/csrf-token', async (route) => {
        await route.fulfill({ json: { token: 'mock-csrf-token' } });
    });
  });

  test('Bots Page: No bots configured', async ({ page }) => {
    // Mock empty bots config - use regex to match end of path to avoid shadowing /api/config/global
    await page.route(/\/api\/config$/, async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    // Mock personas as BotsPage fetches them
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/admin/bots');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // Use first() because there might be another "Create Bot" button in the header
    await expect(page.getByRole('button', { name: 'Create Bot' }).last()).toBeVisible();
  });

  test('Bots Page: No bots found (search)', async ({ page }) => {
    // Mock some bots
    await page.route(/\/api\/config$/, async (route) => {
      await route.fulfill({ json: { bots: [
          { id: 'bot1', name: 'Test Bot 1', provider: 'openai', connected: true, status: 'active', messageCount: 0, errorCount: 0 }
      ] } });
    });
     // Mock personas
     await page.route('**/api/personas', async (route) => {
        await route.fulfill({ json: [] });
      });

    await page.goto('/admin/bots');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Test Bot 1')).toBeVisible();

    // Search for nonexistent bot
    const searchInput = page.getByPlaceholder('Search bots...');
    await searchInput.fill('NonexistentBot');

    await expect(page.getByText('No bots found matching "NonexistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('Guards Page: No profiles', async ({ page }) => {
    // Mock empty guard profiles
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page: No personas found', async ({ page }) => {
    // Mock empty personas
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    // Mock config (bots) as PersonasPage fetches it to check assignments
    await page.route(/\/api\/config$/, async (route) => {
        await route.fulfill({ json: { bots: [] } });
      });

    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    // First create persona button is likely in header
    await expect(page.getByRole('button', { name: 'Create Persona' }).last()).toBeVisible();
  });
});
