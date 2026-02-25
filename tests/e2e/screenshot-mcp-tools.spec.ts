import { test, expect } from '@playwright/test';

test('MCP Tools Page Screenshot', async ({ page }) => {
  // Set viewport
  await page.setViewportSize({ width: 1280, height: 800 });

  // Mock API response
  await page.route('**/api/mcp/servers', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        servers: [
          {
            name: 'filesystem',
            serverUrl: 'http://localhost:8000',
            connected: true,
            tools: [
              {
                name: 'read_file',
                description: 'Reads the content of a file from the filesystem.',
                inputSchema: { type: 'object', properties: { path: { type: 'string' } } }
              },
              {
                name: 'write_file',
                description: 'Writes content to a file, overwriting if it exists.',
                inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } }
              }
            ]
          },
          {
            name: 'git-server',
            serverUrl: 'http://localhost:8001',
            connected: true,
            tools: [
              {
                name: 'git_status',
                description: 'Show the working tree status.',
                inputSchema: { type: 'object', properties: { repo_path: { type: 'string' } } }
              }
            ]
          }
        ]
      })
    });
  });

  // Navigate to MCP Tools page
  await page.goto('/admin/mcp/tools');

  // Wait for content
  await expect(page.getByRole('heading', { name: 'MCP Tools' })).toBeVisible();
  await expect(page.getByText('read_file')).toBeVisible();
  await expect(page.getByText('git_status')).toBeVisible();

  // Wait for animations
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/mcp-tools.png', fullPage: true });
});
