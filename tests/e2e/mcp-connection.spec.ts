import { test, expect } from '@playwright/test';

test.describe('MCP Servers Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
    await page.addInitScript(({ token }) => {
      localStorage.setItem('auth_tokens', JSON.stringify({
        accessToken: token,
        refreshToken: token,
        expiresIn: 3600
      }));
    }, { token: fakeToken });

    // Mock the MCP servers list endpoint to avoid errors on load
    await page.route('/api/admin/mcp-servers', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { servers: [], configurations: [] } })
      });
    });
  });

  test('should allow testing connection to an MCP server', async ({ page }) => {
    // Navigate to the MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Click "Add Server" button
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Fill in the form
    await page.getByLabel('Server Name *').fill('Test Server');
    await page.getByLabel('Server URL *').fill('http://localhost:3000/sse');

    // 1. Test Successful Connection
    // Intercept the test endpoint
    await page.route('/api/admin/mcp-servers/test', async route => {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.serverUrl).toBe('http://localhost:3000/sse');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Successfully tested connection' })
      });
    });

    // Click "Test Connection"
    await page.getByRole('button', { name: 'Test Connection' }).click();

    // Verify success message
    await expect(page.locator('.alert-success')).toContainText('Connection successful!');

    // Close the alert if possible, or just wait for it to disappear if it auto-closes (it doesn't seem to)
    // The alert component in DaisyUI usually has a close button if implemented, checking MCPServersPage...
    // <Alert status=... onClose={() => setAlert(null)} />
    // So it should have a close button.

    // 2. Test Failed Connection
    // Update interception to fail
    await page.unroute('/api/admin/mcp-servers/test');
    await page.route('/api/admin/mcp-servers/test', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to connect to MCP server' })
      });
    });

    // Click "Test Connection" again
    await page.getByRole('button', { name: 'Test Connection' }).click();

    // Verify error message
    await expect(page.locator('.alert-error')).toContainText('Failed to connect to MCP server');
  });
});
