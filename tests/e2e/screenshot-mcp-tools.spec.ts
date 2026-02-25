import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock MCP Servers (which returns tools)
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          servers: [
            {
              name: 'filesystem-server',
              connected: true,
              tools: [
                {
                  name: 'read_file',
                  description: 'Reads a file from the filesystem.',
                  inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
                  category: 'filesystem'
                },
                {
                  name: 'write_file',
                  description: 'Writes content to a file.',
                  inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
                  category: 'filesystem'
                }
              ]
            },
            {
              name: 'google-search',
              connected: true,
              tools: [
                {
                  name: 'search',
                  description: 'Search Google for information.',
                  inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
                  category: 'utility'
                }
              ]
            },
            {
              name: 'calculator',
              connected: false,
              tools: [
                {
                  name: 'add',
                  description: 'Add two numbers.',
                  inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
                  category: 'utility'
                }
              ]
            }
          ]
        })
      });
    });

    // Mock Tool Execution
    await page.route('/api/mcp/servers/*/call-tool', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          result: "Tool executed successfully. Output: [Mocked Result]"
        }
      });
    });

    // Mock other config endpoints to prevent errors
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/health/detailed', async (route) => route.fulfill({ status: 200, json: { status: 'ok' } }));
  });

  test('capture MCP tools page screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for page header and stats
    await expect(page.getByRole('heading', { name: 'MCP Tools' })).toBeVisible();
    await expect(page.getByText('Total Tools')).toBeVisible();

    // Wait for tools to load
    await expect(page.getByText('read_file')).toBeVisible();
    await expect(page.locator('.badge', { hasText: 'google-search' })).toBeVisible();

    // Take list screenshot
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Open Run Tool modal for 'search'
    // Find the card containing 'search' and click 'Run Tool'
    // Using filter to target the specific card
    const searchCard = page.locator('.card').filter({ hasText: 'search' }).filter({ hasText: 'google-search' });
    await searchCard.getByRole('button', { name: 'Run Tool' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box').filter({ hasText: 'Run Tool: search' });
    await expect(modal).toBeVisible();

    // Fill in arguments to make it look realistic
    const textarea = modal.locator('textarea');
    await textarea.fill('{\n  "query": "OpenAI MCP"\n}');

    // Take modal screenshot
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run.png' });
  });
});
