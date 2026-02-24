import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('MCP Servers Search and Filter', () => {
  test.setTimeout(90000);

  const mockServers = {
    data: {
      servers: [
        {
          name: 'Github Tools',
          url: 'http://localhost:3000/github',
          connected: true,
          description: 'Tools for GitHub',
          tools: ['create-issue', 'list-prs']
        },
        {
          name: 'Weather API',
          url: 'http://localhost:3000/weather',
          connected: false,
          description: 'Get weather data',
          tools: ['get-forecast']
        },
        {
          name: 'Slack Bot',
          url: 'http://localhost:3000/slack',
          connected: true,
          description: 'Slack integration',
          tools: ['send-message']
        }
      ],
      configurations: []
    }
  };

  test.beforeEach(async ({ page }) => {
    // Mock the API response
    await page.route('*/**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockServers)
      });
    });

    // Mock other endpoints
    await page.route('*/**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ defaultConfigured: true }) });
    });
    await page.route('*/**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'healthy' }) });
    });
  });

  test('can search servers by name', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/mcp/servers');
    await page.waitForSelector('text=Github Tools');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Weather');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    await expect(page.locator('text=Weather API')).toBeVisible();
    await expect(page.locator('text=Github Tools')).not.toBeVisible();
    await expect(page.locator('text=Slack Bot')).not.toBeVisible();

    await assertNoErrors(errors, 'MCP Server search by name');
  });

  test('can search servers by description', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/mcp/servers');
    await page.waitForSelector('text=Github Tools');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('GitHub');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Github Tools')).toBeVisible();
    await expect(page.locator('text=Weather API')).not.toBeVisible();

    await page.screenshot({ path: 'mcp-search-verification.png', fullPage: true });

    await assertNoErrors(errors, 'MCP Server search by description');
  });

  test('shows empty state when no matches found and allows clearing', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await page.goto('/admin/mcp/servers');
    await page.waitForSelector('text=Github Tools');

    const searchInput = page.locator('input[placeholder="Search servers..."]');
    await searchInput.fill('Zeta NonExistent');
    await page.waitForTimeout(500);

    // Matches the implementation text I plan to add
    await expect(page.locator('text=No servers found matching')).toBeVisible();

    // Clear search
    await page.click('button:has-text("Clear Search")');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Github Tools')).toBeVisible();
    await expect(page.locator('text=Weather API')).toBeVisible();
    await expect(page.locator('text=Slack Bot')).toBeVisible();

    await assertNoErrors(errors, 'MCP Server empty state');
  });
});
