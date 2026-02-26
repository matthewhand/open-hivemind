import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );

    // Mock MCP servers list for Tools Page
    // The page MCPToolsPage.tsx calls /api/mcp/servers
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [
            {
              name: 'Utility Server',
              serverUrl: 'http://localhost:3000',
              connected: true,
              tools: [
                {
                  name: 'greet_user',
                  description: 'Greets a user by name.',
                  inputSchema: {
                      type: 'object',
                      properties: {
                          name: { type: 'string', title: 'Name', description: 'The name of the user to greet' },
                          loud: { type: 'boolean', title: 'Loud', description: 'If true, greeting is in caps' },
                          times: { type: 'integer', title: 'Times', description: 'How many times to greet' }
                      },
                      required: ['name']
                  },
                },
                {
                    name: 'get_time',
                    description: 'Returns the current time.',
                    inputSchema: { type: 'object', properties: {} },
                }
              ],
            },
          ],
        }),
      });
    });
  });

  test('capture MCP tools page and run modal', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for the page to load and tools to be displayed
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByText('greet_user')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool" on 'greet_user'
    // Finding the card that contains 'greet_user' and clicking its Run Tool button
    const card = page.locator('.card').filter({ hasText: 'greet_user' });
    await card.getByRole('button', { name: 'Run Tool' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Run Tool: greet_user' });
    await expect(modal).toBeVisible();

    // Fill out the form
    await modal.getByLabel('Name').fill('World');
    await modal.getByLabel('Loud').check();
    await modal.getByLabel('Times').fill('3');

    // Verify Form/JSON toggle exists
    await expect(modal.getByRole('button', { name: 'JSON' })).toBeVisible();

    // Take screenshot of the run modal with form filled
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
