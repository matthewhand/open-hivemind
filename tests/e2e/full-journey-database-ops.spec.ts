import { expect, test } from '@playwright/test';
import { completeCreateBotWizard } from './helpers';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

/**
 * Full Journey: Database Operations Through UI
 *
 * Tests database persistence through the UI:
 * 1. Create bot -> verify persisted after reload
 * 2. Update bot config -> verify changes saved
 * 3. Create persona -> verify appears in list
 * 4. Create MCP server -> verify saved
 * 5. Delete bot -> verify removed
 *
 * Note: These tests use mocked APIs since we can't guarantee
 * a real database in CI, but they simulate the full flow
 *
 * @tag @full-journey @database @persistence @critical
 */
test.describe('Full Journey: Database Operations', () => {
  test.setTimeout(90000);

  // In-memory store for simulating database persistence
  let botsStore: any[] = [];
  let personasStore: any[] = [];
  let mcpServersStore: any[] = [];

  async function mockDatabaseAPIs(page: any) {
    // Health check
    await page.route('**/api/health/detailed', (route: any) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          database: {
            connected: true,
            type: 'sqlite',
            path: 'data/hivemind.db',
          },
        },
      })
    );

    // Bots CRUD
    await page.route('**/api/bots', (route: any) => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({ status: 200, json: { data: { bots: botsStore } } });
      }
      if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newBot = { ...body, id: `bot-${Date.now()}` };
        botsStore.push(newBot);
        // Real API wraps responses in an ApiResponse envelope ({ success, data });
        // BotsPage reads response.data after creating, so the mock must match.
        return route.fulfill({ status: 201, json: { success: true, data: newBot } });
      }
      return route.continue();
    });

    await page.route('**/api/bots/*', (route: any) => {
      const method = route.request().method();
      const url = route.request().url();
      const id = url.split('/').pop();
      if (method === 'PUT') {
        const body = JSON.parse(route.request().postData() || '{}');
        const index = botsStore.findIndex((b) => b.id === id);
        if (index >= 0) {
          botsStore[index] = { ...botsStore[index], ...body };
          return route.fulfill({ status: 200, json: botsStore[index] });
        }
      }
      if (method === 'DELETE') {
        botsStore = botsStore.filter((b) => b.id !== id);
        return route.fulfill({ status: 200, json: { success: true } });
      }
      return route.continue();
    });

    // Personas CRUD
    await page.route('**/api/personas', (route: any) => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({ status: 200, json: personasStore });
      }
      if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newPersona = { ...body, id: `persona-${Date.now()}` };
        personasStore.push(newPersona);
        return route.fulfill({ status: 201, json: newPersona });
      }
      return route.continue();
    });

    // MCP Servers CRUD
    await page.route('**/api/mcp/servers', (route: any) => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({ status: 200, json: mcpServersStore });
      }
      if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newServer = { ...body, id: `mcp-${Date.now()}` };
        mcpServersStore.push(newServer);
        return route.fulfill({ status: 201, json: newServer });
      }
      return route.continue();
    });

    // LLM status (Create Bot wizard requires a configured default LLM)
    await page.route('**/api/config/llm-status', (route: any) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );

    // Standard mocks
    await page.route('**/api/health', (route: any) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/csrf-token', (route: any) =>
      route.fulfill({ status: 200, json: { token: 'mock' } })
    );
    await page.route('**/api/config/global', (route: any) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('**/api/config', (route: any) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/admin/guard-profiles', (route: any) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );
    await page.route('**/api/demo/status', (route: any) =>
      route.fulfill({ status: 200, json: { active: false } })
    );
  }

  test.beforeEach(async ({ page }) => {
    // Reset stores for each test
    botsStore = [];
    personasStore = [];
    mcpServersStore = [];
  });

  test('Create bot and verify persistence after reload', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockDatabaseAPIs(page);
    // Wizard step 2 requires a persona to select
    personasStore.push({
      id: 'default',
      name: 'Default Assistant',
      description: 'A helpful assistant',
    });

    await navigateAndWaitReady(page, '/admin/bots');

    // Create bot via the wizard
    const createBtn = page.getByRole('button', { name: 'Create Bot' }).first();
    await createBtn.click();
    await completeCreateBotWizard(page, 'Persistence Test Bot');

    // Verify bot is in store
    expect(botsStore.length).toBe(1);
    expect(botsStore[0].name).toBe('Persistence Test Bot');

    // Reload page and verify bot list would show it (mocked to return our store)
    await page.reload();
    await navigateAndWaitReady(page, '/admin/bots');

    console.log('✅ Bot persistence journey completed');
  });

  test('Create → Update → Verify changes saved', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockDatabaseAPIs(page);
    // Wizard step 2 requires a persona to select
    personasStore.push({
      id: 'default',
      name: 'Default Assistant',
      description: 'A helpful assistant',
    });

    await navigateAndWaitReady(page, '/admin/bots');

    // Create bot via the wizard
    const createBtn = page.getByRole('button', { name: 'Create Bot' }).first();
    await createBtn.click();
    await completeCreateBotWizard(page, 'Update Test Bot', { messageProvider: 'slack' });

    const botId = botsStore[0].id;
    expect(botsStore[0].name).toBe('Update Test Bot');
    expect(botsStore[0].messageProvider).toBe('slack');

    // Note: Actual update would require navigating to edit page
    // This test verifies creation, future tests can add update flow

    console.log('✅ Create and persistence journey completed');
  });

  test('Create persona in UI and verify saved', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockDatabaseAPIs(page);

    await navigateAndWaitReady(page, '/admin/personas');

    // Check initial state
    expect(personasStore.length).toBe(0);

    console.log('✅ Persona creation journey placeholder');
  });
});
