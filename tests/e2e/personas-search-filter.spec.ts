import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Personas Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Config API
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [],
          llm_providers: [],
          messenger_providers: [],
        }),
      });
    });

    // Mock Personas API
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'p1',
            name: 'Support Bot',
            description: 'Helps customers with issues',
            category: 'customer_service',
            systemPrompt: 'You are a helpful support agent.',
            isBuiltIn: false,
          },
          {
            id: 'p2',
            name: 'Creative Writer',
            description: 'Writes stories and poems',
            category: 'creative',
            systemPrompt: 'You are a creative writer.',
            isBuiltIn: false,
          },
          {
            id: 'p3',
            name: 'Code Master',
            description: 'Expert in Python and TypeScript',
            category: 'technical',
            systemPrompt: 'You are a coding expert.',
            isBuiltIn: false,
          },
          {
            id: 'p4',
            name: 'Generic Helper',
            description: 'General purpose assistant',
            category: 'general',
            systemPrompt: 'You are a helpful assistant.',
            isBuiltIn: true,
          },
        ]),
      });
    });
  });

  test('filters personas by search query', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Search for "Code"
    const searchInput = page.getByPlaceholder('Search personas...');
    await searchInput.fill('Code');

    // Verify "Code Master" is visible
    await expect(page.getByRole('heading', { name: 'Code Master' })).toBeVisible();

    // Verify others are hidden
    await expect(page.getByRole('heading', { name: 'Support Bot' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Creative Writer' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Generic Helper' })).toBeHidden();

    await assertNoErrors(errors, 'Search filter');
  });

  test('filters personas by category', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Select "Creative" category - use specific class to avoid modal's select
    const categorySelect = page.locator('select.select-sm');
    await categorySelect.selectOption('creative');

    // Verify "Creative Writer" is visible
    await expect(page.getByRole('heading', { name: 'Creative Writer' })).toBeVisible();

    // Verify others are hidden
    await expect(page.getByRole('heading', { name: 'Support Bot' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Code Master' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Generic Helper' })).toBeHidden();

    await assertNoErrors(errors, 'Category filter');
  });

  test('shows empty state when no matches found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Search for non-existent term
    const searchInput = page.getByPlaceholder('Search personas...');
    await searchInput.fill('NonExistentPersonaXYZ');

    // Verify "No matching personas found" message
    await expect(page.getByText('No matching personas found')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();

    // Verify no cards are shown
    await expect(page.getByRole('heading', { name: 'Support Bot' })).toBeHidden();

    await assertNoErrors(errors, 'Empty search state');
  });

  test('clears filters', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Apply search
    const searchInput = page.getByPlaceholder('Search personas...');
    await searchInput.fill('NonExistentPersonaXYZ');
    await expect(page.getByText('No matching personas found')).toBeVisible();

    // Click Clear Filters
    await page.getByRole('button', { name: 'Clear Filters' }).click();

    // Verify search is cleared
    await expect(searchInput).toHaveValue('');

    // Verify all personas are back
    await expect(page.getByRole('heading', { name: 'Support Bot' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Creative Writer' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Code Master' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Generic Helper' })).toBeVisible();

    await assertNoErrors(errors, 'Clear filters');
  });
});
