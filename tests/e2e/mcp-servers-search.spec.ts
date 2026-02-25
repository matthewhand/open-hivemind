import { expect, test } from '@playwright/test';
import { assertNoErrors, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(90000);

  const mockServers = {
    servers: [
      {
        name: 'Running Server',
        serverUrl: 'http://running.com',
        url: 'http://running.com',
        connected: true,
        tools: [{ name: 'tool1' }],
        lastConnected: new Date().toISOString(),
        description: 'A running server'
      }
    ],
    configurations: [
      {
        name: 'Stopped Server',
        serverUrl: 'http://stopped.com',
        url: 'http://stopped.com',
        apiKey: '123',
        description: 'A stopped server'
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock the main API response
    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockServers
        })
      });
    });

    // Mock other endpoints to prevent errors and network idle timeouts
    await page.route('/api/auth/check', async (route) => {
       await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock global config and other background pollers
    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profiles: { llm: [] } }) });
    });
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false }) });
    });
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });
    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ active: false }) });
    });
     await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'mock-csrf' }) });
    });
  });

  test('can search servers by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/mcp/servers');

    // Wait for content to load instead of networkidle
    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.waitFor({ state: 'visible' });

    await searchInput.fill('Running');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    const serverCards = page.locator('.card');
    // We expect 1 visible card (Running Server)
    const visibleCard = serverCards.filter({ hasText: 'Running Server' });
    await expect(visibleCard).toBeVisible();

    // Check others are not visible
    await expect(page.locator('text=Stopped Server')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP Server search by name');
    await page.screenshot({ path: 'verification-mcp-search.png' });
  });

  test('can search servers by URL', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.waitFor({ state: 'visible' });

    await searchInput.fill('stopped.com');
    await page.waitForTimeout(500);

    const visibleCard = page.locator('.card').filter({ hasText: 'Stopped Server' });
    await expect(visibleCard).toBeVisible();

    await expect(page.locator('text=Running Server')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP Server search by URL');
  });

  test('can filter servers by status', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.waitFor({ state: 'visible' });

    // Select 'Stopped' from the dropdown
    const statusSelect = page.locator('select');
    await statusSelect.selectOption('stopped');
    await page.waitForTimeout(500);

    const visibleCard = page.locator('.card').filter({ hasText: 'Stopped Server' });
    await expect(visibleCard).toBeVisible();
    await expect(page.locator('text=Running Server')).not.toBeVisible();

    // Select 'Running'
    await statusSelect.selectOption('running');
    await page.waitForTimeout(500);

    const visibleRunningCard = page.locator('.card').filter({ hasText: 'Running Server' });
    await expect(visibleRunningCard).toBeVisible();
    await expect(page.locator('text=Stopped Server')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP Server filter by status');
  });

  test('shows empty state when no matches found', async ({ page }) => {
     const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/mcp/servers');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.waitFor({ state: 'visible' });

    await searchInput.fill('NonExistentServer');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No servers found')).toBeVisible();
    await expect(page.locator('text=No servers match your search "NonExistentServer"')).toBeVisible();

    // Verify "Clear Filters" button works
    const clearButton = page.getByRole('button', { name: 'Clear Filters' });
    await clearButton.click();

    await expect(page.getByRole('heading', { name: 'Running Server' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stopped Server' })).toBeVisible();

    await assertNoErrors(errors, 'MCP Server empty search state');
  });
});
