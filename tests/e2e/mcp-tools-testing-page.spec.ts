import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * MCP Tools Page E2E Tests
 *
 * Tests the MCP Tools page (/admin/mcp/tools), which lists tools discovered
 * from connected MCP servers as cards and lets users run a tool via the
 * "Run Tool" modal (ToolExecutionPanel + ToolConfigPanel), with results shown
 * in the ToolResultModal.
 *
 * NOTE: This spec was rewritten to match the current card + modal UI. The
 * previous version targeted a removed inline "Testing Page" design (clickable
 * tool buttons, inline "Test Tool" + result cards) and was fully stale.
 */
test.describe('MCP Tools Page', () => {
  test.setTimeout(90000);

  // Mock MCP servers with various tool configurations for comprehensive testing
  const mockServers = [
    {
      name: 'test-server',
      url: 'http://localhost:3000',
      status: 'running',
      connected: true,
      tools: [
        {
          name: 'calculator',
          description: 'Perform basic mathematical calculations',
          inputSchema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                description: 'The mathematical operation to perform',
              },
              num1: {
                type: 'number',
                description: 'First number',
              },
              num2: {
                type: 'number',
                description: 'Second number',
              },
            },
            required: ['operation', 'num1', 'num2'],
          },
        },
        {
          name: 'string_formatter',
          description: 'Format strings with various options',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to format',
              },
              uppercase: {
                type: 'boolean',
                description: 'Convert to uppercase',
              },
              prefix: {
                type: 'string',
                description: 'Optional prefix to add',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'array_processor',
          description: 'Process arrays of data',
          inputSchema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                description: 'Array of items to process',
              },
              operation: {
                type: 'string',
                description: 'Operation to apply',
              },
            },
            required: ['items'],
          },
        },
        {
          name: 'no_params_tool',
          description: 'A tool that requires no parameters',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    },
    {
      name: 'production-server',
      url: 'https://prod.example.com',
      status: 'running',
      connected: true,
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for information',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              maxResults: {
                type: 'integer',
                description: 'Maximum number of results',
              },
            },
            required: ['query'],
          },
        },
      ],
    },
  ];

  const mockSuccessResult = {
    result: {
      success: true,
      output: 'Result value',
      data: { key: 'value' },
    },
  };

  const mockErrorResult = {
    error: 'Tool execution failed: Invalid parameter',
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
      // MCP tools registry preferences/persistence endpoints — keep deterministic
      // so a 401 from the dev server can't trigger a redirect to /login mid-test.
      page.route('**/api/mcp/tools/favorites', (route) =>
        route.fulfill({ status: 200, json: { data: {} } })
      ),
      page.route('**/api/mcp/tools/preferences', (route) =>
        route.fulfill({ status: 200, json: { success: true, data: {} } })
      ),
      page.route('**/api/mcp/tools/history', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
    ]);
  }

  // Open a tool's "Run Tool" modal from its registry card.
  async function openToolModal(page: import('@playwright/test').Page, toolName: string) {
    const runButton = page.getByRole('button', { name: `Run ${toolName} tool` });
    await expect(runButton).toBeVisible({ timeout: 15000 });
    await runButton.click();
    await expect(page.getByRole('heading', { name: `Run Tool: ${toolName}` })).toBeVisible();
  }

  // The modal's execute action button. Card "Run X tool" buttons carry an
  // aria-label so their accessible name is NOT "Run Tool" — only the modal
  // action button matches exactly.
  function modalRunButton(page: import('@playwright/test').Page) {
    return page.getByRole('button', { name: 'Run Tool', exact: true });
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('should load the page successfully', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    // Check page title and description
    await expect(page.getByRole('heading', { name: 'MCP Tools' })).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText('Browse and manage tools available from your MCP servers')
    ).toBeVisible();
  });

  test('should display tool registry with all available tools', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    // Verify all tools are listed in the registry
    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('string_formatter').first()).toBeVisible();
    await expect(page.getByText('array_processor').first()).toBeVisible();
    await expect(page.getByText('no_params_tool').first()).toBeVisible();
    await expect(page.getByText('web_search').first()).toBeVisible();

    // Verify server names are displayed on the tool cards (scope to the badge —
    // the server-filter <select> also contains hidden <option> matches).
    await expect(page.locator('.badge').filter({ hasText: 'test-server' }).first()).toBeVisible();
    await expect(
      page.locator('.badge').filter({ hasText: 'production-server' }).first()
    ).toBeVisible();
  });

  test('should show empty state when no tools are available', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: [] } })
    );

    await page.goto('/admin/mcp/tools');

    // Check for empty state message
    await expect(page.getByText('No tools found')).toBeVisible({ timeout: 10000 });
  });

  test('should open the run modal and display tool information', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    // Verify tool information is displayed in the modal (scope to the modal —
    // the description also appears on the registry card behind it).
    const modal = page.locator('.modal-box');
    await expect(modal.getByText('Perform basic mathematical calculations')).toBeVisible();
    await expect(modal.getByText('Input Schema')).toBeVisible();
    await expect(modal.getByText('Arguments Form')).toBeVisible();
  });

  test('should display tool input schema', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    // Verify schema is displayed in a code block
    const schemaBlock = page.locator('.mockup-code').first();
    await expect(schemaBlock).toBeVisible();

    // Verify schema content contains expected properties
    const schemaText = await schemaBlock.textContent();
    expect(schemaText).toContain('operation');
    expect(schemaText).toContain('num1');
    expect(schemaText).toContain('num2');
  });

  test('should render parameter form fields based on schema', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    // Verify form fields are rendered
    await expect(page.locator('input[placeholder*="Enter operation"]')).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();

    // Verify required field indicators (operation, num1, num2)
    const requiredIndicators = page.locator('.modal-box .text-error').filter({ hasText: '*' });
    await expect(requiredIndicators).toHaveCount(3);
  });

  test('should handle string input fields correctly', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'string_formatter');

    // Fill in string input
    const textInput = page.locator('input[placeholder*="Enter text"]');
    await expect(textInput).toBeVisible();
    await textInput.fill('Hello World');

    // Verify value is set
    await expect(textInput).toHaveValue('Hello World');
  });

  test('should handle number input fields correctly', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    // Fill in number inputs
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.first().fill('42');
    await numberInputs.nth(1).fill('10');

    // Verify values are set
    await expect(numberInputs.first()).toHaveValue('42');
    await expect(numberInputs.nth(1)).toHaveValue('10');
  });

  test('should handle boolean input fields with toggle', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'string_formatter');

    // Find and toggle the boolean field
    const toggle = page.locator('.toggle-primary').first();
    await expect(toggle).toBeVisible();

    // Toggle it on
    await toggle.click();
    await expect(toggle).toBeChecked();

    // Toggle it off
    await toggle.click();
    await expect(toggle).not.toBeChecked();
  });

  test('should handle array input fields via JSON mode', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'array_processor');

    // Switch to Raw JSON mode to edit array arguments directly
    await page.getByRole('button', { name: 'Raw JSON' }).click();

    const argsTextarea = page.locator('.modal-box textarea').first();
    await expect(argsTextarea).toBeVisible();

    // Fill in JSON array
    await argsTextarea.fill('{ "items": ["item1", "item2", "item3"] }');

    // Verify value is set
    await expect(argsTextarea).toHaveValue('{ "items": ["item1", "item2", "item3"] }');
  });

  test('should execute tool successfully and display results', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockSuccessResult })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    await page.locator('input[placeholder*="Enter operation"]').fill('add');
    await page.locator('input[type="number"]').first().fill('5');
    await page.locator('input[type="number"]').nth(1).fill('3');

    // Execute the tool
    await modalRunButton(page).click();

    // Verify the result modal opens with a success status
    await expect(page.getByText('Tool Execution Result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.badge-success').filter({ hasText: 'Success' })).toBeVisible();
  });

  test('should show loading state during tool execution', async ({ page }) => {
    let resolveExecution: () => void;
    const executionPromise = new Promise<void>((resolve) => {
      resolveExecution = resolve;
    });

    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', async (route) => {
      await executionPromise;
      await route.fulfill({ status: 200, json: mockSuccessResult });
    });

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    const operationInput = page.locator('input[placeholder*="Enter operation"]');
    await operationInput.fill('add');

    // Execute the tool
    await modalRunButton(page).click();

    // While running the form inputs are disabled
    await expect(operationInput).toBeDisabled({ timeout: 5000 });

    // Resolve execution
    resolveExecution!();

    // Wait for completion — result modal appears
    await expect(page.getByText('Tool Execution Result')).toBeVisible({ timeout: 10000 });
  });

  test('should handle tool execution errors gracefully', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 400, json: mockErrorResult })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    await page.locator('input[placeholder*="Enter operation"]').fill('invalid');

    // Execute the tool
    await modalRunButton(page).click();

    // Verify the result modal opens with an error status
    await expect(page.getByText('Tool Execution Result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.badge-error').filter({ hasText: 'Error' })).toBeVisible();
  });

  test('should handle tools with no parameters', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockSuccessResult })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'no_params_tool');

    // Verify message about no parameters
    await expect(page.getByText('No arguments required or schema not available.')).toBeVisible();

    // Should still be able to execute
    await modalRunButton(page).click();

    // Verify success
    await expect(page.getByText('Tool Execution Result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.badge-success').filter({ hasText: 'Success' })).toBeVisible();
  });

  test('should reset form data when reopening a tool', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    // Open calculator and fill in data
    await openToolModal(page, 'calculator');
    await page.locator('input[placeholder*="Enter operation"]').fill('add');
    await page.locator('input[type="number"]').first().fill('5');

    // Cancel the modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Run Tool: calculator' })).not.toBeVisible();

    // Reopen calculator
    await openToolModal(page, 'calculator');

    // Verify form is reset
    const operationInput = page.locator('input[placeholder*="Enter operation"]');
    await expect(operationInput).toHaveValue('');
  });

  test('should display execution timestamp in result', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockSuccessResult })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');
    await page.locator('input[placeholder*="Enter operation"]').fill('add');

    await modalRunButton(page).click();

    // Result modal shows a timestamp section
    await expect(page.getByText('Tool Execution Result')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Timestamp')).toBeVisible();
  });

  test('should display proper alert for API errors', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 500, json: { error: 'Internal server error' } })
    );

    await page.goto('/admin/mcp/tools');

    // Verify error alert is shown
    await expect(page.getByText('Failed to load tools')).toBeVisible({ timeout: 10000 });
  });

  test('should show correct field descriptions from schema', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'calculator');

    // Verify field descriptions are displayed (exact — the same strings appear
    // inside the Input Schema JSON code block).
    await expect(
      page.getByText('The mathematical operation to perform', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('First number', { exact: true })).toBeVisible();
    await expect(page.getByText('Second number', { exact: true })).toBeVisible();
  });

  test('should accept raw JSON input including invalid JSON for later validation', async ({
    page,
  }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools');

    await openToolModal(page, 'array_processor');

    // Switch to Raw JSON mode
    await page.getByRole('button', { name: 'Raw JSON' }).click();

    const argsTextarea = page.locator('.modal-box textarea').first();
    await expect(argsTextarea).toBeVisible();

    // Fill in invalid JSON — the field should accept it (validated on execute)
    await argsTextarea.fill('invalid json {not an array}');
    await expect(argsTextarea).toHaveValue('invalid json {not an array}');
  });
});
