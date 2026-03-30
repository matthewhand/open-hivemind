import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Page - Test Connection', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock common endpoints
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/csrf-token', (route) =>
      route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
    );
    await page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );
    await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));

    // Mock MCP servers list
    await page.route('**/api/admin/mcp-servers', async (route) => {
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
  });

  test('should verify connection success', async ({ page }) => {
    // Mock the test connection endpoint for success
    await page.route('**/api/admin/mcp-servers/test', async (route) => {
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
    await page.getByRole('button', { name: 'Add Server' }).first().click();

    // Wait for the form to appear
    await expect(page.locator('input[placeholder="mcp://server-host:port"]')).toBeVisible();

    // Fill in details
    await page.locator('input[type="text"]').first().fill('Test Server');
    await page.locator('input[placeholder="mcp://server-host:port"]').fill('http://localhost:3000');

    // Click Test Connection
    const testBtn = page.getByRole('button', { name: /Test Connection/i });
    await expect(testBtn).toBeVisible();
    await testBtn.click();

    // Verify success message (look for various possible success indicators)
    await expect(page.getByText(/connection successful|success/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should verify connection failure', async ({ page }) => {
    // Mock the test connection endpoint for failure
    await page.route('**/api/admin/mcp-servers/test', async (route) => {
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
    await page.getByRole('button', { name: 'Add Server' }).first().click();

    // Wait for the form to appear
    await expect(page.locator('input[placeholder="mcp://server-host:port"]')).toBeVisible();

    // Fill in details
    await page.locator('input[type="text"]').first().fill('Test Server');
    await page.locator('input[placeholder="mcp://server-host:port"]').fill('http://localhost:3000');

    // Click Test Connection
    const testBtn = page.getByRole('button', { name: /Test Connection/i });
    await expect(testBtn).toBeVisible();
    await testBtn.click();

    // Verify error message
    await expect(page.getByText(/failed|error|could not connect/i).first()).toBeVisible({ timeout: 5000 });
  });
});
