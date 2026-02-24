import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

// Note: This test file and feature are considered a duplicate of PR #318.
test.describe('Personas Search and Filter', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    page.on('request', request => console.log('>>', request.method(), request.url()));

    // Mock the personas response
    await page.route('**/api/personas', async (route) => {
      const personas = [
        {
          id: 'p1',
          name: 'Customer Support Agent',
          description: 'Handles customer inquiries',
          category: 'customer_service',
          systemPrompt: 'You are a helpful support agent.',
          traits: [],
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedBotNames: [],
          assignedBotIds: [],
        },
        {
          id: 'p2',
          name: 'Creative Writer',
          description: 'Writes stories and poems',
          category: 'creative',
          systemPrompt: 'You are a creative writer.',
          traits: [],
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedBotNames: [],
          assignedBotIds: [],
        },
        {
          id: 'p3',
          name: 'Tech Expert',
          description: 'Helps with coding',
          category: 'technical',
          systemPrompt: 'You are a technical expert.',
          traits: [],
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedBotNames: [],
          assignedBotIds: [],
        },
      ];
      await route.fulfill({ json: personas });
    });

    // Mock the config response (needed for page load)
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        json: {
          bots: [],
          warnings: [],
          legacyMode: false,
          environment: 'test',
        },
      });
    });

    // Mock other endpoints to prevent networkidle timeout
    await page.route('**/api/demo/status', async (route) => route.fulfill({ json: { mode: 'disabled' } }));
    await page.route('**/api/config/llm-status', async (route) => route.fulfill({ json: { status: 'ok' } }));
    await page.route('**/api/health/detailed', async (route) => route.fulfill({ json: { status: 'healthy' } }));
  });

  test('can search for a persona by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Verify search input exists
    const searchInput = page.getByPlaceholder('Search personas...');
    await expect(searchInput).toBeVisible();

    // Search for "Creative"
    await searchInput.fill('Creative');

    // Expect "Creative Writer" to be visible
    await expect(page.locator('h3', { hasText: 'Creative Writer' })).toBeVisible();

    // Expect "Tech Expert" to NOT be visible
    await expect(page.locator('h3', { hasText: 'Tech Expert' })).not.toBeVisible();

    await assertNoErrors(errors, 'Persona search by name');
  });

  test('can filter personas by category', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    // Verify category dropdown exists
    const categorySelect = page.locator('select').filter({ hasText: 'All Categories' });
    await expect(categorySelect).toBeVisible();

    // Select "Technical"
    await categorySelect.selectOption('technical');

    // Expect "Tech Expert" to be visible
    await expect(page.locator('h3', { hasText: 'Tech Expert' })).toBeVisible();

    // Expect "Creative Writer" to NOT be visible
    await expect(page.locator('h3', { hasText: 'Creative Writer' })).not.toBeVisible();

    await assertNoErrors(errors, 'Persona filter by category');
  });

  test('can combine search and category filter', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');
    const categorySelect = page.locator('select').filter({ hasText: 'All Categories' });

    // Search for "Expert" (should match Tech Expert)
    await searchInput.fill('Expert');

    // Select "Technical" category
    await categorySelect.selectOption('technical');

    // Expect "Tech Expert" to be visible
    await expect(page.locator('h3', { hasText: 'Tech Expert' })).toBeVisible();

    // Change category to "Creative" (should show nothing as Tech Expert is not Creative)
    await categorySelect.selectOption('creative');
    await expect(page.locator('h3', { hasText: 'Tech Expert' })).not.toBeVisible();

    await assertNoErrors(errors, 'Persona combined search and filter');
  });

  test('shows no results when no match found', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/personas');

    const searchInput = page.getByPlaceholder('Search personas...');

    // Search for non-existent name
    await searchInput.fill('NonExistentPersonaName');

    await expect(page.locator('h3', { hasText: 'Customer Support Agent' })).not.toBeVisible();
    await expect(page.locator('h3', { hasText: 'Creative Writer' })).not.toBeVisible();
    await expect(page.locator('h3', { hasText: 'Tech Expert' })).not.toBeVisible();

    await assertNoErrors(errors, 'Persona no results');
  });
});
