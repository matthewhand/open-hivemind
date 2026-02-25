import { expect, test } from '@playwright/test';

test.describe('MCP Servers Page - Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock MCP servers list with diverse data
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [
              {
                name: 'Alpha Server',
                url: 'http://alpha.com',
                connected: true,
                tools: [],
                lastConnected: new Date().toISOString(),
                description: 'Primary running server'
              },
              {
                name: 'Gamma Server',
                url: 'http://gamma.com',
                connected: true,
                tools: [],
                lastConnected: new Date().toISOString(),
                description: 'Secondary running server'
              }
            ],
            configurations: [
              {
                name: 'Beta Server',
                serverUrl: 'http://beta.com',
                apiKey: '123',
                description: 'Stopped test server'
              }
            ],
          },
        }),
      });
    });
  });

  test('filters servers by search term', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Initial state: 3 servers visible
    await expect(page.locator('.card')).toHaveCount(3);

    // Search for "Alpha"
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Alpha');

    // Expect 1 server visible
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('.card', { hasText: 'Alpha Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Beta Server' })).not.toBeVisible();
  });

  test('filters servers by status', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Filter by "Stopped"
    const statusSelect = page.locator('select').first(); // Assuming it's the first select, or filter specifically
    // SearchFilterBar uses DaisyUI Select which might be wrapped.
    // Let's target the Select component more robustly if needed, but standard select usually works if DaisyUI leaves the native select accessible or we target the wrapper.
    // DaisyUI Select component usually renders a native select with styles.

    await statusSelect.selectOption('stopped');

    // Expect 1 server visible (Beta Server is the only stopped one in configurations)
    // Note: configurations in the mock are "stopped" by default logic in MCPServersPage unless connected
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('.card', { hasText: 'Beta Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Alpha Server' })).not.toBeVisible();
  });

  test('shows empty state when no results found', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Search for "Zeta" (non-existent)
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Zeta');

    // Expect 0 cards
    await expect(page.locator('.card')).toHaveCount(0);

    // Expect "No results found" EmptyState
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No results found');
    await expect(emptyState).toContainText('No servers match your search criteria');
  });

  test('clears search and restores list', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Search for "Zeta" to trigger empty state
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Zeta');
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Click "Clear Search" button in EmptyState
    // Use first() or stricter locator because SearchFilterBar also has a clear button
    const clearButton = page.locator('[data-testid="empty-state"]').getByRole('button', { name: 'Clear Search' });
    await clearButton.click();

    // Expect all 3 servers back
    await expect(page.locator('.card')).toHaveCount(3);
    await expect(searchInput).toBeEmpty();
  });

  test('shows initial empty state when no servers configured', async ({ page }) => {
    // Override the mock for this test only
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [],
            configurations: []
          },
        }),
      });
    });

    await page.goto('/admin/mcp/servers');

    // Expect "No servers configured" EmptyState
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No servers configured');
    await expect(emptyState).toContainText('Get started by adding your first MCP server');

    // Check for "Add Server" button action in EmptyState
    const addServerBtn = emptyState.getByRole('button', { name: 'Add Server' });
    await expect(addServerBtn).toBeVisible();
  });
});
