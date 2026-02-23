import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupTestWithErrorDetection,
} from './test-utils';

test.describe('MCP Server Connection', () => {
  test.setTimeout(60000);

  test('Test Connection button works correctly', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock the MCP servers list
    await page.route('**/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            servers: [],
            configurations: []
          }
        }),
      });
    });

    // Mock the Test Connection endpoint
    await page.route('**/api/admin/mcp-servers/test', async (route) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const request = route.request();
      const postData = request.postDataJSON();

      if (postData.serverUrl === 'mcp://valid-server') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully tested connection to MCP server'
          }),
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to connect to MCP server',
            message: 'Connection refused'
          }),
        });
      }
    });

    // Mock disconnect endpoint (called when editing if server exists, or just to be safe)
    await page.route('**/api/admin/mcp-servers/disconnect', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // Navigate to MCP Servers page
    await navigateAndWaitReady(page, '/admin/mcp/servers');

    // Click Add Server button
    await page.click('text=Add Server');

    // Verify modal is open
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Add MCP Server' })).toBeVisible();

    // Fill in the form
    await page.fill('input[type="text"][value=""]', 'Test Server'); // Name (first input usually)
    // Use more specific locators if possible, but DaisyUI forms can be tricky.
    // Based on the code:
    // Name is the first input
    // URL is the second input
    const inputs = page.locator('.modal input[type="text"]');
    await inputs.nth(0).fill('Test Server');
    await inputs.nth(1).fill('mcp://valid-server');

    // Click Test Connection
    const testButton = page.locator('button', { hasText: 'Test Connection' });
    await expect(testButton).toBeVisible();
    await testButton.click();

    // Verify loading state (might be too fast to catch without slowdown, but we added 500ms delay)
    // await expect(page.locator('.loading-spinner')).toBeVisible();

    // Verify success message
    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('.alert-success')).toContainText('Connection successful!');

    // Test failure case
    await inputs.nth(1).fill('mcp://invalid-server');
    await testButton.click();

    // Verify error message
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('Connection refused');

    // Filter out the expected 500 error
    const unexpectedErrors = errors.filter(err => !err.includes('500 (Internal Server Error)'));

    if (unexpectedErrors.length > 0) {
      throw new Error(`Test failed due to unexpected errors:\n${unexpectedErrors.join('\n')}`);
    }
  });
});
