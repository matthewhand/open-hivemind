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
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
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

    // Mock MCP servers list with a server that has diverse tools
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          servers: [
            {
              name: 'Utility Server',
              serverUrl: 'http://localhost:3000',
              connected: true,
              tools: [
                {
                  name: 'send_notification',
                  description: 'Sends a system notification.',
                  inputSchema: {
                      type: 'object',
                      properties: {
                          title: { type: 'string', description: 'The title of the notification' },
                          priority: { type: 'integer', description: 'Priority level (1-5)' },
                          urgent: { type: 'boolean', description: 'Mark as urgent' }
                      },
                      required: ['title']
                  },
                },
              ],
              lastConnected: new Date().toISOString(),
              description: 'General utility tools.',
            },
          ],
        }),
      });
    });
  });

  test('capture MCP tools page and run modal screenshots', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for the page to load and tools to be displayed
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByText('send_notification')).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool" on the "send_notification" tool
    await page.getByRole('button', { name: 'Run Tool' }).click();

    // Wait for modal to be visible
    const runModal = page.locator('.modal-box').filter({ hasText: 'Run Tool: send_notification' });
    await expect(runModal).toBeVisible();

    // Verify Form Mode is active (default)
    await expect(runModal.getByText('Arguments')).toBeVisible();

    // Interact with the form to show filled state
    // We target inputs by type/placeholder since labels aren't strictly associated with 'for'
    await runModal.locator('input[type="text"]').fill('System Update');
    await runModal.locator('input[type="number"]').fill('0');
    await runModal.locator('input[type="checkbox"]').check();

    // Take screenshot of the run modal with filled form
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });

    // Toggle JSON Mode to verify it exists and content is synced
    await runModal.getByRole('button', { name: 'JSON' }).click();

    // Wait for textarea
    const jsonTextarea = runModal.locator('textarea');
    await expect(jsonTextarea).toBeVisible();

    // Verify JSON content updated
    const jsonContent = await jsonTextarea.inputValue();
    expect(jsonContent).toContain('"title": "System Update"');
    expect(jsonContent).toContain('"priority": 0');
    expect(jsonContent).toContain('"urgent": true');
  });
});
