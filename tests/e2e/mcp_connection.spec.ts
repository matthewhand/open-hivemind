import { test, expect } from '@playwright/test';
import { setupAuth, waitForPageReady } from './test-utils';

test.describe('MCP Server Connection', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);
  });

  test('should show test connection success', async ({ page }) => {
    // Mock API responses
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
        }),
      });
    });

    await page.route('**/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Successfully tested connection'
        }),
      });
    });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');
    await waitForPageReady(page);

    // Click Add Server
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Fill form
    await page.getByLabel('Server Name *').fill('Test Server');
    await page.getByLabel('Server URL *').fill('http://localhost:3000');

    // Click Test Connection
    await page.getByRole('button', { name: 'Test Connection' }).click();

    // Verify success alert
    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('.alert-success')).toContainText('Connection successful!');
  });

  test('should show test connection failure', async ({ page }) => {
    // Mock API responses
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
        }),
      });
    });

    await page.route('**/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Connection failed',
          message: 'Failed to connect to MCP server'
        }),
      });
    });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');
    await waitForPageReady(page);

    // Click Add Server
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Fill form
    await page.getByLabel('Server Name *').fill('Bad Server');
    await page.getByLabel('Server URL *').fill('http://invalid-url');

    // Click Test Connection
    await page.getByRole('button', { name: 'Test Connection' }).click();

    // Verify error alert
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('Failed to connect to MCP server');
  });
});
