import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock auth check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock config endpoints to avoid errors
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
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
    await page.route('/api/demo/status', async (route) =>
        route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/health/detailed', async (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
    );

    // Mock MCP servers list with tools (Format matches what MCPToolsPage.tsx expects: { servers: [...] })
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [
            {
              name: 'Filesystem',
              connected: true,
              tools: [
                {
                  name: 'write_file',
                  description: 'Write content to a file on the server.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      path: {
                        type: 'string',
                        description: 'The path to the file to write.'
                      },
                      content: {
                        type: 'string',
                        description: 'The content to write to the file.'
                      },
                      overwrite: {
                        type: 'boolean',
                        description: 'Whether to overwrite existing file.'
                      }
                    },
                    required: ['path', 'content']
                  }
                },
                {
                    name: 'read_file',
                    description: 'Read file content.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' }
                        }
                    }
                }
              ]
            },
            {
                name: 'Calculator',
                connected: true,
                tools: [
                    {
                        name: 'add',
                        description: 'Add two numbers.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                a: { type: 'number', description: 'First number' },
                                b: { type: 'number', description: 'Second number' }
                            },
                            required: ['a', 'b']
                        }
                    }
                ]
            }
          ]
        }),
      });
    });
  });

  test('capture MCP tools page and run modal', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to MCP Tools page
    await page.goto('/admin/mcp/tools');

    // Wait for tools to load
    await expect(page.getByText('write_file')).toBeVisible();

    // Screenshot 1: Tools List
    await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });

    // Click "Run Tool" on write_file
    const writeFileCard = page.locator('.card', { hasText: 'write_file' });
    await writeFileCard.getByRole('button', { name: 'Run Tool' }).click();

    // Wait for modal
    const modal = page.locator('.modal-box');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Run Tool: write_file');

    // Fill the form
    await page.getByPlaceholder('Enter path...').fill('/tmp/test.txt');
    await page.getByPlaceholder('Enter content...').fill('Hello World');

    // Check the boolean 'overwrite'
    // Finding the checkbox within the form control for 'overwrite'
    // The structure is roughly:
    // <div className="form-control">
    //   <label> ... overwrite ... </label>
    //   <input type="checkbox" ... />
    // </div>
    const overwriteControl = page.locator('.form-control', { hasText: 'overwrite' });
    await overwriteControl.locator('input[type="checkbox"]').check();

    // Screenshot 2: Run Modal with Form filled
    await page.screenshot({ path: 'docs/screenshots/mcp-tool-run-modal.png' });
  });
});
