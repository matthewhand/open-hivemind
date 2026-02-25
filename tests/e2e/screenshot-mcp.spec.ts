import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock LLM status to avoid errors
    await page.route('/api/config/llm-status', async (route) => {
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

    // Mock global config
    await page.route('/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    // Mock detailed health check
    await page.route('/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    // Mock CSRF token
    await page.route('/api/csrf-token', async (route) => {
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
                name: 'Running Server',
                url: 'http://localhost:8000',
                connected: true,
                tools: [
                  { name: 'read_file', description: 'Reads a file' },
                  { name: 'write_file', description: 'Writes a file' },
                ],
                lastConnected: new Date().toISOString(),
                description: 'A local server for file system operations.',
              },
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                apiKey: 'hidden-api-key',
                description: 'A remote server that is currently offline.',
              },
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers list and add modal', async ({ page }) => {
    // Set viewport size for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and content to appear
    await expect(page.locator('h1', { hasText: 'MCP Servers' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Click "Add Server" button
    await page.click('button:has-text("Add Server")');

    // Wait for modal to appear
    await expect(page.locator('.modal-box', { hasText: 'Add MCP Server' })).toBeVisible();

    // Take screenshot of the modal
    // We want to capture the modal content, or the full page with modal overlay
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
