import { expect, test } from '@playwright/test';
import * as path from 'path';

test.describe('Generate Documentation Screenshots - MCP Servers', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

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
                name: 'Filesystem Server',
                url: 'http://localhost:3000',
                connected: true,
                tools: ['read_file', 'write_file', 'list_files'],
                lastConnected: new Date().toISOString(),
              },
              {
                name: 'GitHub Integration',
                url: 'http://github-mcp:8080',
                connected: false,
                tools: [],
                lastConnected: null,
                error: 'Connection refused',
              }
            ],
            configurations: [
              {
                name: 'Weather Service',
                serverUrl: 'http://weather-mcp.api',
                apiKey: '********'
              }
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers list and modal', async ({ page }) => {
    // Navigate to the MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and content to be visible
    await expect(page.getByRole('heading', { name: 'MCP Servers' })).toBeVisible();
    await expect(page.locator('.card').first()).toBeVisible();

    // Take screenshot of the list
    const screenshotDir = path.join(process.cwd(), 'docs/assets/screenshots');

    await page.screenshot({ path: path.join(screenshotDir, 'mcp-servers-list.png'), fullPage: true });

    // Open the "Add Server" modal
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Wait for modal to be visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: path.join(screenshotDir, 'mcp-server-modal.png') });
  });
});
