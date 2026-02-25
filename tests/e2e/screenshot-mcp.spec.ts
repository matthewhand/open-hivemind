import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock auth check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background endpoints to prevent 401s and errors
    await page.route('**/api/health/detailed', async (route) => route.fulfill({ status: 200, json: { status: 'ok' } }));
    await page.route('**/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } }));
    await page.route('**/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/admin/guard-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/demo/status', async (route) => route.fulfill({ status: 200, json: { isDemoMode: false } }));
    await page.route('**/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));

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
                url: 'http://localhost:8000',
                connected: true,
                tools: [
                    { name: 'read_file' },
                    { name: 'write_file' },
                    { name: 'list_files' }
                ],
                lastConnected: new Date().toISOString(),
                description: 'Access local filesystem',
              }
            ],
            configurations: [
              {
                name: 'External API Server',
                serverUrl: 'http://external-api:3000',
                apiKey: '******',
                description: 'Integration with external services',
              }
            ],
          },
        }),
      });
    });
  });

  test('capture mcp servers list and modal', async ({ page }) => {
    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the server list to be visible
    await expect(page.locator('.card', { hasText: 'Filesystem Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'External API Server' })).toBeVisible();

    // Take screenshot of the list
    // Use fullPage: true for the list view if it's long, but here it's short.
    // Just capturing the main content area might be better, or the whole viewport.
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Open "Add Server" modal
    await page.click('button:has-text("Add Server")');

    // Wait for modal to be visible
    const modal = page.locator('.modal-box');
    await expect(modal).toBeVisible();

    // Wait for animation
    await page.waitForTimeout(500);

    // Take screenshot of the modal
    // We can screenshot just the modal or the whole page with overlay.
    // The whole page with overlay gives better context.
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
