import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Tools Testing Screenshots', () => {
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

    // Mock MCP servers list with rich tools for testing
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [
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
              lastConnected: new Date().toISOString(),
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
              ],
              lastConnected: new Date().toISOString(),
            },
          ],
        }),
      });
    });
  });

  test('capture MCP tools testing interface with tool execution', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to MCP Tools Testing page
    await page.goto('/admin/mcp/tools/testing');

    // Wait for the page to load and tools to be displayed
    await expect(page.getByText('MCP Tools Testing')).toBeVisible();
    await expect(page.getByText('get_weather')).toBeVisible();
    await expect(page.getByText('Available Tools')).toBeVisible();

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

    // Wait a moment for the form to be fully populated
    await page.waitForTimeout(500);

    // Take screenshot of the filled form before execution
    await page.screenshot({
      path: 'docs/screenshots/mcp-tools-testing.png',
      fullPage: true,
    });

    // Mock the tool execution
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

    // Click the Test Tool button
    await page.getByRole('button', { name: /Test Tool/ }).click();

    // Wait for the result to be displayed
    await expect(page.getByText('Test Successful')).toBeVisible({ timeout: 10000 });

    // Verify result elements are present
    await expect(page.getByText('Output')).toBeVisible();
    await expect(page.getByText(/San Francisco/i)).toBeVisible();

    // Wait a moment for animations
    await page.waitForTimeout(500);
  });

  test('capture different parameter types in form', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to page
    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('MCP Tools Testing')).toBeVisible();

    // Select a tool with various parameter types
    await page.getByRole('button', { name: /get_weather/ }).click();

    // Wait for form to appear
    await expect(page.getByText('Test Parameters')).toBeVisible();

    // Verify different input types are rendered
    await expect(page.getByPlaceholder('Enter city...')).toBeVisible(); // string
    await expect(page.getByPlaceholder('Enter days...')).toBeVisible(); // integer
    await expect(page.locator('input[type="checkbox"]')).toBeVisible(); // boolean

    // Verify schema is displayed
    await expect(page.getByText('Input Schema')).toBeVisible();
    await expect(page.getByText(/"type":\s*"object"/)).toBeVisible();
  });

  test('capture tool selection and schema display', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to page
    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('MCP Tools Testing')).toBeVisible();

    // Verify multiple tools are available
    await expect(page.getByText('get_weather')).toBeVisible();
    await expect(page.getByText('get_air_quality')).toBeVisible();
    await expect(page.getByText('query_database')).toBeVisible();

    // Select different tools and verify schema changes
    await page.getByRole('button', { name: /get_air_quality/ }).click();
    await expect(page.getByText(/Get air quality index/i)).toBeVisible();
    await expect(page.getByPlaceholder('Enter location...')).toBeVisible();
  });

  test('capture error handling in tool execution', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to page
    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('MCP Tools Testing')).toBeVisible();

    // Select a tool
    await page.getByRole('button', { name: /get_weather/ }).click();
    await expect(page.getByText('Test Parameters')).toBeVisible();

    // Mock a failed tool execution
    await page.route('**/api/mcp/servers/*/call-tool', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Connection to weather service failed',
          code: 'SERVICE_UNAVAILABLE',
        }),
      });
    });

    // Fill in minimal required fields
    await page.getByPlaceholder('Enter city...').fill('Invalid City');

    // Click test button
    await page.getByRole('button', { name: /Test Tool/ }).click();

    // Wait for error to be displayed
    await expect(page.getByText('Test Failed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Connection to weather service failed/i)).toBeVisible();
  });

  test('capture empty state when no tools available', async ({ page }) => {
    // Mock empty servers response
    await page.route('/api/mcp/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          servers: [],
        }),
      });
    });

    // Set viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to page
    await page.goto('/admin/mcp/tools/testing');

    await expect(page.getByText('MCP Tools Testing')).toBeVisible();

    // Verify empty state message
    await expect(page.getByText(/No tools available/i)).toBeVisible();
    await expect(page.getByText(/Connect MCP servers first/i)).toBeVisible();
  });
});
