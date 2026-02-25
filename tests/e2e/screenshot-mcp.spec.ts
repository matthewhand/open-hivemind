import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
    await setupAuth(page);

    // Mock API endpoints to ensure no errors
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } });
    });

    // Mock MCP Servers list
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
                url: 'http://localhost:8080',
                connected: true,
                tools: [{ name: 'read_file' }, { name: 'write_file' }, { name: 'list_files' }],
                lastConnected: new Date().toISOString(),
                description: 'Local filesystem access for the bot.',
              },
            ],
            configurations: [
              {
                name: 'External Knowledge Base',
                serverUrl: 'https://mcp.knowledge-base.com',
                apiKey: 'sk-12345',
                description: 'Connects to company wiki and docs.',
              },
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers list and add modal', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the list to load
    await expect(page.getByText('Filesystem Server')).toBeVisible();
    await expect(page.getByText('External Knowledge Base')).toBeVisible();

    // Take screenshot of the list
    // Ensure directory exists - automated by script but good to be safe if running manually?
    // Playwright creates directories automatically? No, only for failure screenshots.
    // The plan includes mkdir -p.
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Click "Add Server" button
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box');
    await expect(modal).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add MCP Server' })).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
