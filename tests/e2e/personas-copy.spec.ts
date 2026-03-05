import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Copy Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('can copy system prompt to clipboard', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [],
          warnings: [],
          legacyMode: false,
          environment: 'test',
        }),
      });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-persona-1',
            name: 'Test Copy Persona',
            description: 'A persona for testing copy',
            category: 'general',
            systemPrompt: 'This is the unique system prompt to copy.',
            traits: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock other potential background requests to keep console clean
    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, body: '{}' });
    });
    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) });
    });
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ defaultConfigured: true }) });
    });

    // Navigate to personas page
    await page.goto('/admin/personas');

    // Wait for the persona card to appear
    const card = page.locator('[data-testid="persona-card"]').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Test Copy Persona');

    // Grant clipboard permissions (needed for writeText in some environments, though often allowed by default in test runners)
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Locate the copy button
    const copyButton = card.locator('button[title="Copy System Prompt"]');
    await expect(copyButton).toBeVisible();

    // Click it
    await copyButton.click();

    // Assert Success Toast
    // Toast structure: .alert-success containing "Copied!"
    const toast = page.locator('.alert-success').filter({ hasText: 'Copied!' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('System prompt copied to clipboard');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'docs/screenshots/verification-personas-copy.png',
      fullPage: true,
    });
  });
});
