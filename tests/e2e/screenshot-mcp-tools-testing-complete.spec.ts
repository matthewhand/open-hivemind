import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Tools Testing Page - Complete Visual Regression Tests', () => {
  const mockServers = [
    {
      name: 'Weather Service',
      url: 'stdio://weather-mcp',
      connected: true,
      tools: [
        {
          name: 'get_weather',
          description: 'Get current weather conditions for a specific city.',
          inputSchema: {
            type: 'object',
            required: ['city'],
            properties: {
              city: {
                type: 'string',
                description: 'The name of the city (e.g., "Paris")',
              },
              units: {
                type: 'string',
                description: 'Temperature units (celsius or fahrenheit)',
              },
              includeHourly: {
                type: 'boolean',
                description: 'Include hourly forecast data',
              },
              days: {
                type: 'integer',
                description: 'Number of forecast days (1-7)',
              },
            },
          },
        },
        {
          name: 'get_air_quality',
          description: 'Get air quality index for a location.',
          inputSchema: {
            type: 'object',
            required: ['location'],
            properties: {
              location: {
                type: 'string',
                description: 'Location (city or coordinates)',
              },
            },
          },
        },
      ],
      lastConnected: new Date('2024-03-25T10:00:00Z').toISOString(),
    },
    {
      name: 'Database Tools',
      url: 'stdio://db-mcp',
      connected: true,
      tools: [
        {
          name: 'query_database',
          description: 'Execute a safe read-only database query.',
          inputSchema: {
            type: 'object',
            required: ['query'],
            properties: {
              query: {
                type: 'string',
                description: 'SQL SELECT query',
              },
              limit: {
                type: 'integer',
                description: 'Maximum number of rows to return',
              },
            },
          },
        },
        {
          name: 'list_tables',
          description: 'List all available database tables.',
          inputSchema: {
            type: 'object',
            properties: {
              schema: {
                type: 'string',
                description: 'Database schema name (optional)',
              },
            },
          },
        },
      ],
      lastConnected: new Date('2024-03-25T09:30:00Z').toISOString(),
    },
    {
      name: 'File System Tools',
      url: 'stdio://fs-mcp',
      connected: true,
      tools: [
        {
          name: 'read_file',
          description: 'Read contents of a file.',
          inputSchema: {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file',
              },
              encoding: {
                type: 'string',
                description: 'File encoding (default: utf-8)',
              },
            },
          },
        },
        {
          name: 'list_directory',
          description: 'List files and directories.',
          inputSchema: {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                description: 'Directory path',
              },
              recursive: {
                type: 'boolean',
                description: 'List recursively',
              },
            },
          },
        },
      ],
      lastConnected: new Date('2024-03-25T11:15:00Z').toISOString(),
    },
  ];

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

    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Screenshot 1: Initial page load with tool registry', async ({ page }) => {
    // Mock MCP servers list
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    await setupTestWithErrorDetection(page);

    // Navigate to MCP Tools Testing page
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    // Wait for page to load and tools to be displayed
    await expect(page.getByText('MCP Tools Testing')).toBeVisible();
    await expect(page.getByText('Available Tools')).toBeVisible();
    await expect(page.getByText('get_weather')).toBeVisible();
    await page.waitForTimeout(1000);

    // Screenshot: Initial page load with tool registry
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-initial-load.png',
      fullPage: true,
    });

    // Verify multiple tools from different servers are listed
    await expect(page.getByText('Weather Service')).toBeVisible();
    await expect(page.getByText('Database Tools')).toBeVisible();
    await expect(page.getByText('File System Tools')).toBeVisible();
  });

  test('Screenshot 2: Tool selection and parameter configuration', async ({ page }) => {
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    // Wait for tools list
    await expect(page.getByText('MCP Tools Testing')).toBeVisible();
    await expect(page.getByText('get_weather')).toBeVisible();

    // Select the weather tool
    await page.getByRole('button', { name: /get_weather/ }).click();

    // Wait for tool details to be displayed
    await expect(page.getByText('Input Schema')).toBeVisible();
    await expect(page.getByText('Test Parameters')).toBeVisible();

    // Fill in the form fields
    await page.getByPlaceholder('Enter city...').fill('San Francisco');
    await page.getByPlaceholder('Enter units...').fill('celsius');

    // Check the boolean field
    const includeHourlyToggle = page.locator('input[type="checkbox"]').first();
    await includeHourlyToggle.check();

    // Fill in the days field
    await page.getByPlaceholder('Enter days...').fill('5');

    // Wait for form to settle
    await page.waitForTimeout(500);

    // Screenshot: Tool selection and parameter configuration
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-parameter-config.png',
      fullPage: true,
    });
  });

  test('Screenshot 3: Tool execution in progress', async ({ page }) => {
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    // Mock tool execution with delay to capture loading state
    await page.route('**/api/mcp/servers/*/call-tool', async (route) => {
      // Delay to show loading spinner
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            content: [{ type: 'text', text: 'Success' }],
          },
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    await expect(page.getByText('get_weather')).toBeVisible();

    // Select tool and fill parameters
    await page.getByRole('button', { name: /get_weather/ }).click();
    await page.getByPlaceholder('Enter city...').fill('Paris');

    // Click Test Tool button
    await page.getByRole('button', { name: /Test Tool/ }).click();

    // Wait for loading spinner to appear
    await expect(page.getByText('Testing...')).toBeVisible({ timeout: 2000 });

    // Screenshot: Tool execution in progress
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-execution-progress.png',
      fullPage: true,
    });
  });

  test('Screenshot 4: Tool execution success result', async ({ page }) => {
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    // Mock successful tool execution
    await page.route('**/api/mcp/servers/Weather%20Service/call-tool', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  city: 'San Francisco',
                  temperature: 18,
                  units: 'celsius',
                  conditions: 'Partly Cloudy',
                  humidity: 65,
                  windSpeed: 12,
                  windDirection: 'NW',
                  pressure: 1013,
                  visibility: 16,
                  uvIndex: 5,
                  forecast: [
                    { day: 'Mon', high: 20, low: 14, conditions: 'Sunny' },
                    { day: 'Tue', high: 19, low: 13, conditions: 'Cloudy' },
                    { day: 'Wed', high: 21, low: 15, conditions: 'Clear' },
                    { day: 'Thu', high: 18, low: 12, conditions: 'Rain' },
                    { day: 'Fri', high: 22, low: 16, conditions: 'Sunny' },
                  ],
                }),
              },
            ],
          },
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    await expect(page.getByText('get_weather')).toBeVisible();

    // Select tool and fill parameters
    await page.getByRole('button', { name: /get_weather/ }).click();
    await page.getByPlaceholder('Enter city...').fill('San Francisco');
    await page.getByPlaceholder('Enter units...').fill('celsius');

    // Click Test Tool button
    await page.getByRole('button', { name: /Test Tool/ }).click();

    // Wait for success result
    await expect(page.getByText('Test Successful')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Output')).toBeVisible();
    await page.waitForTimeout(500);

    // Screenshot: Tool execution success result
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-success-result.png',
      fullPage: true,
    });
  });

  test('Screenshot 5: Tool execution error result', async ({ page }) => {
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    // Mock failed tool execution
    await page.route('**/api/mcp/servers/*/call-tool', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Connection to weather service failed: Network timeout',
          code: 'SERVICE_UNAVAILABLE',
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    await expect(page.getByText('get_weather')).toBeVisible();

    // Select tool and fill parameters
    await page.getByRole('button', { name: /get_weather/ }).click();
    await page.getByPlaceholder('Enter city...').fill('Invalid City');

    // Click Test Tool button
    await page.getByRole('button', { name: /Test Tool/ }).click();

    // Wait for error result
    await expect(page.getByText('Test Failed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Connection to weather service failed/i)).toBeVisible();
    await page.waitForTimeout(500);

    // Screenshot: Tool execution error result
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-error-result.png',
      fullPage: true,
    });
  });

  test('Screenshot 6: Complex parameter types (array and object)', async ({ page }) => {
    const complexToolServers = [
      {
        name: 'Advanced API',
        url: 'stdio://api-mcp',
        connected: true,
        tools: [
          {
            name: 'batch_process',
            description: 'Process multiple items with configuration.',
            inputSchema: {
              type: 'object',
              required: ['items', 'config'],
              properties: {
                items: {
                  type: 'array',
                  description: 'Array of items to process',
                },
                config: {
                  type: 'object',
                  description: 'Processing configuration',
                },
                batchSize: {
                  type: 'integer',
                  description: 'Number of items per batch',
                },
                parallel: {
                  type: 'boolean',
                  description: 'Process batches in parallel',
                },
              },
            },
          },
        ],
        lastConnected: new Date().toISOString(),
      },
    ];

    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: complexToolServers }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    await expect(page.getByText('batch_process')).toBeVisible();

    // Select the complex tool
    await page.getByRole('button', { name: /batch_process/ }).click();

    // Wait for form
    await expect(page.getByText('Test Parameters')).toBeVisible();

    // Fill in array field
    const itemsTextarea = page.getByPlaceholder(/Enter array as JSON/i).first();
    await itemsTextarea.fill('["item1", "item2", "item3"]');

    // Fill in object field
    const configTextarea = page.getByPlaceholder(/Enter object as JSON/i).first();
    await configTextarea.fill('{"mode": "fast", "retry": true}');

    // Fill in integer field
    await page.getByPlaceholder('Enter batchSize...').fill('10');

    // Toggle boolean
    const parallelToggle = page.locator('input[type="checkbox"]').first();
    await parallelToggle.check();

    await page.waitForTimeout(500);

    // Screenshot: Complex parameter types
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-complex-parameters.png',
      fullPage: true,
    });
  });

  test('Screenshot 7: Tool schema display with detailed information', async ({ page }) => {
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    await expect(page.getByText('query_database')).toBeVisible();

    // Select the database query tool
    await page.getByRole('button', { name: /query_database/ }).click();

    // Wait for schema to be displayed
    await expect(page.getByText('Input Schema')).toBeVisible();
    await expect(page.getByText('query_database')).toBeVisible();
    await expect(page.getByText(/Execute a safe read-only database query/i)).toBeVisible();

    // Verify schema JSON is displayed
    await expect(page.locator('.mockup-code')).toBeVisible();

    await page.waitForTimeout(500);

    // Screenshot: Tool schema display
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-schema-display.png',
      fullPage: true,
    });
  });

  test('Screenshot 8: Empty state - No tools available', async ({ page }) => {
    // Mock empty servers response
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: [] }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    // Wait for page to load
    await expect(page.getByText('MCP Tools Testing')).toBeVisible();

    // Verify empty state message
    await expect(page.getByText(/No tools available/i)).toBeVisible();
    await expect(page.getByText(/Connect MCP servers first/i)).toBeVisible();

    await page.waitForTimeout(500);

    // Screenshot: Empty state
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-empty-state.png',
      fullPage: true,
    });
  });

  test('Screenshot 9: Loading state', async ({ page }) => {
    // Mock API with delay to capture loading state
    await page.route('/api/mcp/servers', async (route) => {
      // Delay response
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    await setupTestWithErrorDetection(page);

    // Navigate to page
    await page.goto('/admin/mcp/tools/testing');

    // Wait for loading skeleton to appear
    await page.waitForSelector('.skeleton', { timeout: 5000 });

    // Screenshot: Loading state
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-loading-state.png',
      fullPage: true,
    });
  });

  test('Screenshot 10: Tool with no parameters', async ({ page }) => {
    const noParamServers = [
      {
        name: 'Simple Service',
        url: 'stdio://simple-mcp',
        connected: true,
        tools: [
          {
            name: 'health_check',
            description: 'Check service health status.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
        lastConnected: new Date().toISOString(),
      },
    ];

    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: noParamServers }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    await expect(page.getByText('health_check')).toBeVisible();

    // Select the no-param tool
    await page.getByRole('button', { name: /health_check/ }).click();

    // Wait for info message
    await expect(page.getByText(/This tool does not require any parameters/i)).toBeVisible();

    await page.waitForTimeout(500);

    // Screenshot: Tool with no parameters
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-no-parameters.png',
      fullPage: true,
    });
  });

  test('Screenshot 11: Multiple tool servers organized by service', async ({ page }) => {
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    // Wait for all tools to be loaded
    await expect(page.getByText('MCP Tools Testing')).toBeVisible();
    await expect(page.getByText('Available Tools')).toBeVisible();

    // Verify tools from different servers are visible
    await expect(page.getByText('get_weather')).toBeVisible();
    await expect(page.getByText('get_air_quality')).toBeVisible();
    await expect(page.getByText('query_database')).toBeVisible();
    await expect(page.getByText('list_tables')).toBeVisible();
    await expect(page.getByText('read_file')).toBeVisible();
    await expect(page.getByText('list_directory')).toBeVisible();

    await page.waitForTimeout(500);

    // Screenshot: Multiple tool servers
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-multiple-servers.png',
      fullPage: true,
    });
  });

  test('Screenshot 12: Execution timing display', async ({ page }) => {
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: mockServers }),
      });
    });

    // Mock tool execution with specific timing
    await page.route('**/api/mcp/servers/*/call-tool', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 450)); // 450ms delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ status: 'ok', data: { id: 1, name: 'Test' } }),
              },
            ],
          },
        }),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/tools/testing');

    await expect(page.getByText('list_tables')).toBeVisible();

    // Select and execute tool
    await page.getByRole('button', { name: /list_tables/ }).click();
    await page.getByRole('button', { name: /Test Tool/ }).click();

    // Wait for result
    await expect(page.getByText('Test Successful')).toBeVisible({ timeout: 10000 });

    // Verify execution time is displayed
    await expect(page.locator('text=/\\d+ms/')).toBeVisible();

    await page.waitForTimeout(500);

    // Screenshot: Execution timing display
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing-execution-timing.png',
      fullPage: true,
    });
  });
});
