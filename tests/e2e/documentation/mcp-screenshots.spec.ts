import { expect, test } from '@playwright/test';
import { setupAuth } from '../test-utils';

test.describe('Documentation Screenshots - MCP Servers', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
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
                    { name: 'read_file', description: 'Reads a file from the filesystem' },
                    { name: 'write_file', description: 'Writes content to a file' }
                ],
                lastConnected: new Date().toISOString(),
              }
            ],
            configurations: [
              {
                name: 'PostgreSQL',
                serverUrl: 'http://localhost:5432',
                apiKey: '*****'
              }
            ],
          },
        }),
      });
    });

    // Mock disconnect endpoint to avoid errors if clicked (though we just screenshot)
    await page.route('/api/admin/mcp-servers/disconnect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('capture mcp servers list and modal', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Wait for the page to be ready and content to be visible
    await expect(page.locator('.card', { hasText: 'Filesystem' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'PostgreSQL' })).toBeVisible();

    // Take screenshot of the list view
    await page.screenshot({ path: 'docs/assets/screenshots/mcp-servers-list.png', fullPage: true });

    // Click "Add Server" to open the modal
    const addServerButton = page.getByRole('button', { name: 'Add Server' });
    await addServerButton.click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box');
    await expect(modal).toBeVisible();

    // Take screenshot of the modal
    // We can screenshot just the modal or the whole page with the modal open
    await page.screenshot({ path: 'docs/assets/screenshots/mcp-server-modal.png' });
  });
});
