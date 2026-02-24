import { expect, test } from '@playwright/test';

test.describe('MCP Tools Page - Run Tool Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication check if needed
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock MCP servers list with a connected server and tools
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [
            {
              name: 'test-server',
              url: 'http://localhost:3000',
              connected: true,
              tools: [
                {
                  name: 'test-tool',
                  description: 'A test tool',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      arg1: { type: 'string' },
                    },
                    required: ['arg1'],
                  },
                },
              ],
            },
          ],
        }),
      });
    });
  });

  test('should open modal when Run Tool is clicked', async ({ page }) => {
    await page.goto('/admin/mcp/tools');

    // Find the Run Tool button for test-tool
    const runButton = page.getByRole('button', { name: 'Run Tool' }).first();
    await expect(runButton).toBeVisible();
    await runButton.click();

    // Verify modal is visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Run Tool: test-tool')).toBeVisible();
    await expect(page.getByText('Input Schema')).toBeVisible();
    await expect(page.getByText('Arguments (JSON)')).toBeVisible();
  });

  test('should show error for invalid JSON', async ({ page }) => {
    await page.goto('/admin/mcp/tools');

    await page.getByRole('button', { name: 'Run Tool' }).first().click();

    // Enter invalid JSON
    const textarea = page.locator('.modal-box textarea');
    await textarea.fill('{ invalid json }');

    // Click Run Tool in modal
    const modalRunButton = page.locator('.modal-action button', { hasText: 'Run Tool' });
    await modalRunButton.click();

    // Verify error message
    await expect(page.getByText('Invalid JSON format')).toBeVisible();
  });

  test('should execute tool with valid JSON', async ({ page }) => {
    // Mock the execute tool endpoint
    let apiCalled = false;
    await page.route('/api/mcp/servers/test-server/call-tool', async (route) => {
      apiCalled = true;
      const request = route.request();
      const postData = request.postDataJSON();
      expect(postData.toolName).toBe('test-tool');
      expect(postData.arguments).toEqual({ arg1: 'value' });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: { output: 'success' },
        }),
      });
    });

    await page.goto('/admin/mcp/tools');

    await page.getByRole('button', { name: 'Run Tool' }).first().click();

    // Enter valid JSON
    const textarea = page.locator('.modal-box textarea');
    await textarea.fill(JSON.stringify({ arg1: 'value' }));

    // Click Run Tool in modal
    const modalRunButton = page.locator('.modal-action button', { hasText: 'Run Tool' });
    await modalRunButton.click();

    // Verify modal closes (dialog not visible)
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify success alert
    await expect(page.getByText('Tool executed! Result:')).toBeVisible();

    expect(apiCalled).toBe(true);
  });
});
