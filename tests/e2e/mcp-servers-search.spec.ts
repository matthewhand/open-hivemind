import { expect, test } from '@playwright/test';

test.describe('MCP Servers Search and Filter', () => {
  const mockServers = {
    servers: [
      {
        name: 'Running Server',
        url: 'http://running.com',
        connected: true,
        tools: [],
        lastConnected: new Date().toISOString(),
        description: 'A running server'
      }
    ],
    configurations: [
      {
        name: 'Stopped Server',
        serverUrl: 'http://stopped.com',
        apiKey: '123',
        description: 'A stopped server'
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockServers,
        }),
      });
    });

    // Mock other endpoints that might be called
    await page.route('/api/config/global', async (route) => {
       await route.fulfill({ status: 200, json: {} });
    });
  });

  test('can search servers by name', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    const searchInput = page.getByPlaceholder('Search servers...');
    await expect(searchInput).toBeVisible();

    // Search for "Running"
    await searchInput.fill('Running');

    // Wait for filter
    await page.waitForTimeout(500);

    // Expect "Running Server" to be visible
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();

    // Expect "Stopped Server" to be hidden
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).not.toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'mcp-servers-search-running.png' });
  });

  test('can filter servers by status', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Select "Stopped" from filter
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('stopped');

    // Wait for filter
    await page.waitForTimeout(500);

    // Expect "Stopped Server" to be visible
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // Expect "Running Server" to be hidden
    await expect(page.getByRole('heading', { name: 'Running Server' })).not.toBeVisible();

    await page.screenshot({ path: 'mcp-servers-filter-stopped.png' });
  });

  test('shows empty state when no matches found', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('NonExistentServer');

    await page.waitForTimeout(500);

    // Expect Empty State
    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('No servers match your search "NonExistentServer"')).toBeVisible();

    await page.screenshot({ path: 'mcp-servers-empty-state.png' });
  });

  test('can clear filters', async ({ page }) => {
     await page.goto('/admin/mcp/servers');

    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    // Click "Clear filters" button in Empty State
    const clearButton = page.getByRole('button', { name: 'Clear filters' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Expect all servers to be visible again
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();
  });
});
