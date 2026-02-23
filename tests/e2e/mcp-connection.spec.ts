import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Server Connection', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('should show test connection button and handle success', async ({ page }) => {
    // Mock the MCP servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [],
            configurations: [],
          },
        }),
      });
    });

    // Mock the test connection endpoint
    await page.route('/api/admin/mcp-servers/test', async (route) => {
      // Verify request body
      const request = route.request();
      const postData = request.postDataJSON();
      expect(postData.serverUrl).toBe('http://localhost:3000');

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

    // Click Add Server button
    await page.click('button:has-text("Add Server")');

    // Fill in the form
    await page.locator('.form-control', { hasText: 'Server Name *' }).locator('input').fill('Test Server');
    await page.locator('.form-control', { hasText: 'Server URL *' }).locator('input').fill('http://localhost:3000');

    // Wait for the button to be enabled
    const testButton = page.locator('button:has-text("Test Connection")');
    await expect(testButton).toBeEnabled();

    // Click Test Connection
    await testButton.click();

    // Verify success alert
    await expect(page.locator('.alert-success')).toContainText('Connection successful!');
  });

  test('should handle connection failure', async ({ page }) => {
    // Mock the MCP servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    servers: [],
                    configurations: [],
                },
            }),
        });
    });

    // Mock the test connection endpoint failure
    await page.route('/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to connect to MCP server',
          message: 'Connection refused',
        }),
      });
    });

    await page.goto('/admin/mcp/servers');

    // Click Add Server button
    await page.click('button:has-text("Add Server")');

    // Fill in the form
    await page.locator('.form-control', { hasText: 'Server Name *' }).locator('input').fill('Test Server');
    await page.locator('.form-control', { hasText: 'Server URL *' }).locator('input').fill('http://localhost:3000');

    // Click Test Connection
    await page.click('button:has-text("Test Connection")');

    // Verify error alert
    await expect(page.locator('.alert-error')).toContainText('Connection refused');
  });
});
