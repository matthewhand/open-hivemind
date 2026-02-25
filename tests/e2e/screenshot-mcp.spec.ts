import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock global config endpoints to prevent errors
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: {} });
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

    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { isDemoMode: false } });
    });

    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } });
    });

    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: [] });
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
                url: 'http://localhost:3000',
                connected: true,
                tools: [
                  { name: 'read_file', description: 'Read a file' },
                  { name: 'write_file', description: 'Write a file' },
                ],
                lastConnected: new Date().toISOString(),
                description: 'Access local filesystem safely via MCP',
              },
            ],
            configurations: [
              {
                name: 'Weather Service',
                serverUrl: 'https://weather.mcp.example.com',
                apiKey: 'hidden',
                description: 'External weather data provider',
              },
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers list and add modal', async ({ page }) => {
    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the list to load
    await expect(page.locator('text=Filesystem Server')).toBeVisible();
    await expect(page.locator('text=Weather Service')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Open Add Server modal
    await page.click('text=Add Server');

    // Wait for modal to be visible
    await expect(page.locator('.modal-box')).toBeVisible();
    await expect(page.locator('text=Add MCP Server')).toBeVisible();

    // Take screenshot of the modal
    // Wait a bit for transition
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
