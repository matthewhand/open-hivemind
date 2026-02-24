import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Bots Page - No Configured Bots', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/admin/llm-profiles', async (route) => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ json: { status: 'ok' } });
    });
    // Mock status endpoint used by useLlmStatus
    await page.route('**/api/config/message-status', async (route) => { await route.fulfill({ json: { status: 'ok' } }); });

    await page.goto('/admin/bots');

    // Assert Empty State
    await expect(page.getByText('No bots configured')).toBeVisible();
    await expect(page.getByText('Create a bot configuration to get started')).toBeVisible();
    // Use .last() or filter to target the button in the empty state (since header has one too)
    await expect(page.getByRole('button', { name: 'Create Bot' }).last()).toBeVisible();
  });

  test('Bots Page - No Search Results', async ({ page }) => {
    // Mock API responses with some data
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        json: {
          bots: [
            {
              id: 'test-bot',
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
    // Other mocks needed for page load
    await page.route('**/api/config/global', async (route) => { await route.fulfill({ json: {} }); });
    await page.route('**/api/personas', async (route) => { await route.fulfill({ json: [] }); });
    await page.route('**/api/admin/llm-profiles', async (route) => { await route.fulfill({ json: { profiles: { llm: [] } } }); });
    await page.route('**/api/health', async (route) => { await route.fulfill({ json: { status: 'ok' } }); });

    // Mock status endpoint used by useLlmStatus
    await page.route('**/api/config/message-status', async (route) => { await route.fulfill({ json: { status: 'ok' } }); });


    await page.goto('/admin/bots');
    await expect(page.getByText('Test Bot')).toBeVisible();

    // Perform Search
    await page.fill('input[placeholder="Search bots..."]', 'NonExistentBot');

    // Assert Empty State
    await expect(page.getByText('No bots found matching "NonExistentBot"')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();

    // Clear Search
    await page.click('button:has-text("Clear Search")');
    await expect(page.getByText('Test Bot')).toBeVisible();
  });

  test('Guards Page - No Profiles', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto('/admin/guards');

    // Assert Empty State
    await expect(page.getByText('No Guard Profiles')).toBeVisible();
    await expect(page.getByText('Create a guard profile to enforce security policies')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();
  });

  test('Personas Page - No Personas', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/config', async (route) => { await route.fulfill({ json: { bots: [] } }); });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/admin/personas');

    // Assert Empty State
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Create your first persona to get started')).toBeVisible();
    // Use .last() or filter to target the button in the empty state
    await expect(page.getByRole('button', { name: 'Create Persona' }).last()).toBeVisible();
  });

  test('Personas Page - No Search Results', async ({ page }) => {
    // Mock API responses with data
    await page.route('**/api/config', async (route) => { await route.fulfill({ json: { bots: [] } }); });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'p1',
            name: 'Helper Persona',
            description: 'A helpful assistant',
            category: 'general',
            systemPrompt: 'You are helpful.',
            isBuiltIn: false,
            assignedBotNames: [],
            assignedBotIds: [],
          },
        ],
      });
    });

    await page.goto('/admin/personas');
    await expect(page.getByText('Helper Persona')).toBeVisible();

    // Perform Search
    await page.fill('input[placeholder="Search personas..."]', 'NonExistentPersona');

    // Assert Empty State
    await expect(page.getByText('No personas found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search or filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();

    // Clear Filters
    await page.click('button:has-text("Clear Filters")');
    await expect(page.getByText('Helper Persona')).toBeVisible();
  });
});
