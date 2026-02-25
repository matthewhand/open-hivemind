import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  const mockServers = {
    servers: [
      {
        name: 'Running Server',
        serverUrl: 'http://localhost:3000',
        connected: true,
        description: 'A running server',
        tools: [],
        lastConnected: new Date().toISOString()
      }
    ],
    configurations: [
      {
        name: 'Stopped Server',
        serverUrl: 'http://localhost:3001',
        connected: false,
        description: 'A stopped server'
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock the API response
    await page.route('**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockServers })
      });
    });

    // Mock other potential API calls to avoid errors
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) });
    });

    // Navigate
    await page.goto('/admin/mcp/servers');
    await expect(page.locator('h1')).toContainText('MCP Servers');
  });

  test('can search servers by name', async ({ page }) => {
    // Wait for servers to load
    await expect(page.locator('.card-title').first()).toBeVisible();

    const searchInput = page.getByPlaceholder('Search servers by name or description...');
    await expect(searchInput).toBeVisible();

    // Search for "Running"
    await searchInput.fill('Running');

    // Verify only running server is visible
    await expect(page.locator('.card-title', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card-title', { hasText: 'Stopped Server' })).toBeHidden();
  });

  test('can filter servers by status', async ({ page }) => {
    // Wait for servers to load
    await expect(page.locator('.card-title').first()).toBeVisible();

    const statusSelect = page.locator('select');

    // Select "Stopped"
    await statusSelect.selectOption('stopped');

    // Verify only stopped server is visible
    await expect(page.locator('.card-title', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('.card-title', { hasText: 'Running Server' })).toBeHidden();

    // Select "Running"
    await statusSelect.selectOption('running');

    // Verify only running server is visible
    await expect(page.locator('.card-title', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card-title', { hasText: 'Stopped Server' })).toBeHidden();
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
    // Wait for servers to load
    await expect(page.locator('.card-title').first()).toBeVisible();

    const searchInput = page.getByPlaceholder('Search servers by name or description...');

    // Search for something non-existent
    await searchInput.fill('NonExistentServer');

    // Verify empty state
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No matching servers');

    // Click Clear Search
    const clearButton = emptyState.getByRole('button', { name: 'Clear Search' });
    await clearButton.click();

    // Verify servers are back
    await expect(page.locator('.card-title', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card-title', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(searchInput).toHaveValue('');
  });
});
