import { test, expect } from '@playwright/test';
import { setupAuth, setupErrorCollection } from './test-utils';

test.describe('Empty State Verification', () => {
  test.beforeEach(async ({ page }) => {
    setupErrorCollection(page);
    await setupAuth(page);
    // Mock common endpoints to prevent errors
    await page.route('**/api/csrf-token', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ csrfToken: 'mock-token' }) }));
    await page.route('**/api/dashboard/api/status', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) }));
  });

  test('BotsPage should show empty state when no bots configured', async ({ page }) => {
    // Mock API to return empty bots list
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: [] }),
      });
    });

    // Mock dependencies
    await page.route('**/api/config/global', async (route) => route.fulfill({ status: 200, body: JSON.stringify({}) }));
    await page.route('**/api/personas', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/api/integrations/llm/profiles', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ profiles: { llm: [] } }) }));

    await page.goto('/admin/bots');

    // Verify empty state
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // There are two "Create Bot" buttons (one in header, one in empty state). Verify the one in empty state.
    const emptyState = page.locator('div').filter({ hasText: 'No bots configured' }).filter({ hasText: 'Create Bot' }).last();
    await expect(emptyState.getByRole('button', { name: 'Create Bot' })).toBeVisible();
  });

  test('BotsPage should show search empty state', async ({ page }) => {
     // Mock API to return some bots
    const mockBots = [{
        id: 'bot-1',
        name: 'Test Bot',
        provider: 'openai',
        status: 'active',
        connected: true,
        messageCount: 0,
        errorCount: 0
    }];

    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: mockBots }),
      });
    });
    // Mock dependencies
    await page.route('**/api/config/global', async (route) => route.fulfill({ status: 200, body: JSON.stringify({}) }));
    await page.route('**/api/personas', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/api/integrations/llm/profiles', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ profiles: { llm: [] } }) }));
    await page.route('**/api/bots/bot-1/activity?limit=20', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ activity: [] }) }));
    await page.route('**/api/bots/bot-1/history?limit=20', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ history: [] }) }));


    await page.goto('/admin/bots');

    // Ensure bot is visible first
    await expect(page.getByText('Test Bot')).toBeVisible();

    // Search for non-existent bot
    await page.getByPlaceholder('Search bots...').fill('NonExistentBot');

    // Verify search empty state
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('GuardsPage should show empty state when no profiles', async ({ page }) => {
    // Mock API
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/admin/guards');

    // Verify empty state
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('PersonasPage should show empty state when no personas', async ({ page }) => {
    // Mock API
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
     // Mock deps
    await page.route('**/api/config', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ bots: [] }) }));

    await page.goto('/admin/personas');

    // Verify empty state
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    // Two buttons (header + empty state)
    const emptyState = page.locator('div').filter({ hasText: 'No personas found' }).filter({ hasText: 'Create Persona' }).last();
    await expect(emptyState.getByRole('button', { name: 'Create Persona' })).toBeVisible();
  });

  test('PersonasPage should show search empty state', async ({ page }) => {
     // Mock API
    const mockPersonas = [{
        id: 'p1',
        name: 'Test Persona',
        description: 'Test Desc',
        systemPrompt: 'You are test',
        category: 'general',
        isBuiltIn: false
    }];

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPersonas),
      });
    });
    // Mock deps
    await page.route('**/api/config', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ bots: [] }) }));

    await page.goto('/admin/personas');

    // Ensure persona is visible
    await expect(page.getByText('Test Persona')).toBeVisible();

    // Search
    await page.getByPlaceholder('Search personas...').fill('NonExistent');

    // Verify search empty state
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });
});
