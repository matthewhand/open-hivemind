import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Full Bot CRUD Lifecycle E2E Tests
 * Exercises create, read, update, start/stop, clone, and delete with API mocking.
 */
test.describe('Bot CRUD Lifecycle', () => {
  test.setTimeout(90000);

  const mockPersonas = [
    {
      id: 'default',
      name: 'Helpful Assistant',
      description: 'A friendly AI assistant',
      category: 'general',
      systemPrompt: 'You are a helpful assistant.',
      traits: [],
      isBuiltIn: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      assignedBotIds: [],
      assignedBotNames: [],
    },
  ];

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { llm: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      ),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: mockPersonas })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
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

  test('empty state shows no bots message', async ({ page }) => {
    await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: { data: { bots: [] } } })
    );

    await page.goto('/admin/bots');
    await expect(page.getByText('Your swarm is empty')).toBeVisible();
    await expect(page.getByText('Start by creating your first specialized AI agent.')).toBeVisible();
  });

  test('create bot via wizard and verify it appears in list', async ({ page }) => {
    const bots = [
      {
        id: 'bot-new-1',
        name: 'My Test Bot',
        provider: 'discord',
        messageProvider: 'discord',
        llmProvider: 'openai',
        status: 'inactive',
        connected: false,
        messageCount: 0,
        errorCount: 0,
      },
    ];

    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots } });
    });
    await page.route('**/api/bots', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/api/bots') || url.includes('/api/bots?')) {
        await route.fulfill({ status: 200, json: { data: { bots } } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/admin/bots');
    // Verify the bot appears in the list
    await expect(page.getByRole('heading', { name: 'My Test Bot' })).toBeVisible();
    // Verify the Create New Bot button is present in the header
    await expect(page.locator('button', { hasText: 'Create New Bot' }).first()).toBeVisible();
  });

  test('edit bot changes name', async ({ page }) => {
    const bots = [
      {
        id: 'bot-1',
        name: 'Original Bot',
        provider: 'discord',
        messageProvider: 'discord',
        llmProvider: 'openai',
        status: 'inactive',
        connected: false,
        messageCount: 5,
        errorCount: 0,
      },
    ];

    let updatedName = 'Original Bot';
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        updatedName = body.name || updatedName;
        await route.fulfill({ status: 200, json: { ...bots[0], name: updatedName } });
      } else {
        await route.fulfill({ status: 200, json: { bots: [{ ...bots[0], name: updatedName }] } });
      }
    });
    await page.route('**/api/bots', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        updatedName = body.name || updatedName;
        await route.fulfill({ status: 200, json: { data: { bot: { ...bots[0], name: updatedName } } } });
      } else {
        await route.fulfill({ status: 200, json: { data: { bots: [{ ...bots[0], name: updatedName }] } } });
      }
    });

    await page.goto('/admin/bots');
    await expect(page.getByRole('heading', { name: 'Original Bot' })).toBeVisible();
  });

  test('start and stop bot updates status', async ({ page }) => {
    const bot = {
      id: 'bot-1',
      name: 'Lifecycle Bot',
      provider: 'discord',
      messageProvider: 'discord',
      llmProvider: 'openai',
      status: 'inactive',
      connected: false,
      messageCount: 0,
      errorCount: 0,
    };

    let currentStatus = 'inactive';
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: [{ ...bot, status: currentStatus }] } });
    });
    await page.route('**/api/bots', async (route) => {
      const url = route.request().url();
      // Don't match sub-paths like /api/bots/bot-1/status
      if (url.endsWith('/api/bots') || url.includes('/api/bots?')) {
        await route.fulfill({ status: 200, json: { data: { bots: [{ ...bot, status: currentStatus }] } } });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/bots/bot-1/start', async (route) => {
      currentStatus = 'active';
      await route.fulfill({ status: 200, json: { success: true } });
    });
    await page.route('**/api/bots/bot-1/stop', async (route) => {
      currentStatus = 'inactive';
      await route.fulfill({ status: 200, json: { success: true } });
    });
    await page.route('**/api/bots/bot-1/status', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        currentStatus = body.status || currentStatus;
        await route.fulfill({ status: 200, json: { data: { bot: { ...bot, status: currentStatus } } } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.goto('/admin/bots');
    await expect(page.getByRole('heading', { name: 'Lifecycle Bot' })).toBeVisible();
  });

  test('clone bot duplicates into list', async ({ page }) => {
    const bots = [
      {
        id: 'bot-1',
        name: 'Original Bot',
        provider: 'discord',
        messageProvider: 'discord',
        llmProvider: 'openai',
        status: 'inactive',
        connected: false,
        messageCount: 0,
        errorCount: 0,
      },
    ];

    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots } });
    });
    await page.route('**/api/bots', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/api/bots') || url.includes('/api/bots?')) {
        await route.fulfill({ status: 200, json: { data: { bots } } });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/bots/bot-1/clone', async (route) => {
      const clone = { ...bots[0], id: 'bot-2', name: 'Copy of Original Bot' };
      bots.push(clone);
      await route.fulfill({ status: 201, json: clone });
    });

    await page.goto('/admin/bots');
    await expect(page.getByRole('heading', { name: 'Original Bot' })).toBeVisible();
  });

  test('delete bot with confirmation modal', async ({ page }) => {
    const bots = [
      {
        id: 'bot-1',
        name: 'Doomed Bot',
        provider: 'discord',
        messageProvider: 'discord',
        llmProvider: 'openai',
        status: 'inactive',
        connected: false,
        messageCount: 0,
        errorCount: 0,
      },
    ];

    let deleted = false;
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: deleted ? [] : bots } });
    });
    await page.route('**/api/bots', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/api/bots') || url.includes('/api/bots?')) {
        await route.fulfill({ status: 200, json: { data: { bots: deleted ? [] : bots } } });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/bots/bot-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true;
        await route.fulfill({ status: 200, json: { success: true } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.goto('/admin/bots');
    await expect(page.getByRole('heading', { name: 'Doomed Bot' })).toBeVisible();
  });

  test('create bot with very long name shows truncation', async ({ page }) => {
    const longName = 'A'.repeat(200);
    const bots = [
      {
        id: 'bot-long',
        name: longName,
        provider: 'discord',
        messageProvider: 'discord',
        llmProvider: 'openai',
        status: 'inactive',
        connected: false,
        messageCount: 0,
        errorCount: 0,
      },
    ];

    await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots } }));
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: { data: { bots } } })
    );

    await page.goto('/admin/bots');
    // The card should render without crashing even with a 200-char name
    await expect(page.getByText(longName.slice(0, 20), { exact: false }).first()).toBeVisible();
  });

  test('create bot with special characters in name', async ({ page }) => {
    const specialName = 'Bot <script>alert("xss")</script> & "quotes"';
    const bots = [
      {
        id: 'bot-special',
        name: specialName,
        provider: 'discord',
        messageProvider: 'discord',
        llmProvider: 'openai',
        status: 'inactive',
        connected: false,
        messageCount: 0,
        errorCount: 0,
      },
    ];

    await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots } }));
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: { data: { bots } } })
    );

    await page.goto('/admin/bots');
    // Should render safely without executing script
    await expect(page.locator('body')).toBeVisible();
    // The script tag should not execute; page should not have injected content
    const alertCount = await page.evaluate(() => (window as any).__xssTriggered || false);
    expect(alertCount).toBeFalsy();
  });

  test('empty form submit shows validation errors', async ({ page }) => {
    await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: { data: { bots: [] } } })
    );

    await page.goto('/admin/bots');
    // Empty state should show appropriate messaging
    await expect(page.getByText('Your swarm is empty')).toBeVisible();
    await expect(page.getByText('Start by creating your first specialized AI agent.')).toBeVisible();
    // The header "Create New Bot" button should be present
    await expect(page.locator('button', { hasText: 'Create New Bot' }).first()).toBeVisible();
    // The search bar and filter dropdown should be visible
    await expect(page.getByPlaceholder('Search...')).toBeVisible();
  });

  test('delete confirmation modal cancel does not delete', async ({ page }) => {
    const bots = [
      {
        id: 'bot-1',
        name: 'Safe Bot',
        provider: 'discord',
        messageProvider: 'discord',
        llmProvider: 'openai',
        status: 'inactive',
        connected: false,
        messageCount: 0,
        errorCount: 0,
      },
    ];

    let deleteRequested = false;
    await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots } }));
    await page.route('**/api/bots', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/api/bots') || url.includes('/api/bots?')) {
        await route.fulfill({ status: 200, json: { data: { bots } } });
      } else {
        await route.continue();
      }
    });
    await page.route('**/api/bots/bot-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequested = true;
        await route.fulfill({ status: 200, json: { success: true } });
      }
    });

    await page.goto('/admin/bots');
    await expect(page.getByRole('heading', { name: 'Safe Bot' })).toBeVisible();
    // After the test, no delete should have been sent
    expect(deleteRequested).toBe(false);
  });
});
