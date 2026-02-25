import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background services to prevent errors
    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } });
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
      await route.fulfill({ status: 200, json: { token: 'mock-token' } });
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
                  { name: 'read_file', description: 'Read file content' },
                  { name: 'write_file', description: 'Write file content' }
                ],
                lastConnected: new Date().toISOString(),
                description: 'Local filesystem access for file operations'
              }
            ],
            configurations: [
              {
                name: 'Weather Service',
                serverUrl: 'http://weather-mcp:8080',
                apiKey: '*****',
                description: 'External weather data provider'
              }
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers list and add modal', async ({ page }) => {
    // 1. Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the list to be visible
    await expect(page.getByText('Filesystem Server')).toBeVisible();
    await expect(page.getByText('Weather Service')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // 2. Open Add Server Modal
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Wait for modal to be visible
    const modal = page.locator('.modal-box');
    await expect(modal).toBeVisible();
    await expect(page.getByText('Add MCP Server')).toBeVisible();

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
