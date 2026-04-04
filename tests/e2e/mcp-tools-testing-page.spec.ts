import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * MCP Tools Testing Page E2E Tests
 *
 * Tests the dedicated MCP Tools Testing Page (/admin/mcp/tools/testing)
 * which allows users to test MCP tools with interactive parameter configuration
 * and execution history tracking before deploying to bots.
 */
test.describe('MCP Tools Testing Page', () => {
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
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('should load the page successfully', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    // Check page title and description
    await expect(page.getByText('MCP Tools Testing')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText('Test MCP tools with custom parameters before using them in bots')
    ).toBeVisible();
  });

  test('should display tool registry with all available tools', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    // Verify all tools are listed in the registry
    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('string_formatter').first()).toBeVisible();
    await expect(page.getByText('array_processor').first()).toBeVisible();
    await expect(page.getByText('no_params_tool').first()).toBeVisible();
    await expect(page.getByText('web_search').first()).toBeVisible();

    // Verify server names are displayed
    await expect(page.getByText('test-server').first()).toBeVisible();
    await expect(page.getByText('production-server').first()).toBeVisible();
  });

  test('should show empty state when no tools are available', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: [] } })
    );

    await page.goto('/admin/mcp/tools/testing');

    // Check for empty state message
    await expect(page.getByText('No tools available. Connect MCP servers first.')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should select a tool and display its information', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    // Wait for tools to load
    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Click on the calculator tool
    const calculatorButton = page.locator('button').filter({ hasText: 'calculator' }).first();
    await calculatorButton.click();

    // Verify tool information is displayed
    await expect(page.getByText('Perform basic mathematical calculations')).toBeVisible();
    await expect(page.getByText('Input Schema')).toBeVisible();
    await expect(page.getByText('Test Parameters')).toBeVisible();

    // Verify the button is highlighted/active
    await expect(calculatorButton).toHaveClass(/btn-primary/);
  });

  test('should display tool input schema', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

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

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    // Verify form fields are rendered
    await expect(page.locator('input[placeholder*="Enter operation"]')).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();

    // Verify required field indicators
    const requiredIndicators = page.locator('.text-error').filter({ hasText: '*' });
    await expect(requiredIndicators).toHaveCount(3); // Three required fields
  });

  test('should handle string input fields correctly', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('string_formatter').first()).toBeVisible({ timeout: 10000 });

    // Select string_formatter tool
    await page.locator('button').filter({ hasText: 'string_formatter' }).first().click();

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

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

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

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('string_formatter').first()).toBeVisible({ timeout: 10000 });

    // Select string_formatter tool (has boolean field)
    await page.locator('button').filter({ hasText: 'string_formatter' }).first().click();

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

  test('should handle array input fields with JSON textarea', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('array_processor').first()).toBeVisible({ timeout: 10000 });

    // Select array_processor tool
    await page.locator('button').filter({ hasText: 'array_processor' }).first().click();

    // Find the textarea for array input
    const arrayTextarea = page.locator('textarea').first();
    await expect(arrayTextarea).toBeVisible();

    // Fill in JSON array
    await arrayTextarea.fill('["item1", "item2", "item3"]');

    // Verify value is set
    await expect(arrayTextarea).toHaveValue('["item1", "item2", "item3"]');
  });

  test('should execute tool successfully and display results', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockSuccessResult })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select and configure calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    await page.locator('input[placeholder*="Enter operation"]').fill('add');
    await page.locator('input[type="number"]').first().fill('5');
    await page.locator('input[type="number"]').nth(1).fill('3');

    // Click Test Tool button
    const testButton = page.locator('button').filter({ hasText: 'Test Tool' });
    await testButton.click();

    // Verify success message
    await expect(page.getByText('Tool executed successfully!')).toBeVisible({ timeout: 10000 });

    // Verify test result is displayed
    await expect(page.getByText('Test Successful')).toBeVisible();
    await expect(page.locator('.mockup-code').last()).toBeVisible();

    // Verify execution time is shown
    await expect(page.locator('text=/\\d+ms/')).toBeVisible();
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

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select and configure calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    await page.locator('input[placeholder*="Enter operation"]').fill('add');

    // Click Test Tool button
    const testButton = page.locator('button').filter({ hasText: 'Test Tool' });
    await testButton.click();

    // Verify loading state
    await expect(page.getByText('Testing...')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.loading-spinner')).toBeVisible();

    // Resolve execution
    resolveExecution!();

    // Wait for completion
    await expect(page.getByText('Tool executed successfully!')).toBeVisible({ timeout: 10000 });
  });

  test('should handle tool execution errors gracefully', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 400, json: mockErrorResult })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select and configure calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    await page.locator('input[placeholder*="Enter operation"]').fill('invalid');

    // Click Test Tool button
    const testButton = page.locator('button').filter({ hasText: 'Test Tool' });
    await testButton.click();

    // Verify error message is displayed
    await expect(
      page.getByText('Test failed: Tool execution failed: Invalid parameter')
    ).toBeVisible({ timeout: 10000 });

    // Verify error result card
    await expect(page.getByText('Test Failed')).toBeVisible();
    await expect(page.locator('.alert-error')).toBeVisible();
  });

  test('should handle tools with no parameters', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockSuccessResult })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('no_params_tool').first()).toBeVisible({ timeout: 10000 });

    // Select no_params_tool
    await page.locator('button').filter({ hasText: 'no_params_tool' }).first().click();

    // Verify message about no parameters
    await expect(page.getByText('This tool does not require any parameters.')).toBeVisible();

    // Should still be able to execute
    const testButton = page.locator('button').filter({ hasText: 'Test Tool' });
    await testButton.click();

    // Verify success
    await expect(page.getByText('Tool executed successfully!')).toBeVisible({ timeout: 10000 });
  });

  test('should clear form data when switching between tools', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select calculator and fill in data
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    await page.locator('input[placeholder*="Enter operation"]').fill('add');
    await page.locator('input[type="number"]').first().fill('5');

    // Switch to string_formatter
    await page.locator('button').filter({ hasText: 'string_formatter' }).first().click();

    // Switch back to calculator
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    // Verify form is cleared
    const operationInput = page.locator('input[placeholder*="Enter operation"]');
    await expect(operationInput).toHaveValue('');
  });

  test('should clear test results when switching tools', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockSuccessResult })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select calculator, execute, and verify results
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    await page.locator('input[placeholder*="Enter operation"]').fill('add');

    const testButton = page.locator('button').filter({ hasText: 'Test Tool' });
    await testButton.click();

    await expect(page.getByText('Test Successful')).toBeVisible({ timeout: 10000 });

    // Switch to another tool
    await page.locator('button').filter({ hasText: 'string_formatter' }).first().click();

    // Verify test results are cleared
    await expect(page.getByText('Test Successful')).not.toBeVisible();
  });

  test('should disable form inputs during tool execution', async ({ page }) => {
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

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    const operationInput = page.locator('input[placeholder*="Enter operation"]');
    await operationInput.fill('add');

    // Click Test Tool button
    const testButton = page.locator('button').filter({ hasText: 'Test Tool' });
    await testButton.click();

    // Verify inputs are disabled during execution
    await expect(operationInput).toBeDisabled();

    // Resolve execution
    resolveExecution!();

    // Wait for completion
    await expect(page.getByText('Tool executed successfully!')).toBeVisible({ timeout: 10000 });

    // Verify inputs are re-enabled
    await expect(operationInput).toBeEnabled();
  });

  test('should display execution timestamp', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.route('**/api/mcp/servers/test-server/call-tool', (route) =>
      route.fulfill({ status: 200, json: mockSuccessResult })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select and execute calculator
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    await page.locator('input[placeholder*="Enter operation"]').fill('add');

    const testButton = page.locator('button').filter({ hasText: 'Test Tool' });
    await testButton.click();

    // Verify timestamp is displayed
    await expect(page.getByText(/Executed at:/)).toBeVisible({ timeout: 10000 });
  });

  test('should display proper alert for API errors', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 500, json: { error: 'Internal server error' } })
    );

    await page.goto('/admin/mcp/tools/testing');

    // Verify error alert is shown
    await expect(page.getByText('Failed to load MCP tools')).toBeVisible({ timeout: 10000 });
  });

  test('should show correct field descriptions from schema', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('calculator').first()).toBeVisible({ timeout: 10000 });

    // Select calculator tool
    await page.locator('button').filter({ hasText: 'calculator' }).first().click();

    // Verify field descriptions are displayed
    await expect(page.getByText('The mathematical operation to perform')).toBeVisible();
    await expect(page.getByText('First number')).toBeVisible();
    await expect(page.getByText('Second number')).toBeVisible();
  });

  test('should handle JSON parse errors for array/object fields', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({ status: 200, json: { servers: mockServers } })
    );

    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('array_processor').first()).toBeVisible({ timeout: 10000 });

    // Select array_processor tool
    await page.locator('button').filter({ hasText: 'array_processor' }).first().click();

    // Fill in invalid JSON
    const arrayTextarea = page.locator('textarea').first();
    await arrayTextarea.fill('invalid json {not an array}');

    // The field should accept the input (error will be handled on execution)
    await expect(arrayTextarea).toHaveValue('invalid json {not an array}');
  });
});
