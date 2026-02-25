import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Generate Screenshots - MCP Servers', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
    await setupAuth(page);

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
                name: 'Filesystem',
                url: 'http://localhost:3000',
                connected: true,
                tools: [
                    { name: 'read_file', description: 'Read a file from the filesystem' },
                    { name: 'write_file', description: 'Write a file to the filesystem' }
                ],
                lastConnected: new Date().toISOString(),
              }
            ],
            configurations: [
              {
                name: 'GitHub',
                serverUrl: 'https://api.github.com',
                apiKey: '******'
              }
            ],
          },
        }),
      });
    });

    // Mock specific endpoint for stopped server deletion to avoid errors if the page tries to check status
     await page.route('/api/admin/mcp-servers/GitHub', async (route) => {
      await route.fulfill({
        status: 404, // Not running
        contentType: 'application/json',
        body: JSON.stringify({ success: false }),
      });
    });
  });

  test('capture mcp servers page screenshots', async ({ page }) => {
    // 1. Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and the server list to be visible
    await expect(page.getByText('Filesystem')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GitHub' })).toBeVisible();

    // Take screenshot of the list view
    await page.screenshot({ path: 'docs/assets/screenshots/mcp-servers-list.png', fullPage: true });

    // 2. Click "Add Server" to show modal
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Wait for modal to be visible
    // The modal usually has a title "Add MCP Server"
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add MCP Server' })).toBeVisible();

    // Take screenshot of the modal
    // We might want to screenshot just the modal or the whole page with the modal open.
    // Full page is usually better for context.
    await page.screenshot({ path: 'docs/assets/screenshots/mcp-server-modal.png' });
  });
});
