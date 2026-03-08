import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Letta Provider E2E Tests', () => {
  test('configure Letta provider with agent lookup', async ({ page }) => {
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

    // Mock empty LLM providers list initially
    let providers: any[] = [];
    await page.route('/api/admin/llm-providers', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(providers),
        });
      } else if (route.request().method() === 'POST') {
        // Capture the created provider
        const body = await route.request().postDataJSON();
        const newProvider = {
          id: 'letta-new',
          ...body,
          createdAt: new Date().toISOString(),
        };
        providers = [newProvider];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newProvider),
        });
      } else {
        await route.continue();
      }
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

    // Wait for provider type selection modal
    await expect(page.locator('.modal-box, [role="dialog"]')).toBeVisible();

    // Select Letta provider
    await page.click('text=Letta (MemGPT)');

    // Wait for the configuration form
    await expect(page.locator('text=Configure Letta (MemGPT)')).toBeVisible();

    // Fill in the form
    await page.fill('input[name="apiUrl"]', 'https://api.letta.com/v1');
    await page.fill('input[name="apiKey"]', 'sk-let-test-api-key');

    // Click the lookup button to fetch agents
    const lookupButton = page.getByRole('button', { name: /🔍 Lookup Agent/i });
    await expect(lookupButton).toBeVisible();
    await lookupButton.click();

    // Wait for the agent ID to be populated from the lookup
    await expect(page.locator('input[name="agentId"]')).toHaveValue('agent-e2fa86a3-cea2-4645-acd7-d12f0dc2efd5');

    // Fill in timeout
    await page.fill('input[name="timeout"]', '30000');

    // Save the provider
    await page.getByRole('button', { name: /Save|Create/i }).click();

    // Wait for the modal to close
    await expect(page.locator('.modal-box, [role="dialog"]')).not.toBeVisible();

    // Verify the provider was created and appears in the list
    await expect(page.locator('text=Letta Test')).toBeVisible();

    // Assert no errors were captured
    if (errors.length > 0) {
      throw new Error(`Test failed with ${errors.length} error(s):\n${errors.join('\n')}`);
    }
  });

  test('Letta provider form validation', async ({ page }) => {
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

    // Mock provider types
    await page.route('/api/admin/provider-types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
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

    // Wait for provider type selection modal
    await expect(page.locator('.modal-box, [role="dialog"]')).toBeVisible();

    // Select Letta provider
    await page.click('text=Letta (MemGPT)');

    // Wait for the configuration form
    await expect(page.locator('text=Configure Letta (MemGPT)')).toBeVisible();

    // Try to save without filling required fields
    await page.getByRole('button', { name: /Save|Create/i }).click();

    // Verify validation errors appear
    await expect(page.locator('text=Required').first()).toBeVisible();

    // Assert no errors were captured
    if (errors.length > 0) {
      throw new Error(`Test failed with ${errors.length} error(s):\n${errors.join('\n')}`);
    }
  });
});
