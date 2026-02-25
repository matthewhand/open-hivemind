import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';
import fs from 'fs';
import path from 'path';

test.describe('MCP Servers Screenshots', () => {
  test.beforeAll(() => {
    // Ensure the screenshots directory exists
    const screenshotsDir = path.join(process.cwd(), 'docs', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Authenticate
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints to prevent 401s/404s
    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: ['openai'],
          botsMissingLlmProvider: [],
          hasMissing: false
        }
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
        await route.fulfill({ status: 200, json: { enabled: false } });
    });

    await page.route('**/api/csrf-token', async (route) => {
        await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
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
                url: 'http://localhost:3000/sse',
                connected: true,
                tools: [
                    { name: 'read_file', description: 'Read a file' },
                    { name: 'write_file', description: 'Write a file' }
                ],
                lastConnected: new Date().toISOString(),
                description: 'Provides file system access to the agent.'
              }
            ],
            configurations: [
              {
                name: 'PostgreSQL Adapter',
                serverUrl: 'http://localhost:5432/mcp',
                apiKey: '*******',
                description: 'Database connection for querying user data.'
              }
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the page to load and the server list to be visible
    await expect(page.getByText('Filesystem Server')).toBeVisible();
    await expect(page.getByText('PostgreSQL Adapter')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Open "Add Server" modal
    await page.getByRole('button', { name: 'Add Server' }).click();

    // Wait for modal to be visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add MCP Server' })).toBeVisible();

    // Take screenshot of the modal
    // We capture just the modal if possible, or the whole page with modal open
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
