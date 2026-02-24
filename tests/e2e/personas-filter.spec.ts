import { expect, test } from '@playwright/test';
// import { navigateAndWaitReady } from './test-utils'; // Custom implementation to avoid networkidle issues

async function navigateAndReady(page, url) {
  await page.goto(url);
  // Wait for the main content to be visible instead of networkidle
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Personas Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Mock CSRF Token
    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'mock-token' }),
      });
    });

    // Mock Config API
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [],
          warnings: [],
          legacyMode: false,
          environment: 'test',
        }),
      });
    });

    // Mock Personas API with diverse data
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'Alpha Helper',
            description: 'A general helper bot',
            category: 'general',
            systemPrompt: 'You are Alpha.',
            traits: [],
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedBotNames: [],
            assignedBotIds: [],
          },
          {
            id: '2',
            name: 'Beta Coder',
            description: 'Expert in code',
            category: 'technical',
            systemPrompt: 'You are Beta.',
            traits: [],
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedBotNames: [],
            assignedBotIds: [],
          },
          {
            id: '3',
            name: 'Gamma Artist',
            description: 'Creative writer',
            category: 'creative',
            systemPrompt: 'You are Gamma.',
            traits: [],
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedBotNames: [],
            assignedBotIds: [],
          },
        ]),
      });
    });
  });

  test('displays all personas initially', async ({ page }) => {
    await navigateAndReady(page, '/admin/personas');
    await expect(page.getByText('Alpha Helper', { exact: true })).toBeVisible();
    await expect(page.getByText('Beta Coder', { exact: true })).toBeVisible();
    await expect(page.getByText('Gamma Artist', { exact: true })).toBeVisible();
  });

  test('filters by search term', async ({ page }) => {
    await navigateAndReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');
    await searchInput.fill('Alpha');

    await expect(page.getByText('Alpha Helper', { exact: true })).toBeVisible();
    await expect(page.getByText('Beta Coder', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Gamma Artist', { exact: true })).not.toBeVisible();

    await searchInput.fill('writer'); // Matches description of Gamma
    await expect(page.getByText('Alpha Helper', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Beta Coder', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Gamma Artist', { exact: true })).toBeVisible();
  });

  test('filters by category', async ({ page }) => {
    await navigateAndReady(page, '/admin/personas');

    // Select dropdown
    const categorySelect = page.locator('select').filter({ hasText: 'All Categories' });
    await expect(categorySelect).toBeVisible();

    await categorySelect.selectOption('technical');

    await expect(page.getByText('Alpha Helper', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Beta Coder', { exact: true })).toBeVisible();
    await expect(page.getByText('Gamma Artist', { exact: true })).not.toBeVisible();
  });

  test('combines search and category filter', async ({ page }) => {
    await navigateAndReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');
    const categorySelect = page.locator('select').filter({ hasText: 'All Categories' });

    // "e" is in all names/descriptions effectively or lets use empty search
    await searchInput.fill('');
    await categorySelect.selectOption('creative');

    await expect(page.getByText('Alpha Helper', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Beta Coder', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Gamma Artist', { exact: true })).toBeVisible();

    // Now refine with search
    await searchInput.fill('Alpha'); // Alpha is general, so it shouldn't show up in creative filter
    await expect(page.getByText('Alpha Helper', { exact: true })).not.toBeVisible();
    await expect(page.getByText('No matching personas found')).toBeVisible();
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
    await navigateAndReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');
    await searchInput.fill('NonexistentPersona');

    await expect(page.getByText('No matching personas found')).toBeVisible();
    await expect(page.getByText('Alpha Helper', { exact: true })).not.toBeVisible();

    // Clear filters button check
    await page.getByRole('button', { name: 'Clear Filters' }).click();

    await expect(page.getByText('Alpha Helper', { exact: true })).toBeVisible();
    await expect(searchInput).toHaveValue('');
  });
});
