import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Personas Copy Functionality', () => {
  test('can copy system prompt to clipboard', async ({ page }) => {
    // Setup authentication and error detection
    const errors = await setupTestWithErrorDetection(page);

    // Mock API responses
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: [] }),
      });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-persona-copy',
            name: 'Test Copy Persona',
            description: 'A persona for testing copy',
            category: 'general',
            systemPrompt: 'This is the unique system prompt to copy.',
            assignedBotNames: [],
            assignedBotIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock other endpoints to prevent errors
    await page.route('**/api/config/global', async (route) => route.fulfill({ status: 200, body: '{}' }));
    await page.route('**/api/csrf-token', async (route) => route.fulfill({ status: 200, body: '{"token":"fake"}' }));
    await page.route('**/api/health/detailed', async (route) => route.fulfill({ status: 200, body: '{}' }));
    await page.route('**/api/config/llm-status', async (route) => route.fulfill({ status: 200, body: '{}' }));

    // Navigate to Personas page
    await navigateAndWaitReady(page, '/admin/personas');

    // Wait for the persona card to be visible
    const card = page.locator('[data-testid="persona-card"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Test Copy Persona');

    // Click the Copy System Prompt button
    const copyButton = card.locator('button[title="Copy System Prompt"]');
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // Verify the toast notification appears
    // The toast should contain "Copied!" or "System prompt copied to clipboard"
    const toast = page.locator('.alert-success');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Copied!');
    await expect(toast).toContainText('System prompt copied to clipboard');

    await page.screenshot({ path: 'verification-personas-copy.png', fullPage: true });

    await assertNoErrors(errors, 'Personas copy prompt');
  });
});
