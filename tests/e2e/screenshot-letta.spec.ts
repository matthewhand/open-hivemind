import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Letta Provider Documentation Screenshots', () => {
  test('capture Letta provider configuration screenshots', async ({ page }) => {
    // Setup authentication and error detection
    const errors = await setupTestWithErrorDetection(page);

    // Mock authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock health and status endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
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
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: { _userSettings: { values: {} } } })
    );

    // Mock LLM providers with a Letta provider
    await page.route('/api/admin/llm-providers', async (route) => {
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
    await page.route('/api/letta/agents', async (route) => {
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

    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to LLM Providers page
    await navigateAndWaitReady(page, '/admin/providers/llm');

    // Wait for the page to load with the Letta provider
    await expect(page.locator('text=Letta Companion Agent').first()).toBeVisible();

    // Screenshot: LLM Providers list with Letta
    await page.screenshot({
      path: 'docs/screenshots/letta-provider-list.png',
      fullPage: true,
    });

    // Click on the Letta provider to edit
    await page.click('text=Letta Companion Agent');

    // Wait for the edit modal
    await expect(page.locator('text=Configure Letta (MemGPT)')).toBeVisible();

    // Screenshot: Letta provider configuration form
    await page.screenshot({
      path: 'docs/screenshots/letta-provider-config.png',
    });

    // Click the lookup button to demonstrate the feature
    const lookupButton = page.getByRole('button', { name: /🔍 Lookup Agent/i });
    if (await lookupButton.isVisible().catch(() => false)) {
      await lookupButton.click();

      // Wait for the agent ID to be populated
      await expect(page.locator('input[name="agentId"]')).toHaveValue('agent-e2fa86a3-cea2-4645-acd7-d12f0dc2efd5');

      // Screenshot: Agent lookup in action
      await page.screenshot({
        path: 'docs/screenshots/letta-provider-lookup.png',
      });
    }

    // Assert no errors were captured
    if (errors.length > 0) {
      throw new Error(`Screenshot test failed with ${errors.length} error(s):\n${errors.join('\n')}`);
    }
  });

  test('capture Letta provider creation flow', async ({ page }) => {
    // Setup authentication and error detection
    const errors = await setupTestWithErrorDetection(page);

    // Mock authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock health and status endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
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
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: { _userSettings: { values: {} } } })
    );

    // Mock empty LLM providers list
    await page.route('/api/admin/llm-providers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock Letta agents endpoint
    await page.route('/api/letta/agents', async (route) => {
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
    await page.route('/api/admin/provider-types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai', name: 'OpenAI', category: 'llm' },
          { id: 'letta', name: 'Letta (MemGPT)', category: 'llm' },
        ]),
      });
    });

    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to LLM Providers page
    await navigateAndWaitReady(page, '/admin/providers/llm');

    // Click "Add Provider" button
    await page.getByRole('button', { name: /Add Provider/i }).click();

    // Wait for provider type selection
    await expect(page.locator('.modal-box, [role="dialog"]')).toBeVisible();

    // Screenshot: Provider type selection with Letta visible
    await page.screenshot({
      path: 'docs/screenshots/letta-provider-selection.png',
    });

    // Select Letta provider
    await page.click('text=Letta (MemGPT)');

    // Wait for the configuration form
    await expect(page.locator('text=Configure Letta (MemGPT)')).toBeVisible();

    // Screenshot: Empty Letta configuration form
    await page.screenshot({
      path: 'docs/screenshots/letta-provider-create.png',
    });

    // Fill in the form
    await page.fill('input[name="apiUrl"]', 'https://api.letta.com/v1');
    await page.fill('input[name="apiKey"]', 'sk-let-NzU1OWUwYWUtOTE4ZS00ZjZkLWJkMmMtMGQwYTg4YTg5NzQ2');

    // Screenshot: Form with credentials filled
    await page.screenshot({
      path: 'docs/screenshots/letta-provider-filled.png',
    });

    // Assert no errors were captured
    if (errors.length > 0) {
      throw new Error(`Screenshot test failed with ${errors.length} error(s):\n${errors.join('\n')}`);
    }
  });
});