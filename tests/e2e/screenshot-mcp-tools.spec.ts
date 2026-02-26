import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Background polls
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
        route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock MCP servers with tools (Note: MCPToolsPage expects { servers: [...] })
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            servers: [
              {
                name: 'User Management',
                serverUrl: 'http://users-mcp:8080',
                connected: true,
                tools: [
                  {
                    name: 'create_user',
                    description: 'Creates a new user in the system with specified roles and permissions.',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string', description: 'Unique handle for the user' },
                        age: { type: 'integer', description: 'Age in years' },
                        role: { type: 'string', enum: ['viewer', 'editor', 'admin'], description: 'Project role assignment' },
                        isActive: { type: 'boolean', description: 'Whether the user account is active immediately' }
                      },
                      required: ['username', 'role']
                    },
                  },
                  {
                    name: 'list_users',
                    description: 'List all users.',
                    inputSchema: { type: 'object', properties: {} }
                  }
                ],
                lastConnected: new Date().toISOString(),
                description: 'Manages user accounts.',
              },
            ]
        }),
      });
    });
  });

  test('capture MCP tools page and run modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/admin/mcp/tools');

    // Wait for the tool card to be visible
    await expect(page.getByRole('heading', { name: 'create_user' })).toBeVisible();

    // Screenshot List
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Open Run Modal
    await page.getByRole('button', { name: 'Run Tool' }).first().click();

    // Expect Form Mode by default
    await expect(page.getByRole('button', { name: 'Form', exact: true })).toHaveClass(/tab-active/);

    // Scope to modal
    const modal = page.locator('.modal-box');
    await expect(modal).toBeVisible();

    // Fill the form to show it populated
    // username
    await modal.locator('input[type="text"]').first().fill('jdoe');

    // age
    await modal.locator('input[type="number"]').first().fill('30');

    // role - find the select that contains the option "editor"
    await modal.locator('select').filter({ hasText: 'editor' }).selectOption('editor');

    // isActive
    await modal.locator('input[type="checkbox"]').first().check();

    // Screenshot Modal
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-run-modal.png' });
  });
});
