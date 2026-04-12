import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * Quality E2E Tests for Specs Page
 * Tests specification browsing, search, and navigation
 */

test.describe('Specs Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock specs list - matches actual Spec type
    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'spec-1',
              topic: 'Bot Creation Specification',
              tags: ['functional', 'integration', 'testing'],
              author: 'admin',
              timestamp: new Date().toISOString(),
            },
            {
              id: 'spec-2',
              topic: 'MCP Integration Test',
              tags: ['integration', 'mcp'],
              author: 'developer',
              timestamp: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: 'spec-3',
              topic: 'Security Validation',
              tags: ['security', 'audit'],
              author: 'security-team',
              timestamp: new Date(Date.now() - 172800000).toISOString(),
            },
          ],
        },
      });
    });
  });

  test('displays specs page with correct structure', async ({ page }) => {
    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Verify page container
    await expect(page.getByTestId('specs-page')).toBeVisible();

    // Verify title
    await expect(page.getByRole('heading', { name: /specifications/i })).toBeVisible();
  });

  test('displays specs list with data', async ({ page }) => {
    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Should show spec cards
    await expect(page.getByTestId('specs-grid')).toBeVisible();

    // Should show spec topics
    await expect(page.getByText('Bot Creation Specification')).toBeVisible();
    await expect(page.getByText('MCP Integration Test')).toBeVisible();
  });

  test('displays spec count summary', async ({ page }) => {
    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Should show spec count
    const countEl = page.getByTestId('specs-count');
    await expect(countEl).toBeVisible();
    await expect(countEl).toContainText('3 specification');
  });

  test('has search input functional', async ({ page }) => {
    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Search input should be visible
    const searchInput = page.getByTestId('specs-search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();

    // Type search term
    await searchInput.fill('security');
    await page.waitForTimeout(350); // debounce

    // Should filter results
    await expect(page.getByTestId('specs-count')).toContainText('1 specification');
  });

  test('has add specification button', async ({ page }) => {
    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Add button should be visible
    const addBtn = page.getByTestId('add-spec-button');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test('can navigate to spec detail', async ({ page }) => {
    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Click view details on first spec
    const viewBtn = page.getByRole('button', { name: /view details/i }).first();
    await viewBtn.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/admin\/specs\/spec-\d/);
  });

  test('shows empty state when no specs', async ({ page }) => {
    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        json: { success: true, data: [] },
      });
    });

    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Should show empty state
    await expect(page.getByTestId('specs-empty-state')).toBeVisible();
    await expect(page.getByText(/no specifications found/i)).toBeVisible();

    // Should have create button
    await expect(page.getByTestId('create-spec-button')).toBeVisible();
  });

  test('displays tags on spec cards', async ({ page }) => {
    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Should show tag badges
    await expect(page.getByText('functional', { exact: true })).toBeVisible();
    await expect(page.getByText('integration', { exact: true })).toBeVisible();
  });

  test('handles API errors gracefully', async ({ page }) => {
    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        status: 500,
        json: { success: false, error: 'Server error' },
      });
    });

    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Should show error state with try again button
    await expect(page.getByText(/error loading/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });
});

test.describe('Specs Page Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);
  });

  test('search filters by topic', async ({ page }) => {
    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            { id: '1', topic: 'Alpha Feature', tags: [], author: 'test', timestamp: new Date().toISOString() },
            { id: '2', topic: 'Beta Feature', tags: [], author: 'test', timestamp: new Date().toISOString() },
          ],
        },
      });
    });

    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Search for alpha
    await page.getByTestId('specs-search-input').fill('alpha');
    await page.waitForTimeout(350);

    // Should only show alpha
    await expect(page.getByText('Alpha Feature')).toBeVisible();
    await expect(page.getByText('Beta Feature')).not.toBeVisible();
  });

  test('search filters by tag', async ({ page }) => {
    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            { id: '1', topic: 'Spec A', tags: ['important'], author: 'test', timestamp: new Date().toISOString() },
            { id: '2', topic: 'Spec B', tags: ['optional'], author: 'test', timestamp: new Date().toISOString() },
          ],
        },
      });
    });

    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Search for tag
    await page.getByTestId('specs-search-input').fill('important');
    await page.waitForTimeout(350);

    // Should only show spec with that tag
    await expect(page.getByText('Spec A')).toBeVisible();
    await expect(page.getByText('Spec B')).not.toBeVisible();
  });
});

test.describe('Specs Page Accessibility', () => {
  test('all interactive elements are focusable', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        json: { success: true, data: [{ id: '1', topic: 'Test', tags: [], author: 'a', timestamp: new Date().toISOString() }] },
      });
    });

    await page.goto('/admin/specs');
    await page.waitForLoadState('networkidle');

    // Search input should be focusable
    const searchInput = page.getByTestId('specs-search-input');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // Add button should be focusable
    const addBtn = page.getByTestId('add-spec-button');
    await addBtn.focus();
    await expect(addBtn).toBeFocused();
  });
});
