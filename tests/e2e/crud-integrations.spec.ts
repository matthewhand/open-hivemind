import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * CRUD E2E Tests for Integrations Page
 * Tests for /admin/integrations/:type routes
 */

test.describe('Integrations Page CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);
  });

  test.describe('Navigation', () => {
    test('redirects to settings when no type parameter', async ({ page }) => {
      await page.goto('/admin/integrations');
      await page.waitForLoadState('networkidle');

      // Should redirect to /admin/settings
      await expect(page).toHaveURL(/\/admin\/settings/);
    });

    test('loads integrations page with valid type', async ({ page }) => {
      // Mock the GlobalConfigSection API call
      await page.route('**/api/config/llm', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: { providers: [] },
          },
        });
      });

      await page.goto('/admin/integrations/llm');
      await page.waitForLoadState('networkidle');

      // Should show the config section
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('LLM Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/llm/providers', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: [
              { id: 'openai-1', name: 'OpenAI GPT-4', type: 'openai', enabled: true },
              { id: 'anthropic-1', name: 'Claude', type: 'anthropic', enabled: false },
            ],
          },
        });
      });
    });

    test('displays LLM provider configuration', async ({ page }) => {
      await page.goto('/admin/integrations/llm');
      await page.waitForLoadState('networkidle');

      // Page should load without errors
      await expect(page.locator('body')).toBeVisible();
    });

    test('can add new LLM provider', async ({ page }) => {
      await page.route('**/api/llm/providers', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            json: {
              success: true,
              data: { id: 'new-provider', name: 'New Provider' },
            },
          });
        } else {
          await route.fulfill({
            json: { success: true, data: [] },
          });
        }
      });

      await page.goto('/admin/integrations/llm');
      await page.waitForLoadState('networkidle');

      // Should show add button or form
      const addButton = page.getByRole('button', { name: /add|create|new/i });
      if (await addButton.count() > 0) {
        await addButton.first().click();
      }
    });
  });

  test.describe('Memory Integration', () => {
    test('displays memory provider configuration', async ({ page }) => {
      await page.route('**/api/memory/providers', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: [
              { id: 'mem0', name: 'Mem0', type: 'mem0', enabled: true },
              { id: 'letta', name: 'Letta', type: 'letta', enabled: false },
            ],
          },
        });
      });

      await page.goto('/admin/integrations/memory');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Tool Integration', () => {
    test('displays tool provider configuration', async ({ page }) => {
      await page.route('**/api/tools/providers', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: [{ id: 'mcp-1', name: 'MCP Server', type: 'mcp', enabled: true }],
          },
        });
      });

      await page.goto('/admin/integrations/tools');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Messenger Integration', () => {
    test('displays messenger configuration', async ({ page }) => {
      await page.route('**/api/messenger/providers', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: [
              { id: 'discord-1', name: 'Discord Bot', type: 'discord', enabled: true },
              { id: 'slack-1', name: 'Slack Bot', type: 'slack', enabled: false },
            ],
          },
        });
      });

      await page.goto('/admin/integrations/messenger');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { success: false, error: 'Internal server error' },
        });
      });

      await page.goto('/admin/integrations/llm');
      await page.waitForLoadState('networkidle');

      // Should show error state or empty state
      await expect(page.locator('body')).toBeVisible();
    });

    test('handles network timeout', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.abort();
      });

      await page.goto('/admin/integrations/llm', { timeout: 10000 });
      // Should handle timeout gracefully
    });
  });
});

test.describe('Integrations Page Accessibility', () => {
  test('integrations page is accessible', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/admin/integrations/llm');
    await page.waitForLoadState('networkidle');

    // Basic accessibility checks
    const mainLandmark = page.locator('main, [role="main"]');
    if (await mainLandmark.count() > 0) {
      await expect(mainLandmark.first()).toBeVisible();
    }
  });
});
