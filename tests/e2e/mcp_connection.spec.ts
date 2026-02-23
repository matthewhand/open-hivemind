import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth
    await setupAuth(page);

    // Mock the MCP servers list endpoint to prevent backend errors
    await page.route('**/api/admin/mcp-servers', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  data: {
                    servers: [],
                    configurations: []
                  }
                })
            });
        } else {
            await route.continue();
        }
    });

    // Mock other potential API calls that might block page load
    await page.route('**/api/user/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'admin',
                username: 'admin',
                role: 'owner'
            })
        });
    });
  });

  test('should allow testing connection to an MCP server', async ({ page }) => {
    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Verify we are on the page
    await expect(page.getByText('MCP Servers')).toBeVisible();

    // Open "Add Server" modal
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Fill in server details using locators that work with DaisyUI structure
    await page.locator('.form-control', { hasText: 'Server Name *' }).locator('input').fill('Test Server');
    await page.locator('.form-control', { hasText: 'Server URL *' }).locator('input').fill('http://localhost:3000');

    // Mock the test connection endpoint for success
    await page.route('**/api/admin/mcp-servers/test', async (route) => {
      // Verify request payload
      const postData = route.request().postDataJSON();
      expect(postData.name).toBe('Test Server');
      expect(postData.serverUrl).toBe('http://localhost:3000');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Successfully tested connection to MCP server'
        })
      });
    });

    // Click "Test Connection"
    const testButton = page.getByRole('button', { name: 'Test Connection' });
    await testButton.click();

    // Verify success message
    await expect(page.getByText('Connection successful!')).toBeVisible();
  });

  test('should handle failed connection tests', async ({ page }) => {
    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Open "Add Server" modal
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Fill in server details
    await page.locator('.form-control', { hasText: 'Server Name *' }).locator('input').fill('Bad Server');
    await page.locator('.form-control', { hasText: 'Server URL *' }).locator('input').fill('http://bad-url');

    // Mock the test connection endpoint for failure
    await page.route('**/api/admin/mcp-servers/test', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Connection refused'
        })
      });
    });

    // Click "Test Connection"
    const testButton = page.getByRole('button', { name: 'Test Connection' });
    await testButton.click();

    // Verify error message
    await expect(page.getByText('Connection refused')).toBeVisible();
  });
});
