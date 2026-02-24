import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Personas Copy Functionality', () => {
  test('copies system prompt to clipboard', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock API
    await page.route('**/api/config', async (route) => {
      // Need to distinguish between /api/config and /api/config/global if strictly matched
      if (route.request().url().endsWith('/api/config')) {
        await route.fulfill({ json: { bots: [] } });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        json: [{
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
        }]
      });
    });

    // Mock other endpoints to avoid errors
    await page.route('**/api/config/global', async route => route.fulfill({ json: {} }));
    await page.route('**/api/health/detailed', async route => route.fulfill({ json: { status: 'ok' } }));
    await page.route('**/api/config/llm-status', async route => route.fulfill({
      json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false }
    }));
    await page.route('**/api/admin/guard-profiles', async route => route.fulfill({ json: [] }));
    await page.route('**/api/demo/status', async route => route.fulfill({ json: { enabled: false } }));
    await page.route('**/api/csrf-token', async route => route.fulfill({ json: { token: 'mock-token' } }));

    // Navigate
    await page.goto('/admin/personas');

    // Locate the copy button
    const copyButton = page.locator('button[title="Copy System Prompt"]');
    await expect(copyButton).toBeVisible();

    // Click it
    await copyButton.click();

    // Assert toast
    const toast = page.locator('.alert-success');
    await expect(toast).toContainText('System prompt copied to clipboard');
    await expect(toast).toBeVisible();
  });
});
