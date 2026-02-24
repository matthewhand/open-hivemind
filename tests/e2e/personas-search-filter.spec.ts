import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Personas Search and Filter', () => {
  const mockPersonas = [
    {
      id: 'p1',
      name: 'Alpha Helper',
      description: 'A general helper bot',
      category: 'general',
      systemPrompt: 'You are alpha.',
      isBuiltIn: false,
    },
    {
      id: 'p2',
      name: 'Beta Coder',
      description: 'Expert in coding',
      category: 'technical',
      systemPrompt: 'You are beta.',
      isBuiltIn: false,
    },
    {
      id: 'p3',
      name: 'Gamma Artist',
      description: 'Creative painter',
      category: 'creative',
      systemPrompt: 'You are gamma.',
      isBuiltIn: false,
    },
    {
      id: 'p4',
      name: 'Delta Support',
      description: 'Customer support agent',
      category: 'customer_service',
      systemPrompt: 'You are delta.',
      isBuiltIn: false,
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock Config API
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: [] }),
      });
    });

    // Mock Personas API
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPersonas),
      });
    });
  });

  test('should filter personas by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');
    await expect(searchInput).toBeVisible();

    // Search for "Beta"
    await searchInput.fill('Beta');
    await page.waitForTimeout(500); // Wait for filter to apply

    // Check results
    const personaCards = page.locator('.card:has-text("System Prompt")');
    await expect(personaCards).toHaveCount(1);
    await expect(personaCards.first()).toContainText('Beta Coder');

    await assertNoErrors(errors, 'Filter by name');
  });

  test('should filter personas by description', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');

    // Search for "painter" (in description of Gamma)
    await searchInput.fill('painter');
    await page.waitForTimeout(500);

    const personaCards = page.locator('.card:has-text("System Prompt")');
    await expect(personaCards).toHaveCount(1);
    await expect(personaCards.first()).toContainText('Gamma Artist');

    await assertNoErrors(errors, 'Filter by description');
  });

  test('should filter personas by category', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Find the select element.
    const categorySelect = page.locator('select').filter({ hasText: 'All Categories' });

    await categorySelect.selectOption('technical');
    await page.waitForTimeout(500);

    const personaCards = page.locator('.card:has-text("System Prompt")');
    await expect(personaCards).toHaveCount(1);
    await expect(personaCards.first()).toContainText('Beta Coder');

    await assertNoErrors(errors, 'Filter by category');
  });

  test('should show no results when no match', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');
    await searchInput.fill('Omega'); // Non-existent
    await page.waitForTimeout(500);

    const personaCards = page.locator('.card:has-text("System Prompt")');
    await expect(personaCards).toHaveCount(0);

    await expect(page.getByText('No matching personas found')).toBeVisible();

    await assertNoErrors(errors, 'No results state');
  });

  test('should clear filters', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');
    await searchInput.fill('Omega');
    await expect(page.getByText('No matching personas found')).toBeVisible();

    const clearButton = page.getByRole('button', { name: 'Clear Filters' });
    await clearButton.click();
    await page.waitForTimeout(500);

    const personaCards = page.locator('.card:has-text("System Prompt")');
    await expect(personaCards).toHaveCount(4);

    await assertNoErrors(errors, 'Clear filters');
  });
});
