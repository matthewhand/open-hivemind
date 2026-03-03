import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('BotCreatePage Tools Section Content Review', () => {
  test('renders tools section correctly with servers', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock required API endpoints
    await page.route('/api/auth/check', async route => {
      await route.fulfill({ json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('/api/config/global', async route => {
      await route.fulfill({ json: { config: { /* global config needed */ } } });
    });

    await page.route('/api/bots', async route => {
      await route.fulfill({ json: [] });
    });

    await page.route('/api/admin/roles', async route => {
      await route.fulfill({ json: [] });
    });

    await page.route('/api/health/detailed', async route => {
      await route.fulfill({ json: {} });
    });

    await page.route('/api/config/llm-status', async route => {
      await route.fulfill({ json: { status: { defaultConfigured: true, defaultProviders: [{ name: 'TestLLM' }] } } });
    });

    await page.route('/api/mcp/servers', async route => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.route('/api/admin/mcp-servers', async route => {
      await route.fulfill({ json: { data: [
        { id: 'server1', name: 'File System Server', description: 'Provides access to local file system' },
        { id: 'server2', name: 'Database Server', description: 'Provides access to SQL database' }
      ] } });
    });

    await page.route('/api/csrf-token', async route => {
      await route.fulfill({ json: { csrfToken: 'fake-token' } });
    });

    await page.route('/api/personas', async route => {
      await route.fulfill({ json: [] });
    });

    await page.route('/api/llm/profiles', async route => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });

    // Navigate to bot create page
    await page.goto('/admin/bots/create');

    // Wait for page load
    await expect(page.locator('text="Create New Bot"')).toBeVisible();
    await expect(page.locator('text="Tools & Capabilities"')).toBeVisible();

    // Wait for the servers to appear
    await expect(page.locator('text="File System Server"')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'bot-create-tools-with-servers.png', fullPage: true });
  });
});
