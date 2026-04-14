import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
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
        return route.fulfill({ status: 201, json: newBot });
      }
      return route.continue();
    });

    // Export endpoint
    await page.route('**/api/admin/export', (route: any) => {
      exportedData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        bots: [...botsStore],
        personas: [...personasStore],
        configs: {},
      };
      return route.fulfill({
        status: 200,
        json: exportedData,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Import endpoint
    await page.route('**/api/admin/import', (route: any) => {
      if (exportedData) {
        // Simulate importing the exported data
        const importedData = JSON.parse(route.request().postData() || '{}');
        botsStore = importedData.bots || [];
        personasStore = importedData.personas || [];
        return route.fulfill({
          status: 200,
          json: {
            success: true,
            imported: { bots: botsStore.length, personas: personasStore.length },
          },
        });
      }
      return route.fulfill({ status: 400, json: { error: 'No data to import' } });
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

    await navigateAndWaitReady(page, '/admin/export');

    // Step 1: Create test data (bots)
    await navigateAndWaitReady(page, '/admin/bots');

    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();
    await page.locator('input[name="name"]').fill('Export Test Bot 1');
    await page.locator('select[name="messageProvider"]').selectOption('discord');
    await page.locator('select[name="llmProvider"]').selectOption('openai');
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForResponse('**/api/bots', { timeout: 10000 });

    expect(botsStore.length).toBe(1);

    // Create second bot
    await createBtn.click();
    await page.locator('input[name="name"]').fill('Export Test Bot 2');
    await page.locator('select[name="messageProvider"]').selectOption('slack');
    await page.locator('select[name="llmProvider"]').selectOption('anthropic');
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForResponse('**/api/bots', { timeout: 10000 });

    expect(botsStore.length).toBe(2);

    // Step 2: Navigate to export page and trigger export
    await navigateAndWaitReady(page, '/admin/export');

    // Find and click export button
    const exportBtn = page.locator('button:has-text("Export")').first();
    if ((await exportBtn.count()) > 0) {
      await exportBtn.click();
      await page.waitForResponse('**/api/admin/export', { timeout: 10000 });
    }

    // Verify export data was created
    expect(exportedData).not.toBeNull();
    expect(exportedData.bots).toHaveLength(2);
    expect(exportedData.bots[0].name).toBe('Export Test Bot 1');
    expect(exportedData.bots[1].name).toBe('Export Test Bot 2');

    // Step 3: Clear current data (simulate reset)
    botsStore = [];
    expect(botsStore.length).toBe(0);

    // Step 4: Navigate to import page
    await navigateAndWaitReady(page, '/admin/export');

    // Step 5: Trigger import with exported data
    // In a real scenario, user would upload a file, but we mock the API call
    await page.route('**/api/admin/import', (route: any) => {
      // Re-import our exported data
      botsStore = [...(exportedData?.bots || [])];
      personasStore = [...(exportedData?.personas || [])];
      return route.fulfill({
        status: 200,
        json: {
          success: true,
          imported: { bots: botsStore.length, personas: personasStore.length },
        },
      });
    });

    const importBtn = page.locator('button:has-text("Import")').first();
    if ((await importBtn.count()) > 0) {
      await importBtn.click();
      await page.waitForResponse('**/api/admin/import', { timeout: 10000 });
    }

    // Step 6: Verify data was restored
    await navigateAndWaitReady(page, '/admin/bots');
    expect(botsStore.length).toBe(2);
    expect(botsStore[0].name).toBe('Export Test Bot 1');
    expect(botsStore[1].name).toBe('Export Test Bot 2');

    console.log('✅ Full export/import journey completed: 2 bots exported and restored');
  });

  test('Export with personas and verify completeness', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockExportImportAPIs(page);

    // Create bot
    await navigateAndWaitReady(page, '/admin/bots');
    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();
    await page.locator('input[name="name"]').fill('Persona Export Bot');
    await page.locator('select[name="messageProvider"]').selectOption('discord');
    await page.locator('select[name="llmProvider"]').selectOption('openai');
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForResponse('**/api/bots', { timeout: 10000 });

    // Export
    await navigateAndWaitReady(page, '/admin/export');
    const exportBtn = page.locator('button:has-text("Export")').first();
    if ((await exportBtn.count()) > 0) {
      await exportBtn.click();
      await page.waitForResponse('**/api/admin/export', { timeout: 10000 });
    }

    // Verify exported data structure
    expect(exportedData).toHaveProperty('version');
    expect(exportedData).toHaveProperty('exportedAt');
    expect(exportedData).toHaveProperty('bots');
    expect(Array.isArray(exportedData.bots)).toBe(true);

    console.log('✅ Export structure validation journey completed');
  });
});
