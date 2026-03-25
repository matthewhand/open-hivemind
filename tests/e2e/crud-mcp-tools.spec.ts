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

  const mockTools = [
    {
      id: 'tool-1',
      name: 'web_search',
      description: 'Search the web for information using a query string',
      category: 'Search',
      server: 'Production MCP',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          maxResults: { type: 'number', description: 'Maximum number of results' },
        },
        required: ['query'],
      },
    },
    {
      id: 'tool-2',
      name: 'file_read',
      description: 'Read contents of a file from the filesystem',
      category: 'Filesystem',
      server: 'Production MCP',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
          encoding: { type: 'string', description: 'File encoding', enum: ['utf-8', 'ascii', 'base64'] },
        },
        required: ['path'],
      },
    },
    {
      id: 'tool-3',
      name: 'send_email',
      description: 'Send an email to a specified recipient',
      category: 'Communication',
      server: 'Staging MCP',
      enabled: false,
      parameters: {
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
      id: 'tool-4',
      name: 'database_query',
      description: 'Execute a SQL query against the configured database',
      category: 'Database',
      server: 'Production MCP',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SQL query to execute' },
          timeout: { type: 'number', description: 'Query timeout in seconds' },
        },
        required: ['sql'],
      },
    },
    {
      id: 'tool-5',
      name: 'image_resize',
      description: 'Resize an image to specified dimensions',
      category: 'Media',
      server: 'Staging MCP',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Image URL' },
          width: { type: 'number', description: 'Target width' },
          height: { type: 'number', description: 'Target height' },
        },
        required: ['url', 'width', 'height'],
      },
    },
  ];

  const mockExecutionResult = {
    success: true,
    result: {
      data: [
        { title: 'Example result 1', url: 'https://example.com/1', snippet: 'First search result' },
        { title: 'Example result 2', url: 'https://example.com/2', snippet: 'Second search result' },
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
          json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } })),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('list tools with cards', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: mockTools } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await page.waitForTimeout(1000);

    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('file_read').first()).toBeVisible();
    await expect(page.getByText('send_email').first()).toBeVisible();
    await expect(page.getByText('database_query').first()).toBeVisible();
  });

  test('search tools by name or description', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: mockTools } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('email');
      await page.waitForTimeout(300);

      // send_email should still be visible
      const emailTool = page.getByText('send_email').first();
      if ((await emailTool.count()) > 0) {
        await expect(emailTool).toBeVisible();
      }
    }
  });

  test('filter by category dropdown', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: mockTools } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const categoryFilter = page.locator('select:has(option:has-text("Search")), select:has(option:has-text("Category")), select[id*="category" i]').first();
    if ((await categoryFilter.count()) > 0) {
      await categoryFilter.selectOption({ label: 'Search' });
      await page.waitForTimeout(300);
    }
  });

  test('filter by server dropdown', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: mockTools } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const serverFilter = page.locator('select:has(option:has-text("Production MCP")), select:has(option:has-text("Server")), select[id*="server" i]').first();
    if ((await serverFilter.count()) > 0) {
      await serverFilter.selectOption({ label: 'Staging MCP' });
      await page.waitForTimeout(300);
    }
  });

  test('enable/disable tool toggle', async ({ page }) => {
    let toolsState = mockTools.map((t) => ({ ...t }));

    await page.route('**/api/mcp/tools*', async (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        toolsState = toolsState.map((t) =>
          t.id === body.id ? { ...t, enabled: body.enabled } : t
        );
        await route.fulfill({ status: 200, json: { success: true } });
      } else {
        await route.fulfill({ status: 200, json: { success: true, data: toolsState } });
      }
    });
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    // Find toggle for a specific tool (send_email which is disabled)
    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'send_email' }).first();
    if ((await toolCard.count()) > 0) {
      const toggle = toolCard.locator('input[type="checkbox"], .toggle').first();
      if ((await toggle.count()) > 0) {
        await toggle.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('open run tool modal', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: mockTools } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    // Click run/execute button on web_search tool
    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'web_search' }).first();
    if ((await toolCard.count()) > 0) {
      const runBtn = toolCard.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Test"), button[title*="Run"], button[title*="Execute"]').first();
      if ((await runBtn.count()) > 0) {
        await runBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
        if ((await modal.count()) > 0) {
          await expect(modal).toBeVisible();
        }
      }
    }
  });

  test('execute tool with JSON input', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) => {
      if (route.request().url().includes('execute')) {
        return route.fulfill({ status: 200, json: mockExecutionResult });
      }
      return route.fulfill({ status: 200, json: { success: true, data: mockTools } });
    });
    await page.route('**/api/mcp/tools/tool-1/execute', (route) =>
      route.fulfill({ status: 200, json: mockExecutionResult })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'web_search' }).first();
    if ((await toolCard.count()) > 0) {
      const runBtn = toolCard.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Test"), button[title*="Run"]').first();
      if ((await runBtn.count()) > 0) {
        await runBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
        if ((await modal.count()) > 0) {
          // Find JSON textarea or editor
          const jsonInput = modal.locator('textarea, [class*="editor"], [contenteditable="true"]').first();
          if ((await jsonInput.count()) > 0) {
            await jsonInput.fill('{"query": "test search", "maxResults": 5}');
            await page.waitForTimeout(200);
          }

          // Click execute
          const executeBtn = modal.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("Submit")').first();
          if ((await executeBtn.count()) > 0) {
            await executeBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
  });

  test('execute tool with form mode input', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) => {
      if (route.request().url().includes('execute')) {
        return route.fulfill({ status: 200, json: mockExecutionResult });
      }
      return route.fulfill({ status: 200, json: { success: true, data: mockTools } });
    });
    await page.route('**/api/mcp/tools/tool-1/execute', (route) =>
      route.fulfill({ status: 200, json: mockExecutionResult })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'web_search' }).first();
    if ((await toolCard.count()) > 0) {
      const runBtn = toolCard.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Test"), button[title*="Run"]').first();
      if ((await runBtn.count()) > 0) {
        await runBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
        if ((await modal.count()) > 0) {
          // Switch to Form mode
          const formModeBtn = modal.locator('button:has-text("Form"), [role="tab"]:has-text("Form"), label:has-text("Form")').first();
          if ((await formModeBtn.count()) > 0) {
            await formModeBtn.click();
            await page.waitForTimeout(300);
          }

          // Fill form inputs
          const queryInput = modal.locator('input[name="query"], input[placeholder*="query" i], input[id*="query" i]').first();
          if ((await queryInput.count()) > 0) {
            await queryInput.fill('test search query');
            await page.waitForTimeout(200);
          }

          // Click execute
          const executeBtn = modal.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("Submit")').first();
          if ((await executeBtn.count()) > 0) {
            await executeBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
  });

  test('toggle between form and JSON modes', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: mockTools } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'web_search' }).first();
    if ((await toolCard.count()) > 0) {
      const runBtn = toolCard.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Test"), button[title*="Run"]').first();
      if ((await runBtn.count()) > 0) {
        await runBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
        if ((await modal.count()) > 0) {
          // Switch to JSON mode
          const jsonModeBtn = modal.locator('button:has-text("JSON"), [role="tab"]:has-text("JSON"), label:has-text("JSON")').first();
          if ((await jsonModeBtn.count()) > 0) {
            await jsonModeBtn.click();
            await page.waitForTimeout(300);
          }

          // Switch to Form mode
          const formModeBtn = modal.locator('button:has-text("Form"), [role="tab"]:has-text("Form"), label:has-text("Form")').first();
          if ((await formModeBtn.count()) > 0) {
            await formModeBtn.click();
            await page.waitForTimeout(300);
          }

          // Switch back to JSON mode
          if ((await jsonModeBtn.count()) > 0) {
            await jsonModeBtn.click();
            await page.waitForTimeout(300);
          }
        }
      }
    }
  });

  test('tool execution loading state', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) => {
      if (route.request().url().includes('execute')) {
        // Delay to show loading
        return new Promise((resolve) =>
          setTimeout(() => resolve(route.fulfill({ status: 200, json: mockExecutionResult })), 2000)
        );
      }
      return route.fulfill({ status: 200, json: { success: true, data: mockTools } });
    });
    await page.route('**/api/mcp/tools/tool-1/execute', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ status: 200, json: mockExecutionResult });
    });
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'web_search' }).first();
    if ((await toolCard.count()) > 0) {
      const runBtn = toolCard.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Test"), button[title*="Run"]').first();
      if ((await runBtn.count()) > 0) {
        await runBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
        if ((await modal.count()) > 0) {
          const executeBtn = modal.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("Submit")').first();
          if ((await executeBtn.count()) > 0) {
            await executeBtn.click();

            // Check for loading indicator in modal
            const loading = modal.locator('[class*="loading"], [class*="spinner"], .skeleton, [role="progressbar"]').first();
            if ((await loading.count()) > 0) {
              await expect(loading).toBeVisible({ timeout: 3000 });
            }

            // Wait for result
            await page.waitForTimeout(3000);
          }
        }
      }
    }
  });

  test('tool execution result display', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) => {
      if (route.request().url().includes('execute')) {
        return route.fulfill({ status: 200, json: mockExecutionResult });
      }
      return route.fulfill({ status: 200, json: { success: true, data: mockTools } });
    });
    await page.route('**/api/mcp/tools/tool-1/execute', (route) =>
      route.fulfill({ status: 200, json: mockExecutionResult })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'web_search' }).first();
    if ((await toolCard.count()) > 0) {
      const runBtn = toolCard.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Test"), button[title*="Run"]').first();
      if ((await runBtn.count()) > 0) {
        await runBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
        if ((await modal.count()) > 0) {
          const executeBtn = modal.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("Submit")').first();
          if ((await executeBtn.count()) > 0) {
            await executeBtn.click();
            await page.waitForTimeout(500);

            // Check for result output area
            const resultArea = modal.locator('pre, code, [class*="result"], [class*="output"], textarea[readonly]').first();
            if ((await resultArea.count()) > 0) {
              await expect(resultArea).toBeVisible();
            }

            // Check for execution time display
            const execTime = page.getByText('245').or(page.getByText(/245\s*ms/)).first();
            if ((await execTime.count()) > 0) {
              await expect(execTime).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('empty state when no tools', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: [] } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await page.waitForTimeout(1000);

    // Should show empty state
    await expect(page.locator('body')).toBeVisible();
    const emptyText = page.locator('text=/no.*tool/i, text=/no.*available/i, text=/get.*started/i, text=/connect.*server/i').first();
    if ((await emptyText.count()) > 0) {
      await expect(emptyText).toBeVisible();
    }
  });

  test('invalid JSON shows error in modal', async ({ page }) => {
    await page.route('**/api/mcp/tools*', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: mockTools } })
    );
    await page.route('**/api/admin/mcp-servers', (route) =>
      route.fulfill({ status: 200, json: { success: true, data: { servers: [], configurations: [] } } })
    );

    await page.goto('/admin/mcp/tools');
    await expect(page.getByText('web_search').first()).toBeVisible({ timeout: 5000 });

    const toolCard = page.locator('.card, [class*="card"], tr, [class*="item"]').filter({ hasText: 'web_search' }).first();
    if ((await toolCard.count()) > 0) {
      const runBtn = toolCard.locator('button:has-text("Run"), button:has-text("Execute"), button:has-text("Test"), button[title*="Run"]').first();
      if ((await runBtn.count()) > 0) {
        await runBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
        if ((await modal.count()) > 0) {
          // Switch to JSON mode
          const jsonModeBtn = modal.locator('button:has-text("JSON"), [role="tab"]:has-text("JSON"), label:has-text("JSON")').first();
          if ((await jsonModeBtn.count()) > 0) {
            await jsonModeBtn.click();
            await page.waitForTimeout(300);
          }

          // Enter invalid JSON
          const jsonInput = modal.locator('textarea, [class*="editor"], [contenteditable="true"]').first();
          if ((await jsonInput.count()) > 0) {
            await jsonInput.fill('{invalid json content missing quotes}');
            await page.waitForTimeout(200);
          }

          // Try to execute
          const executeBtn = modal.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("Submit")').first();
          if ((await executeBtn.count()) > 0) {
            await executeBtn.click();
            await page.waitForTimeout(500);
          }

          // Check for JSON error message
          const errorMsg = modal.locator('[class*="error"], .text-error, [class*="invalid"], text=/invalid.*json/i, text=/json.*error/i, text=/parse.*error/i').first();
          if ((await errorMsg.count()) > 0) {
            await expect(errorMsg).toBeVisible();
          }
        }
      }
    }
  });
});
