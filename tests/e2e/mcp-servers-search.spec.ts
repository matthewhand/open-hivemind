import { test, expect } from '@playwright/test';

test.describe('MCP Servers Page - Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock the MCP servers response
    await page.route('**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [
              {
                name: 'Running Server',
                serverUrl: 'http://running.com',
                connected: true,
                tools: [{ name: 'tool1' }],
                lastConnected: new Date().toISOString(),
                description: 'A running server description',
              }
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                connected: false,
                tools: [],
                description: 'A stopped server description',
              }
            ]
          }
        }),
      });
    });

    await page.goto('/admin/mcp/servers');
  });

  test('should display search bar when servers exist', async ({ page }) => {
    await expect(page.getByPlaceholder('Search servers...')).toBeVisible();
  });

  test('should filter servers by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Running');

    // Should show Running Server
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    // Should hide Stopped Server
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeHidden();
  });

  test('should filter servers by status', async ({ page }) => {
     // Find the status select. It might be a select element.
     const statusSelect = page.getByRole('combobox');
     await statusSelect.selectOption('stopped');

     // Should hide Running Server
     await expect(page.locator('.card', { hasText: 'Running Server' })).toBeHidden();
     // Should show Stopped Server
     await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
  });

  test('should show empty state when no results found', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('NonExistentServer');

    await expect(page.getByText('No Results Found')).toBeVisible();
    await expect(page.getByText('No servers found matching "NonExistentServer"')).toBeVisible();

    // Check for Clear Search button in Empty State
    const clearButton = page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' });
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    // Should restore list
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
  });

  test('should show empty data state when no servers exist', async ({ page }) => {
    // Override the mock to return empty list
    await page.route('**/api/admin/mcp-servers', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    servers: [],
                    configurations: []
                }
            })
        });
    });

    // Reload page to trigger fetch with new mock
    await page.reload();

    await expect(page.getByText('No Servers Configured')).toBeVisible();
    // Search bar should be hidden
    await expect(page.getByPlaceholder('Search servers...')).toBeHidden();
  });
});
