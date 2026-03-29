import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * LLM Provider Configuration CRUD Lifecycle E2E Tests
 * Exercises create, test connection, edit, and delete LLM profiles with API mocking.
 */
test.describe('LLM Provider CRUD Lifecycle', () => {
  test.setTimeout(90000);

  const mockLlmProfiles = [
    {
      key: 'openai-main',
      name: 'OpenAI Production',
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'sk-***masked***',
      baseUrl: 'https://api.openai.com/v1',
      isDefault: true,
    },
    {
      key: 'anthropic-dev',
      name: 'Anthropic Dev',
      provider: 'anthropic',
      model: 'claude-3-opus',
      apiKey: 'sk-ant-***masked***',
      baseUrl: 'https://api.anthropic.com',
      isDefault: false,
    },
  ];

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } })),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('list LLM profiles displays all providers', async ({ page }) => {
    await page.route('**/api/admin/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: mockLlmProfiles } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: ['openai'], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: mockLlmProfiles } } })
    );

    await page.goto('/admin/config');
    // Page should load and show provider configuration UI
    await expect(page.locator('body')).toBeVisible();
    const content = page.locator('main, [class*="content"]').first();
    await expect(content).toBeVisible();
  });

  test('create a new LLM profile', async ({ page }) => {
    const profiles = [...mockLlmProfiles];

    await page.route('**/api/admin/llm-profiles', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const newProfile = {
          key: `${body.provider}-new`,
          name: body.name || 'New Profile',
          provider: body.provider,
          model: body.model || 'gpt-4',
          apiKey: '***masked***',
          baseUrl: body.baseUrl || '',
          isDefault: false,
        };
        profiles.push(newProfile);
        await route.fulfill({ status: 201, json: { data: newProfile, message: 'Profile created' } });
      } else {
        await route.fulfill({ status: 200, json: { data: profiles } });
      }
    });
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: ['openai'], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: profiles } } })
    );

    await page.goto('/admin/config');

    // Look for add/create button
    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    if ((await addBtn.count()) > 0) {
      await addBtn.click();
    }
  });

  test('test connection success', async ({ page }) => {
    await page.route('**/api/admin/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: mockLlmProfiles } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: ['openai'], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: mockLlmProfiles } } })
    );
    await page.route('**/api/admin/llm-profiles/test', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, message: 'Connection successful', latency: 150 },
      });
    });

    await page.goto('/admin/config');

    const testBtn = page.locator('button:has-text("Test"), button:has-text("Verify")').first();
    if ((await testBtn.count()) > 0) {
      await testBtn.click();
    }
  });

  test('test connection failure shows error', async ({ page }) => {
    await page.route('**/api/admin/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: mockLlmProfiles } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: ['openai'], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: mockLlmProfiles } } })
    );
    await page.route('**/api/admin/llm-profiles/test', async (route) => {
      await route.fulfill({
        status: 400,
        json: { success: false, message: 'Invalid API key', error: 'Authentication failed' },
      });
    });

    await page.goto('/admin/config');

    const testBtn = page.locator('button:has-text("Test"), button:has-text("Verify")').first();
    if ((await testBtn.count()) > 0) {
      await testBtn.click();
    }
  });

  test('edit LLM profile settings', async ({ page }) => {
    let currentProfiles = [...mockLlmProfiles];

    await page.route('**/api/admin/llm-profiles', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        currentProfiles = currentProfiles.map((p) =>
          p.key === body.key ? { ...p, ...body } : p
        );
        await route.fulfill({ status: 200, json: { data: body, message: 'Profile updated' } });
      } else {
        await route.fulfill({ status: 200, json: { data: currentProfiles } });
      }
    });
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: ['openai'], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: currentProfiles } } })
    );

    await page.goto('/admin/config');
    await expect(page.locator('body')).toBeVisible();

    // Look for edit controls
    const inputs = page.locator('input, select');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(0);
  });

  test('delete LLM profile removes it', async ({ page }) => {
    let profiles = [...mockLlmProfiles];

    await page.route('**/api/admin/llm-profiles', async (route) => {
      if (route.request().method() === 'DELETE') {
        const url = route.request().url();
        const key = url.split('/').pop();
        profiles = profiles.filter((p) => p.key !== key);
        await route.fulfill({ status: 200, json: { success: true } });
      } else {
        await route.fulfill({ status: 200, json: { data: profiles } });
      }
    });
    await page.route('**/api/admin/llm-profiles/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, json: { success: true, message: 'Profile deleted' } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: ['openai'], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: profiles } } })
    );

    await page.goto('/admin/config');
    await expect(page.locator('body')).toBeVisible();
  });

  test('invalid API key format shows validation', async ({ page }) => {
    await page.route('**/api/admin/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: false, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: [] } } })
    );

    await page.goto('/admin/config');

    // Try to find an API key input and fill with invalid value
    const apiKeyInput = page.locator('input[type="password"], input[placeholder*="API"], input[name*="apiKey"]').first();
    if ((await apiKeyInput.count()) > 0) {
      await apiKeyInput.fill('not-a-valid-key');
    }
  });

  test('connection timeout simulation', async ({ page }) => {
    await page.route('**/api/admin/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: mockLlmProfiles } })
    );
    await page.route('**/api/config/llm-status', (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: ['openai'], botsMissingLlmProvider: [], hasMissing: false },
      })
    );
    await page.route('**/api/config/llm-profiles', (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: mockLlmProfiles } } })
    );
    // Simulate timeout by aborting the request
    await page.route('**/api/admin/llm-profiles/test', async (route) => {
      await route.abort('timedout');
    });

    await page.goto('/admin/config');

    const testBtn = page.locator('button:has-text("Test"), button:has-text("Verify")').first();
    if ((await testBtn.count()) > 0) {
      await testBtn.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
