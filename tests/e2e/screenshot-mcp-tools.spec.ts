import { test, expect } from '@playwright/test';

test('screenshot mcp tools page', async ({ page }) => {
  // Mock MCP Servers with Tools
  await page.route('**/api/mcp/servers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        servers: [
          {
            name: 'filesystem',
            connected: true,
            tools: [
              {
                name: 'read_file',
                description: 'Read the contents of a file',
                inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
              },
              {
                name: 'write_file',
                description: 'Write content to a file',
                inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
              },
              {
                name: 'list_directory',
                description: 'List files in a directory',
                inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
              }
            ]
          },
          {
            name: 'git',
            connected: true,
            tools: [
              {
                name: 'git_status',
                description: 'Get the status of the git repository',
                inputSchema: { type: 'object', properties: {} }
              },
              {
                name: 'git_log',
                description: 'Get the commit log',
                inputSchema: { type: 'object', properties: { count: { type: 'number' } } }
              }
            ]
          },
          {
            name: 'weather',
            connected: false,
            tools: [
              {
                name: 'get_weather',
                description: 'Get current weather for a location',
                inputSchema: { type: 'object', properties: { location: { type: 'string' } }, required: ['location'] }
              }
            ]
          }
        ]
      })
    });
  });

  // Mock auth check
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            id: 'admin',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin'
        })
    });
  });

  // Navigate to MCP Tools page
  await page.goto('/admin/mcp/tools');

  // Wait for content to load
  await expect(page.getByText('MCP Tools')).toBeVisible();
  await expect(page.getByText('read_file')).toBeVisible();
  await expect(page.getByText('git_status')).toBeVisible();

  // Wait for animations/rendering
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/mcp-tools-list.png', fullPage: true });
});
