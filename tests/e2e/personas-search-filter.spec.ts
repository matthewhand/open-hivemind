import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Personas Search and Filter', () => {
  test.setTimeout(90000);

  const mockPersonas = [
    {
      id: 'persona-1',
      name: 'Alpha Helper',
      description: 'The first helper',
      category: 'general',
      systemPrompt: 'You are Alpha.',
      isBuiltIn: false,
      assignedBotNames: [],
      assignedBotIds: [],
    },
    {
      id: 'persona-2',
      name: 'Beta Coder',
      description: 'Expert in code',
      category: 'technical',
      systemPrompt: 'You are Beta.',
      isBuiltIn: false,
      assignedBotNames: [],
      assignedBotIds: [],
    },
    {
      id: 'persona-3',
      name: 'Gamma Artist',
      description: 'Creative writer',
      category: 'creative',
      systemPrompt: 'You are Gamma.',
      isBuiltIn: false,
      assignedBotNames: [],
      assignedBotIds: [],
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('*/**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: [] })
      });
    });

    await page.route('*/**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPersonas)
      });
    });
  });

  test('can search personas by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.locator('input[placeholder="Search personas..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Alpha');

    // Wait for filter to apply (React state update)
    await page.waitForTimeout(500);

    const cards = page.locator('[data-testid="persona-card"]').filter({ hasText: 'Alpha Helper' });
    await expect(cards).toHaveCount(1);
    await expect(page.locator('text=Beta Coder')).not.toBeVisible();
    await expect(page.locator('text=Gamma Artist')).not.toBeVisible();

    await assertNoErrors(errors, 'Persona search');
  });

  test('can filter personas by category', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const categorySelect = page.locator('select').filter({ hasText: /All Categories/ });
    await expect(categorySelect).toBeVisible();

    await categorySelect.selectOption('technical');
    await page.waitForTimeout(500);

    const cards = page.locator('[data-testid="persona-card"]');
    // Should verify only 1 visible card
    const visibleCards = cards.filter({ hasText: 'Beta Coder' });
    await expect(visibleCards).toBeVisible();
    await expect(cards).toHaveCount(1);

    // Ensure others are hidden
    await expect(page.locator('text=Alpha Helper')).not.toBeVisible();

    await assertNoErrors(errors, 'Persona category filter');
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
     const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.locator('input[placeholder="Search personas..."]');
    await searchInput.fill('Zeta NonExistent');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Try adjusting your search or filters')).toBeVisible();

    const clearButton = page.locator('button:has-text("Clear Filters")');
    await expect(clearButton).toBeVisible();

    await clearButton.click();
    await page.waitForTimeout(500);

    const cards = page.locator('[data-testid="persona-card"]');
    // Using count is safer than strict equality if structure changes, but for mock data 3 is expected
    await expect(cards).toHaveCount(3);
    await expect(searchInput).toHaveValue('');

    await assertNoErrors(errors, 'Persona empty state and clear');
  });
});
