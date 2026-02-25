import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({
        status: 200,
        json: { authenticated: true, user: { role: 'admin' } },
      });
    });

    // Mock critical background endpoints to prevent errors
    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
        await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/admin/guard-profiles', async (route) => {
        await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/demo/status', async (route) => {
        await route.fulfill({ status: 200, json: { active: false } });
    });

    await page.route('**/api/csrf-token', async (route) => {
        await route.fulfill({ status: 200, json: { csrfToken: 'mock-csrf-token' } });
    });

    // Mock MCP Servers list
    await page.route('/api/admin/mcp-servers', async (route) => {
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
                tools: [
                    { name: 'read_file' },
                    { name: 'write_file' },
                    { name: 'list_files' }
                ],
                lastConnected: new Date().toISOString(),
                description: 'Local filesystem access for reading and writing files.'
              },
              {
                name: 'Postgres Database',
                url: 'http://db:5432',
                connected: false, // stopped
                tools: [],
                lastConnected: new Date(Date.now() - 86400000).toISOString(),
                description: 'Database connection for query execution.'
              }
            ],
            configurations: [
              {
                name: 'Postgres Database',
                serverUrl: 'http://db:5432',
                apiKey: 'secret'
              }
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers workflow screenshots', async ({ page }) => {
    // Set viewport size for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and the list to be visible
    await expect(page.locator('h1:has-text("MCP Servers")')).toBeVisible();
    await expect(page.locator('.card:has-text("Filesystem Server")')).toBeVisible();

    // Take screenshot of the list view
    // Ensure the directory exists is handled by the caller or we rely on playwright creating it (it does for test-results, but maybe not arbitrary paths? Let's hope or create it before)
    // Actually, playwright creates directories if they don't exist.
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Click "Add Server" button
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Wait for modal to appear
    await expect(page.locator('.modal-box')).toBeVisible();
    await expect(page.locator('h3:has-text("Add MCP Server")')).toBeVisible();

    // Fill in some dummy data for the screenshot to look realistic
    await page.locator('input[placeholder="mcp://server-host:port"]').fill('http://my-new-server:8080');
    // We might need to target inputs more specifically if placeholders overlap or are missing
    // The previous code had:
    // <span className="label-text">Server Name *</span>
    // <input ... />

    // Let's use getByLabel if possible, otherwise rely on structure
    // The inputs are inside form-control with label.
    // However, the label text is in a span, so getByLabel might not work directly if 'for' attribute is missing.
    // Let's check MCPServersPage.tsx again. It uses standard inputs.
    // We can use getByText('Server Name *').fill causes error because getByText returns the label/span, not input.
    // We can use locator('input').nth(0) or similar.

    // Better: use the label text to find the input
    await page.locator('div.form-control').filter({ hasText: 'Server Name' }).locator('input').fill('New Tool Service');
    await page.locator('div.form-control').filter({ hasText: 'Description' }).locator('textarea').fill('Provides additional utility functions for data processing.');

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
