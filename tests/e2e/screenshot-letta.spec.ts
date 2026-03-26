import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Letta Provider Documentation Screenshots', () => {
  test('capture Letta provider configuration screenshots', async ({ page }) => {
    // Setup authentication and error detection
    const errors = await setupTestWithErrorDetection(page);

    // Mock authentication
    await page.route('**/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    // Mock health and status endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          configured: true,
          providers: [
            {
              id: 'letta-test',
              name: 'Letta Companion Agent',
              type: 'letta',
            },
          ],
          botsMissingLlmProvider: [],
          hasMissing: false,
          libraryStatus: {},
        },
      })
    );
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: { _userSettings: { values: {} } } })
    );

    // Mock LLM providers with a Letta provider
    await page.route('**/api/admin/llm-providers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'letta-test',
            name: 'Letta Companion Agent',
            type: 'letta',
            config: {
              apiUrl: 'https://api.letta.com/v1',
              apiKey: 'sk-let-****',
              agentId: 'agent-e2fa86a3-cea2-4645-acd7-d12f0dc2efd5',
              timeout: 30000,
            },
            enabled: true,
            createdAt: '2026-03-07T19:00:00Z',
          },
        ]),
      });
    });

    // Mock Letta agents endpoint
    await page.route('**/api/letta/agents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'agent-e2fa86a3-cea2-4645-acd7-d12f0dc2efd5',
            name: 'companion-agent_copy',
            description: 'A companion agent with persistent memory',
            created_at: '2025-12-20T21:09:16.297925Z',
            updated_at: '2026-03-07T19:23:26.804714Z',
          },
        ]),
      });
    });

    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to LLM Providers page
    await navigateAndWaitReady(page, '/admin/providers/llm');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: /LLM Providers/i })).toBeVisible();

    // Screenshot: LLM Providers list
    await page.screenshot({
      path: 'docs/screenshots/letta-provider-list.png',
      fullPage: true,
    });

    // Try to find and click the Letta provider if it appears
    const lettaProvider = page.locator('text=Letta Companion Agent').first();
    if (await lettaProvider.isVisible().catch(() => false)) {
      await lettaProvider.click();

      const configureModal = page.locator('text=Configure Letta (MemGPT)').first();
      if (await configureModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.screenshot({
          path: 'docs/screenshots/letta-provider-config.png',
        });

        const lookupButton = page.getByRole('button', { name: /🔍 Lookup Agent/i });
        if (await lookupButton.isVisible().catch(() => false)) {
          await lookupButton.click();
          await expect(page.locator('input[name="agentId"]')).toHaveValue(
            'agent-e2fa86a3-cea2-4645-acd7-d12f0dc2efd5'
          );
          await page.screenshot({
            path: 'docs/screenshots/letta-provider-lookup.png',
          });
        }
      }
    }

    // Assert no errors were captured
    if (errors.length > 0) {
      throw new Error(
        `Screenshot test failed with ${errors.length} error(s):\n${errors.join('\n')}`
      );
    }
  });

  test('capture Letta provider creation flow', async ({ page }) => {
    // Setup authentication and error detection
    const errors = await setupTestWithErrorDetection(page);

    // Mock authentication
    await page.route('**/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    // Mock health and status endpoints
    await page.route('**/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          configured: true,
          providers: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
          libraryStatus: {},
        },
      })
    );
    await page.route('**/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: { _userSettings: { values: {} } } })
    );

    // Mock empty LLM providers list
    await page.route('**/api/admin/llm-providers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock Letta agents endpoint
    await page.route('**/api/letta/agents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'agent-e2fa86a3-cea2-4645-acd7-d12f0dc2efd5',
            name: 'companion-agent_copy',
            description: 'A companion agent with persistent memory',
            created_at: '2025-12-20T21:09:16.297925Z',
            updated_at: '2026-03-07T19:23:26.804714Z',
          },
        ]),
      });
    });

    // Mock provider types
    await page.route('**/api/admin/provider-types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai', name: 'OpenAI', category: 'llm' },
          { id: 'letta', name: 'Letta (MemGPT)', category: 'llm' },
        ]),
      });
    });

    await page.route('**/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('**/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to LLM Providers page
    await navigateAndWaitReady(page, '/admin/providers/llm');

    // Try to find "Add Provider" button (may not exist in redesigned UI)
    const addProviderBtn = page.getByRole('button', { name: /Add Provider/i });
    if (await addProviderBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addProviderBtn.click();
      await expect(page.locator('.modal-box, [role="dialog"]')).toBeVisible();

      await page.screenshot({
        path: 'docs/screenshots/letta-provider-selection.png',
      });

      await page.click('text=Letta (MemGPT)');
      await expect(page.locator('text=Configure Letta (MemGPT)')).toBeVisible();

      await page.screenshot({
        path: 'docs/screenshots/letta-provider-create.png',
      });

      await page.fill('input[name="apiUrl"]', 'https://api.letta.com/v1');
      await page.fill(
        'input[name="apiKey"]',
        'sk-let-NzU1OWUwYWUtOTE4ZS00ZjZkLWJkMmMtMGQwYTg4YTg5NzQ2'
      );

      await page.screenshot({
        path: 'docs/screenshots/letta-provider-filled.png',
      });
    } else {
      // Page has been redesigned - just screenshot what we see
      await page.screenshot({
        path: 'docs/screenshots/letta-provider-selection.png',
      });
    }

    // Assert no errors were captured
    if (errors.length > 0) {
      throw new Error(
        `Screenshot test failed with ${errors.length} error(s):\n${errors.join('\n')}`
      );
    }
  });
});
