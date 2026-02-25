import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock MCP servers response
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [
              {
                name: 'Running Server',
                serverUrl: 'http://running.com',
                connected: true,
                tools: [],
                lastConnected: new Date().toISOString(),
                description: 'A running server',
              }
            ],
            configurations: [
              {
                name: 'Stopped Server',
                serverUrl: 'http://stopped.com',
                connected: false, // will be mapped to stopped
                description: 'A stopped server',
              }
            ],
          },
        }),
      });
    });

    // Mock other common endpoints to prevent 404s/errors if UberLayout is present
    await page.route('*/**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('*/**/api/personas', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('*/**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profiles: { llm: [] } }) });
    });
    await page.route('*/**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false }) });
    });
    await page.route('*/**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });
    await page.route('*/**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ active: false }) });
    });
    await page.route('*/**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'mock-token' }) });
    });
  });

  test('should search servers by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Initial state: both servers visible
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();

    // Search for "Running"
    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('Running');
    await page.waitForTimeout(500); // Allow debounce/react update

    // Verify filtering
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeHidden();

    // Clear search
    await page.getByRole('button', { name: 'Clear search' }).click();
    await page.waitForTimeout(500);

    // Verify all visible again
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();

    await assertNoErrors(errors, 'Search by name');
    await page.screenshot({ path: 'verification-mcp-search.png' });
  });

  test('should filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Filter by "Stopped"
    const statusSelect = page.getByRole('combobox');
    await statusSelect.selectOption('stopped');
    await page.waitForTimeout(500);

    // Verify filtering
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeHidden();

    // Filter by "Running"
    await statusSelect.selectOption('running');
    await page.waitForTimeout(500);

    // Verify filtering
    await expect(page.locator('.card', { hasText: 'Running Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Stopped Server' })).toBeHidden();

    await assertNoErrors(errors, 'Filter by status');
  });

  test('should show empty state when no matches', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Search for non-existent
    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('NonExistent');
    await page.waitForTimeout(500);

    // Verify empty state
    await expect(page.getByText('No servers found')).toBeVisible();
    await expect(page.getByText('No servers match your search "NonExistent"')).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(0);

    // Click "Clear filters" action
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.waitForTimeout(500);

    // Verify servers return
    await expect(page.locator('.card')).toHaveCount(2);

    await assertNoErrors(errors, 'Empty state');
  });
});
