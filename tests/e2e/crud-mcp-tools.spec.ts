import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * MCP Tools Page CRUD E2E Tests
 * Exercises tool listing, search, category/server filters, enable/disable toggle,
 * run tool modal, JSON and form input modes, execution loading state, result display,
 * empty state, and invalid JSON error with full API mocking.
 */
test.describe('MCP Tools CRUD Lifecycle', () => {
  test.setTimeout(90000);

  // The page fetches /api/mcp/servers and flattens server.tools[] into tool cards
  const mockServers = [
    {
      name: 'Production MCP',
      url: 'https://prod-mcp.example.com',
      status: 'running',
      connected: true,
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for information using a query string',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              maxResults: { type: 'number', description: 'Maximum number of results' },
            },
            required: ['query'],
          },
        },
        {
          name: 'file_read',
          description: 'Read contents of a file from the filesystem',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to read' },
              encoding: { type: 'string', description: 'File encoding' },
            },
            required: ['path'],
          },
        },
        {
          name: 'database_query',
          description: 'Execute a SQL query against the configured database',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SQL query to execute' },
              timeout: { type: 'number', description: 'Query timeout in seconds' },
            },
            required: ['sql'],
          },
        },
      ],
    },
    {
      name: 'Staging MCP',
      url: 'https://staging-mcp.example.com',
      status: 'running',
      connected: false,
      tools: [
        {
          name: 'send_email',
          description: 'Send an email to a specified recipient',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject' },
              body: { type: 'string', description: 'Email body content' },
            },
            required: ['to', 'subject', 'body'],
          },
        },
        {
          name: 'image_resize',
          description: 'Resize an image to specified dimensions',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Image URL' },
              width: { type: 'number', description: 'Target width' },
              height: { type: 'number', description: 'Target height' },
            },
            required: ['url', 'width', 'height'],
          },
        },
      ],
    },
  ];

  const mockExecutionResult = {
    success: true,
    result: {
      data: [
        { title: 'Example result 1', url: 'https://example.com/1', snippet: 'First search result' },
        {
          title: 'Example result 2',
          url: 'https://example.com/2',
          snippet: 'Second search result',
        },
      ],
      totalResults: 2,
    },
    executionTime: 245,
  };

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('list tools with cards', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await page.waitForTimeout(1000);

    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('file_read').first()).toBeVisible();
    await expect(page.getByText('send_email').first()).toBeVisible();
    await expect(page.getByText('database_query').first()).toBeVisible();
  });

  test('search tools by name or description', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const searchInput = page
      .locator(
        'input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('email');

    // send_email should still be visible
    const emailTool = page.getByText('send_email').first();
    await expect(emailTool).toBeVisible({ timeout: 10000 });
  });

  test('filter by category dropdown', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const categoryFilter = page
      .locator(
        'select:has(option:has-text("Search")), select:has(option:has-text("Category")), select[id*="category" i]'
      )
      .first();
    await expect(categoryFilter).toBeVisible({ timeout: 10000 });
    await categoryFilter.selectOption({ label: 'Search' });
  });

  test('filter by server dropdown', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const serverFilter = page
      .locator(
        'select:has(option:has-text("Production MCP")), select:has(option:has-text("Server")), select[id*="server" i]'
      )
      .first();
    await expect(serverFilter).toBeVisible({ timeout: 10000 });
    await serverFilter.selectOption({ label: 'Staging MCP' });
  });

  test('enable/disable tool toggle', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    // Find toggle for a specific tool (send_email which is disabled via connected=false on Staging MCP)
    const toolCard = page.locator('.card').filter({ hasText: 'send_email' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const toggleBtn = toolCard
      .locator('button:has-text("Enable"), button:has-text("Disable")')
      .first();
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    await toggleBtn.click();
  });

  test('open run tool modal', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    // Click run/execute button on web_search tool
    const toolCard = page.locator('.card').filter({ hasText: 'web_search' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const runBtn = toolCard.locator('button:has-text("Run Tool")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    const modal = page
      .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 10000 });
  });

  test('execute tool with JSON input', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) => {
      if (route.request().url().includes('call-tool')) {
        return route.fulfill({ status: 200, json: mockExecutionResult });
      }
      return route.fulfill({ status: 200, json: { servers: mockServers } });
    });
    await page.route('**/api/mcp/servers/*/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockExecutionResult })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card').filter({ hasText: 'web_search' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const runBtn = toolCard.locator('button:has-text("Run Tool")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    const modal = page
      .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Find JSON textarea or editor
    const jsonInput = modal
      .locator('textarea, [class*="editor"], [contenteditable="true"]')
      .first();
    await expect(jsonInput).toBeVisible({ timeout: 10000 });
    await jsonInput.fill('{"query": "test search", "maxResults": 5}');

    // Click execute
    const executeBtn = modal.locator('button:has-text("Run Tool")').first();
    await expect(executeBtn).toBeVisible({ timeout: 10000 });
    await executeBtn.click();
  });

  test('execute tool with form mode input', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) => {
      if (route.request().url().includes('call-tool')) {
        return route.fulfill({ status: 200, json: mockExecutionResult });
      }
      return route.fulfill({ status: 200, json: { servers: mockServers } });
    });
    await page.route('**/api/mcp/servers/*/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockExecutionResult })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card').filter({ hasText: 'web_search' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const runBtn = toolCard.locator('button:has-text("Run Tool")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    const modal = page
      .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Switch to Form mode
    const formModeBtn = modal.locator('button[title="Form Builder"]').first();
    await expect(formModeBtn).toBeVisible({ timeout: 10000 });
    await formModeBtn.click();

    // Fill form inputs
    const queryInput = modal.locator('input[placeholder*="Enter query"]').first();
    await expect(queryInput).toBeVisible({ timeout: 10000 });
    await queryInput.fill('test search query');

    // Click execute
    const executeBtn = modal.locator('button:has-text("Run Tool")').first();
    await expect(executeBtn).toBeVisible({ timeout: 10000 });
    await executeBtn.click();
  });

  test('toggle between form and JSON modes', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card').filter({ hasText: 'web_search' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const runBtn = toolCard.locator('button:has-text("Run Tool")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    const modal = page
      .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Switch to JSON mode
    const jsonModeBtn = modal.locator('button[title="Raw JSON"]').first();
    await expect(jsonModeBtn).toBeVisible({ timeout: 10000 });
    await jsonModeBtn.click();

    // Switch to Form mode
    const formModeBtn = modal.locator('button[title="Form Builder"]').first();
    await expect(formModeBtn).toBeVisible({ timeout: 10000 });
    await formModeBtn.click();

    // Switch back to JSON mode
    await jsonModeBtn.click();
  });

  test('tool execution loading state', async ({ page }) => {
    let resolveExecutionPromise: () => void;
    const executionPromise = new Promise<void>((resolve) => {
      resolveExecutionPromise = resolve;
    });

    await page.route('**/api/mcp/servers/*/call-tool', async (route) => {
      await executionPromise;
      await route.fulfill({ status: 200, json: mockExecutionResult });
    });
    await page.route('**/api/mcp/servers', (route) => {
      if (route.request().url().includes('call-tool')) return;
      return route.fulfill({ status: 200, json: { servers: mockServers } });
    });

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card').filter({ hasText: 'web_search' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const runBtn = toolCard.locator('button:has-text("Run Tool")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    const modal = page
      .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    const executeBtn = modal.locator('button:has-text("Run Tool")').first();
    await expect(executeBtn).toBeVisible({ timeout: 10000 });
    await executeBtn.click();

    // Check for loading indicator in modal
    const loading = modal
      .locator('[class*="loading"], [class*="spinner"], .skeleton, [role="progressbar"]')
      .first();
    await expect(loading).toBeVisible({ timeout: 10000 });

    // Resolve promise
    resolveExecutionPromise!();

    // Wait for result to appear
    const resultArea = modal
      .locator('pre, code, [class*="result"], [class*="output"], textarea[readonly]')
      .first();
    await expect(resultArea).toBeVisible({ timeout: 10000 });
  });

  test('tool execution result display', async ({ page }) => {
    await page.route('**/api/mcp/servers/*/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockExecutionResult })
    );
    await page.route('**/api/mcp/servers', (route) => {
      if (route.request().url().includes('call-tool')) return;
      return route.fulfill({ status: 200, json: { servers: mockServers } });
    });

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card').filter({ hasText: 'web_search' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const runBtn = toolCard.locator('button:has-text("Run Tool")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    const modal = page
      .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    const executeBtn = modal.locator('button:has-text("Run Tool")').first();
    await expect(executeBtn).toBeVisible({ timeout: 10000 });
    await executeBtn.click();

    // Check for result output area to become visible
    const resultArea = modal
      .locator('pre, code, [class*="result"], [class*="output"], textarea[readonly]')
      .first();
    await expect(resultArea).toBeVisible({ timeout: 10000 });

    // Check for execution time display
    const execTime = page
      .getByText('245')
      .or(page.getByText(/245\s*ms/))
      .first();
    await expect(execTime).toBeVisible({ timeout: 10000 });
  });

  test('empty state when no tools', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: [] } })
    );

    await page.goto('/admin/mcp/tools');
    await page.waitForTimeout(1000);

    // Should show empty state
    await page.waitForLoadState('domcontentloaded');
    const emptyText = page
      .locator(
        'text=/no.*tool/i, text=/no.*available/i, text=/get.*started/i, text=/connect.*server/i'
      )
      .first();
    await expect(emptyText).toBeVisible({ timeout: 10000 });
  });

  test('invalid JSON shows error in modal', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card').filter({ hasText: 'web_search' }).first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    const runBtn = toolCard.locator('button:has-text("Run Tool")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    const modal = page
      .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
      .first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Switch to JSON mode
    const jsonModeBtn = modal.locator('button[title="Raw JSON"]').first();
    await expect(jsonModeBtn).toBeVisible({ timeout: 10000 });
    await jsonModeBtn.click();

    // Enter invalid JSON
    const jsonInput = modal
      .locator('textarea, [class*="editor"], [contenteditable="true"]')
      .first();
    await expect(jsonInput).toBeVisible({ timeout: 10000 });
    await jsonInput.fill('{invalid json content missing quotes}');

    // Try to execute
    const executeBtn = modal.locator('button:has-text("Run Tool")').first();
    await expect(executeBtn).toBeVisible({ timeout: 10000 });
    await executeBtn.click();

    // Check for JSON error message (page shows "Invalid JSON format" as label-text-alt text-error)
    const errorMsg = modal.locator('.text-error, [class*="error"]').first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });
});
