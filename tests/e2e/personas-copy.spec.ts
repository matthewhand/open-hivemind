import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Copy Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API responses
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bots: [], warnings: [], legacyMode: false, environment: 'test' }),
      });
    });

    // Handle generic personas route, but be specific enough to avoid intercepting other calls if any
    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-persona',
            name: 'Test Copy Persona',
            description: 'A persona for testing copy',
            category: 'general',
            systemPrompt: 'This is the system prompt to copy.',
            assignedBotNames: [],
            assignedBotIds: [],
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock other potential background requests to prevent errors
    await page.route('**/api/csrf-token', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-token' }) }));
    await page.route('**/api/health/detailed', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ status: 'healthy' }) }));
    await page.route('**/api/config/global', async (route) => route.fulfill({ status: 200, body: JSON.stringify({}) }));
    await page.route('**/api/config/llm-status', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false }) }));
    await page.route('**/api/admin/guard-profiles', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/api/demo/status', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ enabled: false }) }));
    await page.route('**/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, body: JSON.stringify([]) }));
  });

  test('can copy system prompt from persona card', async ({ page }) => {
    // Grant clipboard permissions just in case, though we primarily rely on Toast verification
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/admin/personas');

    // Wait for the persona card to be visible
    const card = page.locator('[data-testid="persona-card"]').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Test Copy Persona');

    // Locate the copy button
    const copyButton = card.locator('button[title="Copy System Prompt"]');
    await expect(copyButton).toBeVisible();

    // Click the copy button
    await copyButton.click();

    // Check for Toast notification
    // DaisyUI ToastNotification renders alerts inside a container
    const toast = page.locator('.alert-success').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('System prompt copied to clipboard');

    // Take screenshot for verification
    await page.screenshot({ path: 'verification-personas-copy.png', fullPage: true });
  });
});
