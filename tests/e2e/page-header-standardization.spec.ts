import { expect, test } from '@playwright/test';

test.describe('Page Header Standardization', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock dependencies for LLM Providers
    await page.route('/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { profiles: { llm: [] } } });
    });
    await page.route('/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });
    await page.route('/api/config/global', async (route) => {
        await route.fulfill({ status: 200, json: {} });
    });

     // Mock dependencies for MCP Servers
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({ status: 200, json: { data: { servers: [], configurations: [] } } });
    });
  });

  test('MCP Servers page should have standard header', async ({ page }) => {
    await page.goto('/admin/mcp/servers');

    // Check Title
    await expect(page.getByRole('heading', { name: 'MCP Servers', level: 1 })).toBeVisible();

    // Check Description (PageHeader renders description in a p tag)
    await expect(page.getByText('Manage Model Context Protocol servers and their tools')).toBeVisible();

    // Check Action Button
    await expect(page.getByRole('button', { name: 'Add Server' })).toBeVisible();

    await page.screenshot({ path: 'mcp-servers-header.png' });
  });

  test('LLM Providers page should have standard header', async ({ page }) => {
    await page.goto('/admin/providers/llm');

    // Check Title
    await expect(page.getByRole('heading', { name: 'LLM Providers', level: 1 })).toBeVisible();

    // Check Description
    await expect(page.getByText('Configure reusable AI personalities and connection templates.')).toBeVisible();

    // Check Action Button
    await expect(page.getByRole('button', { name: 'Create Profile' })).toBeVisible();

    await page.screenshot({ path: 'llm-providers-header.png' });
  });
});
