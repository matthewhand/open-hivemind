import { test, expect } from '@playwright/test';

test.describe('MCP Servers Page', () => {
  test('Test Connection button works correctly', async ({ page }) => {
    // Mock the MCP servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            servers: [],
            configurations: []
          }
        }),
      });
    });

    // Navigate to the page
    await page.goto('/admin/mcp/servers');

    // Click Add Server button
    await page.click('button:has-text("Add Server")');

    // Verify modal is open
    await expect(page.locator('.modal-box')).toBeVisible();

    // Fill in the form
    // Name is the first input in the modal
    await page.locator('.modal-box input').first().fill('Test Server');
    // URL is the second input (with placeholder)
    await page.locator('.modal-box input[placeholder="mcp://server-host:port"]').fill('http://localhost:3000');

    // Mock the Test Connection endpoint - Success
    await page.route('/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Successfully tested connection to MCP server'
        }),
      });
    });

    // Click Test Connection
    await page.click('button:has-text("Test Connection")');

    // Verify success message
    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('.alert-success')).toContainText('Connection successful');

    // Mock the Test Connection endpoint - Failure
    await page.route('/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to connect',
          message: 'Connection refused'
        }),
      });
    });

    // Click Test Connection again
    await page.click('button:has-text("Test Connection")');

    // Verify error message
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('Connection refused');
  });
});
