import { expect, test } from '@playwright/test';

test.describe('MCP Servers Page - Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock initial list of servers with various statuses
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [
              {
                name: 'Running Server',
                serverUrl: 'http://running.com', // API returns serverUrl or url
                connected: true,
                tools: [],
                lastConnected: new Date().toISOString(),
                description: 'A server that is running'
              }
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                apiKey: '123',
                description: 'A server that is stopped'
              }
            ],
          },
        }),
      });
    });
  });

  test('should search servers by name', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Wait for content
    await expect(page.locator('.card')).toHaveCount(2);

    // Search for 'Running'
    await page.getByPlaceholder('Search servers...').fill('Running');

    // Check results
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeHidden();

    // Screenshot
    await page.screenshot({ path: 'mcp-search-name.png' });
  });

  test('should search servers by url', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Search for 'stopped.com'
    await page.getByPlaceholder('Search servers...').fill('stopped.com');

    // Check results
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeHidden();
  });

  test('should filter servers by status', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Select 'Running' status
    await page.getByRole('combobox').selectOption('running');

    // Check results
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeHidden();

    // Select 'Stopped' status
    await page.getByRole('combobox').selectOption('stopped');

    // Check results
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeHidden();

    // Screenshot
    await page.screenshot({ path: 'mcp-filter-status.png' });
  });

  test('should show empty state when no matches found', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Search for non-existent server
    await page.getByPlaceholder('Search servers...').fill('NonExistent');

    // Check for empty state
    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('No MCP servers match your search criteria.')).toBeVisible();

    // Check cards are gone
    await expect(page.locator('.card')).toHaveCount(0);

    // Screenshot
    await page.screenshot({ path: 'mcp-empty-state.png' });

    // Test "Clear Search" action
    await page.getByTestId('empty-state').getByRole('button', { name: 'Clear Search' }).click();

    // Should see all servers again
    await expect(page.locator('.card')).toHaveCount(2);
  });
});
