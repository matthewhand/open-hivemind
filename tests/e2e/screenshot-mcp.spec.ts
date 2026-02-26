import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock MCP servers list
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
                serverUrl: 'http://localhost:3000',
                connected: true,
                tools: [
                  {
                    name: 'read_file',
                    description: 'Reads a file from the filesystem.',
                    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
                  },
                  {
                    name: 'write_file',
                    description: 'Writes content to a file.',
                    inputSchema: {
                      type: 'object',
                      properties: { path: { type: 'string' }, content: { type: 'string' } },
                      required: ['path', 'content'],
                    },
                  },
                ],
                lastConnected: new Date().toISOString(),
                description: 'Allows access to the local filesystem for reading and writing files.',
              },
            ],
            configurations: [],
          },
        }),
      });
    });

    // Mock Tool Execution
    await page.route('**/api/admin/mcp-servers/*/call-tool', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          result: {
            content: [
              {
                type: 'text',
                text: 'This is the content of the file.\nIt was read successfully from the filesystem.',
              },
            ],
          },
        },
      });
    });
  });

  test('capture MCP servers page screenshots', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for page load
    await expect(page.locator('.card').first()).toBeVisible();

    // Screenshot 1: Servers List
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Open Tools Modal
    await page.locator('.card').first().getByRole('button', { name: 'View Tools' }).first().click();
    const toolsModal = page.locator('.modal').filter({ hasText: 'Tools provided by Filesystem Server' });
    await expect(toolsModal).toBeVisible();

    // Screenshot 2: Tools Modal
    // Capture just the modal if possible, or full page with modal open
    // Using fullPage: false might capture viewport
    // Let's capture the viewport with the modal open
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-modal.png' });

    // Open Tool Tester
    await toolsModal.getByRole('button', { name: 'Test Tool' }).first().click();
    const testerModal = page.locator('.modal').filter({ hasText: 'Test Tool: read_file' });
    await expect(testerModal).toBeVisible();

    // Fill in arguments to make it look realistic
    await testerModal.getByRole('textbox').fill('{\n  "path": "/etc/hosts"\n}');

    // Execute Tool
    await testerModal.getByRole('button', { name: 'Execute Tool' }).click();

    // Wait for result
    await expect(testerModal.getByText('This is the content of the file')).toBeVisible();

    // Screenshot 3: Tool Tester with Result
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-tester.png' });
  });
});
