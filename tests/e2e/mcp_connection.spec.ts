import { test, expect } from '@playwright/test';

test.describe('MCP Servers Page - Test Connection', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication check if needed
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock MCP servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [],
            configurations: []
          }
        }),
      });
    });
  });

  test('should verify connection success', async ({ page }) => {
    // Mock the test connection endpoint for success
    await page.route('/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Successfully tested connection to MCP server',
        }),
      });
    });

    await page.goto('/admin/mcp/servers');

    // Click Add Server
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Fill in details
    await page.locator('input[type="text"]').first().fill('Test Server');
    // The second input is likely the URL input based on order in code
    // "Server Name *" is first, "Server URL *" is second
    await page.locator('input[placeholder="mcp://server-host:port"]').fill('http://localhost:3000');

    // Click Test Connection
    await page.getByRole('button', { name: 'Test Connection' }).click();

    // Verify success message
    await expect(page.getByText('Connection successful!')).toBeVisible();
  });

  test('should verify connection failure', async ({ page }) => {
    // Mock the test connection endpoint for failure
    await page.route('/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Connection failed',
          message: 'Failed to connect to server',
        }),
      });
    });

    await page.goto('/admin/mcp/servers');

    // Click Add Server
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Fill in details
    await page.locator('input[type="text"]').first().fill('Test Server');
    await page.locator('input[placeholder="mcp://server-host:port"]').fill('http://localhost:3000');

    // Click Test Connection
    await page.getByRole('button', { name: 'Test Connection' }).click();

    // Verify error message
    await expect(page.getByText('Failed to connect to server')).toBeVisible();
  });
});
