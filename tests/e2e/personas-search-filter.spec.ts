import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Personas Search and Filter', () => {
  const mockPersonas = [
    {
      id: 'p1',
      name: 'General Assistant',
      description: 'A helpful general assistant',
      category: 'general',
      systemPrompt: 'You are a helpful assistant.',
      traits: [],
      assignedBotNames: ['Bot1'],
      assignedBotIds: ['b1'],
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'p2',
      name: 'Customer Support',
      description: 'Helps with customer queries',
      category: 'customer_service',
      systemPrompt: 'You are a customer support agent.',
      traits: [],
      assignedBotNames: [],
      assignedBotIds: [],
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'p3',
      name: 'Creative Writer',
      description: 'writes creative content',
      category: 'creative',
      systemPrompt: 'You are a creative writer.',
      traits: [],
      assignedBotNames: [],
      assignedBotIds: [],
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockConfig = {
    bots: [
      { id: 'b1', name: 'Bot1', persona: 'p1' },
    ],
    warnings: [],
    legacyMode: false,
    environment: 'development'
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConfig)
      });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPersonas)
      });
    });
  });

  test('should filter personas by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Initial state: all 3 personas visible
    // We filter by cards that have "System Prompt" text to distinguish from stats cards
    const personaCards = page.locator('.card').filter({ hasText: 'System Prompt' });
    await expect(personaCards).toHaveCount(3);

    // Search for "General"
    const searchInput = page.locator('input[placeholder="Search personas..."]');
    await searchInput.fill('General');
    await expect(personaCards).toHaveCount(1);
    await expect(personaCards).toContainText('General Assistant');

    // Search for "Support"
    await searchInput.fill('Support');
    await expect(personaCards).toHaveCount(1);
    await expect(personaCards).toContainText('Customer Support');

    await assertNoErrors(errors, 'Filter by name');
  });

  test('should filter personas by category', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const personaCards = page.locator('.card').filter({ hasText: 'System Prompt' });

    // Select "Creative" category
    // The Select component uses a native select element
    await page.selectOption('select', 'creative');

    await expect(personaCards).toHaveCount(1);
    await expect(personaCards).toContainText('Creative Writer');

    // Select "All Categories"
    await page.selectOption('select', 'all');
    await expect(personaCards).toHaveCount(3);

    await assertNoErrors(errors, 'Filter by category');
  });

  test('should show no results when no match', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const personaCards = page.locator('.card').filter({ hasText: 'System Prompt' });

    // Search for non-existent persona
    const searchInput = page.locator('input[placeholder="Search personas..."]');
    await searchInput.fill('NonExistentPersona');

    await expect(personaCards).toHaveCount(0);
    await expect(page.getByText('No matching personas found')).toBeVisible();

    // Clear filters
    await page.click('button:has-text("Clear Filters")');
    await expect(personaCards).toHaveCount(3);

    await assertNoErrors(errors, 'No results state');
  });
});
