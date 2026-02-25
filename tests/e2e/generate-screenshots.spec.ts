import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Generate Documentation Screenshots - MCP Servers', () => {
  test.beforeEach(async ({ page }) => {
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
                  { name: 'read_file', description: 'Read file from filesystem' },
                  { name: 'write_file', description: 'Write file to filesystem' }
                ],
                lastConnected: new Date().toISOString(),
              }
            ],
            configurations: [
              {
                name: 'Postgres DB',
                serverUrl: 'http://localhost:5432',
                apiKey: '******'
              },
              {
                 name: 'Filesystem',
                 serverUrl: 'http://localhost:3000',
                 apiKey: ''
              }
            ],
          },
        }),
      });
    });

    // Mock other necessary endpoints to prevent loading hangs
    await page.route('/api/config/llm-status', async (route) => {
        await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('/api/demo/status', async (route) => {
        await route.fulfill({ status: 200, json: { active: false } });
    });
  });

  test('capture mcp servers screenshots', async ({ page }) => {
    // Navigate to the page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and content to be visible
    // Depending on implementation, title might be in a header or h1
    await expect(page.getByRole('heading', { name: 'MCP Servers' })).toBeVisible();
    await expect(page.getByText('Filesystem', { exact: false }).first()).toBeVisible();

    // Ensure "no data" is not visible
    await expect(page.getByText('No MCP servers connected')).toBeHidden();

    // Wait a bit for animations or layout stability
    await page.waitForTimeout(1000);

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/assets/screenshots/mcp-servers-list.png', fullPage: true });

    // Click "Add Server" to open modal
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Wait for modal
    const modal = page.locator('dialog.modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Add MCP Server');

    // Wait for modal animation
    await page.waitForTimeout(500);

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/assets/screenshots/mcp-server-modal.png' });
  });
});
