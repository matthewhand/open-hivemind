import { expect, test } from '@playwright/test';

test.describe('MCP Servers Page - Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock initial list of servers
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
                url: 'http://running.com',
                connected: true,
                tools: [],
                description: 'A running server for testing',
                lastConnected: new Date().toISOString(),
              }
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                description: 'A stopped server for testing',
                apiKey: '123'
              }
            ],
          },
        }),
      });
    });
  });

  test('should search servers by name', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // Type in search box
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Running');

    // Verify filtering
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();
  });

  test('should filter servers by status', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Select 'Stopped' status
    const statusSelect = page.getByRole('combobox').first();

    await statusSelect.selectOption('stopped');

    // Verify filtering
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();
  });

  test('should show empty state when no matches found', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Search for non-existent
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('NonExistent');

    // Verify Empty State
    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('No servers match your search "NonExistent"')).toBeVisible();

    // Verify Clear Filters button works
    await page.getByRole('button', { name: 'Clear Filters' }).click();

    // Verify all return
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
  });
});
