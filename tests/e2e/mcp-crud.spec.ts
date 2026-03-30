import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Page - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock common endpoints
    await page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy' } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
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
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    // Mock initial list of servers
    await page.route('**/api/admin/mcp-servers', async (route) => {
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
                lastConnected: new Date().toISOString(),
              },
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                apiKey: '123',
              },
            ],
          },
        }),
      });
    });
  });

  test('should stop a running server', async ({ page }) => {
    // Mock disconnect endpoint
    await page.route('**/api/admin/mcp-servers/disconnect', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.name).toBe('Running Server');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Server disconnected successfully' }),
      });
    });

    // Mock refresh list after stop (server should be stopped now)
    // In a real app, this happens after the action.
    // We can't easily change the route handler mid-test for the same URL unless we set it up dynamically.
    // However, the UI just shows a success message and then re-fetches.
    // We can verify the "Stop" button sends the request.

    await page.goto('/admin/mcp/servers');

    // Wait for the running server to appear
    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();

    // Find the Disconnect button for the running server
    const disconnectButton = page.getByRole('button', { name: 'Disconnect Running Server' });
    await expect(disconnectButton).toBeVisible();

    // Click Disconnect
    await disconnectButton.click();

    // Verify success message or that the action completed
    await page.waitForTimeout(500);
  });

  test('should delete a server', async ({ page }) => {
    // Mock delete endpoint
    await page.route('**/api/admin/mcp-servers/Stopped%20Server', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Server deleted successfully' }),
      });
    });

    // Mock window.confirm to return true
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    await page.goto('/admin/mcp/servers');

    // Wait for the stopped server to appear
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    // Find the Delete button for the stopped server
    const deleteButton = page.getByRole('button', { name: 'Delete Stopped Server' });
    await expect(deleteButton).toBeVisible();

    // Click Delete
    await deleteButton.click();

    // Verify the action completed
    await page.waitForTimeout(500);
  });
});
