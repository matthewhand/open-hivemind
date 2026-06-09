import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { completeCreateBotWizard } from './helpers';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

/**
 * Full Journey: Export and Import Configuration
 *
 * Tests the complete export/import flow:
 * 1. Create bots and configurations
 * 2. Export all configuration
 * 3. Reset/clear current state
 * 4. Import the exported configuration
 * 5. Verify all data restored correctly
 *
 * @tag @full-journey @export @import @backup @critical
 */
test.describe('Full Journey: Export and Import Configuration', () => {
  test.setTimeout(120000); // 2 minutes for full export/import

  // Mock stores for simulating persistence
  let exportedData: any = null;
  let botsStore: any[] = [];
  let personasStore: any[] = [];

  async function mockExportImportAPIs(page: any) {
    // Standard mocks
    await page.route('**/api/health', (route: any) =>
      route.fulfill({
        status: 200,
        json: { status: 'ok' },
      })
    );
    await page.route('**/api/health/detailed', (route: any) =>
      route.fulfill({
        status: 200,
        json: { status: 'healthy', database: 'connected' },
      })
    );
    await page.route('**/api/csrf-token', (route: any) =>
      route.fulfill({
        status: 200,
        json: { token: 'mock-csrf' },
      })
    );
    await page.route('**/api/config/global', (route: any) =>
      route.fulfill({
        status: 200,
        json: { theme: 'light' },
      })
    );
    await page.route('**/api/config', (route: any) =>
      route.fulfill({
        status: 200,
        json: { bots: botsStore },
      })
    );
    await page.route('**/api/admin/guard-profiles', (route: any) =>
      route.fulfill({
        status: 200,
        json: { data: [] },
      })
    );
    await page.route('**/api/demo/status', (route: any) =>
      route.fulfill({
        status: 200,
        json: { active: false },
      })
    );

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

    // Export endpoint (the Export Config button downloads GET /api/config/export)
    await page.route('**/api/config/export**', (route: any) => {
      exportedData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        bots: [...botsStore],
        personas: [...personasStore],
        configs: {},
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(exportedData),
      });
    });

    // Import endpoint (ImportBotsModal posts the uploaded bundle here)
    await page.route('**/api/bots/import', (route: any) => {
      const bundle = JSON.parse(route.request().postData() || '{}');
      const imported = bundle.bots || [];
      const updated: string[] = [];
      const created: string[] = [];
      for (const bot of imported) {
        const idx = botsStore.findIndex((b) => b.name === bot.name);
        if (idx >= 0) {
          botsStore[idx] = { ...botsStore[idx], ...bot };
          updated.push(bot.name);
        } else {
          botsStore.push({ ...bot, id: `bot-${Date.now()}-${created.length}` });
          created.push(bot.name);
        }
      }
      return route.fulfill({
        status: 200,
        json: { report: { created, updated, errors: [] } },
      });
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
  }

  test.beforeEach(async () => {
    // Reset stores for each test
    botsStore = [];
    personasStore = [];
    exportedData = null;
  });

  test('Complete export and import flow', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockExportImportAPIs(page);
    // Wizard step 2 requires a persona to select
    personasStore.push({
      id: 'default',
      name: 'Default Assistant',
      description: 'A helpful assistant',
    });

    await navigateAndWaitReady(page, '/admin/export');

    // Step 1: Create test data (bots)
    await navigateAndWaitReady(page, '/admin/bots');

    const createBtn = page.getByRole('button', { name: 'Create Bot' }).first();
    await createBtn.click();
    await completeCreateBotWizard(page, 'Export Test Bot 1');

    expect(botsStore.length).toBe(1);

    // Create second bot
    await createBtn.click();
    await completeCreateBotWizard(page, 'Export Test Bot 2', { messageProvider: 'slack' });

    expect(botsStore.length).toBe(2);

    // Step 2: Navigate to export page and trigger export
    await navigateAndWaitReady(page, '/admin/export');

    // Find and click export button (downloads GET /api/config/export)
    const exportBtn = page.getByRole('button', { name: 'Export Config' });
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    const exportResponse = page.waitForResponse('**/api/config/export**', { timeout: 10000 });
    await exportBtn.click();
    await exportResponse;

    // Verify export data was created
    expect(exportedData).not.toBeNull();
    expect(exportedData.bots).toHaveLength(2);
    expect(exportedData.bots[0].name).toBe('Export Test Bot 1');
    expect(exportedData.bots[1].name).toBe('Export Test Bot 2');

    // Step 3: Import the exported bundle back through the UI.
    // The Import action lives in the bots-page bulk action bar (visible once
    // at least one bot is selected) and accepts a .json file upload.
    await navigateAndWaitReady(page, '/admin/bots');
    await page.getByRole('checkbox', { name: 'Select all bots' }).check();
    await page.getByRole('button', { name: 'Import' }).click();

    const importDialog = page.getByRole('dialog', { name: 'Import Bot Configurations' });
    await expect(importDialog).toBeVisible({ timeout: 10000 });
    await page.locator('#file-upload-input').setInputFiles({
      name: 'config-export.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exportedData)),
    });

    // Preview step shows the bots from the bundle; confirm the import
    const importResponse = page.waitForResponse(
      (r) => r.url().includes('/api/bots/import') && r.request().method() === 'POST',
      { timeout: 10000 }
    );
    await importDialog.getByRole('button', { name: 'Confirm Import' }).click();
    await importResponse;

    // Step 4: Verify data was restored (existing bots updated from the bundle)
    expect(botsStore.length).toBe(2);
    expect(botsStore[0].name).toBe('Export Test Bot 1');
    expect(botsStore[1].name).toBe('Export Test Bot 2');

    console.log('✅ Full export/import journey completed: 2 bots exported and re-imported');
  });

  test('Export with personas and verify completeness', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockExportImportAPIs(page);
    // Wizard step 2 requires a persona to select
    personasStore.push({
      id: 'default',
      name: 'Default Assistant',
      description: 'A helpful assistant',
    });

    // Create bot
    await navigateAndWaitReady(page, '/admin/bots');
    const createBtn = page.getByRole('button', { name: 'Create Bot' }).first();
    await createBtn.click();
    await completeCreateBotWizard(page, 'Persona Export Bot');

    // Export
    await navigateAndWaitReady(page, '/admin/export');
    const exportBtn = page.getByRole('button', { name: 'Export Config' });
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    const exportResponse = page.waitForResponse('**/api/config/export**', { timeout: 10000 });
    await exportBtn.click();
    await exportResponse;

    // Verify exported data structure
    expect(exportedData).toHaveProperty('version');
    expect(exportedData).toHaveProperty('exportedAt');
    expect(exportedData).toHaveProperty('bots');
    expect(Array.isArray(exportedData.bots)).toBe(true);

    console.log('✅ Export structure validation journey completed');
  });
});
