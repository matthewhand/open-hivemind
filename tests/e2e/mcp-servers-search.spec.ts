import { expect, test } from '@playwright/test';

test.describe('MCP Servers Search and Filter', () => {
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
                serverUrl: 'http://running.com',
                connected: true,
                tools: [],
                description: 'A running server',
              },
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                connected: false,
                tools: [],
                description: 'A stopped server',
              }
            ],
            configurations: []
          },
        }),
      });
    });

    // Mock other endpoints that might be called
    await page.route('/api/config/global', async (route) => {
        await route.fulfill({ status: 200, body: '{}' });
    });
  });

  test('should filter servers by search query', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Verify initial state
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();

    // Search for "Running"
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('Running');

    // Wait for filter
    await page.waitForTimeout(500);

    // Verify filtering
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).not.toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'mcp-servers-search-query.png', fullPage: true });
  });

  test('should filter servers by status', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Select "Stopped" status
    const statusSelect = page.locator('select').first(); // Assuming it's the first/only select
    await statusSelect.selectOption('stopped');

    // Wait for filter
    await page.waitForTimeout(500);

    // Verify filtering
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Running Server' })).not.toBeVisible();
  });

  test('should show empty state when no matches found', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Search for non-existent server
    const searchInput = page.getByPlaceholder('Search servers...');
    await searchInput.fill('NonExistent');

    // Wait for filter
    await page.waitForTimeout(500);

    // Verify empty state
    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('Try adjusting your search')).toBeVisible();

    // Verify no cards are shown
    await expect(page.locator('.card')).toHaveCount(0);
  });
});
