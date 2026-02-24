import { expect, test } from '@playwright/test';

test.describe('MCP Servers Page - CRUD Operations', () => {
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
                url: 'http://running.com',
                connected: true,
                tools: [],
                lastConnected: new Date().toISOString(),
              }
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                apiKey: '123'
              }
            ],
          },
        }),
      });
    });
  });

  test('should stop a running server', async ({ page }) => {
    // Mock disconnect endpoint
    await page.route('/api/admin/mcp-servers/disconnect', async (route) => {
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

    // Find the running server card
    const runningCard = page.locator('.card', { hasText: 'Running Server' });
    await expect(runningCard).toBeVisible();

    // Find the Stop button (text-error btn-circle with StopIcon)
    // The icon might not be selectable by text, but we can use title
    const stopButton = runningCard.getByTitle('Stop Server');
    await expect(stopButton).toBeVisible();

    // Click Stop
    await stopButton.click();

    // Verify success message
    await expect(page.getByRole('alert').getByText('Server stop action completed')).toBeVisible();
  });

  test('should delete a server', async ({ page }) => {
    // Mock delete endpoint
    await page.route('/api/admin/mcp-servers/Stopped%20Server', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Server deleted successfully' }),
      });
    });

    // Mock window.confirm to return true
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    await page.goto('/admin/mcp/servers');

    // Find the stopped server card
    const stoppedCard = page.locator('.card', { hasText: 'Stopped Server' });
    await expect(stoppedCard).toBeVisible();

    // Find the Delete button
    const deleteButton = stoppedCard.getByTitle('Delete Server');
    await expect(deleteButton).toBeVisible();

    // Click Delete
    await deleteButton.click();

    // Verify success message
    await expect(page.getByRole('alert').getByText('Server deleted successfully')).toBeVisible();
  });
});
