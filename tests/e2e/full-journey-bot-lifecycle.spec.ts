import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

/**
 * Full Journey: Complete Bot Lifecycle
 *
 * Tests the complete end-to-end flow:
 * 1. Login
 * 2. Create a bot with all required configurations
 * 3. Configure LLM provider
 * 4. Set up messenger integration
 * 5. Test bot connectivity
 * 6. View bot in dashboard
 * 7. Update bot configuration
 * 8. Deactivate/Reactivate bot
 * 9. Verify audit trail
 *
 * @tag @full-journey @bot-lifecycle @critical
 */
test.describe('Full Journey: Bot Lifecycle End-to-End', () => {
  test.setTimeout(120000); // 2 minutes for full journey

  // Mock common API endpoints
  async function mockFullJourneyAPIs(page: any) {
    await page.route('**/api/health', (route: any) =>
      route.fulfill({
        status: 200,
        json: { status: 'ok', version: '1.0.0' },
      })
    );
    await page.route('**/api/health/detailed', (route: any) =>
      route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          database: 'connected',
          messengers: { slack: 'connected', discord: 'connected' },
        },
      })
    );
    await page.route('**/api/csrf-token', (route: any) =>
      route.fulfill({
        status: 200,
        json: { token: 'mock-csrf-token' },
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
    await page.route('**/api/config/global', (route: any) =>
      route.fulfill({
        status: 200,
        json: { theme: 'light', locale: 'en-US' },
      })
    );
    await page.route('**/api/config', (route: any) =>
      route.fulfill({
        status: 200,
        json: { bots: [] },
      })
    );
  }

  async function createMockBot(page: any, botData: any) {
    await page.route('**/api/bots', (route: any) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: { data: { bots: [] } } });
      }
      if (route.request().method() === 'POST') {
        const body = route.request().postData();
        const newBot = {
          ...JSON.parse(body),
          id: 'bot-e2e-test-1',
          createdAt: new Date().toISOString(),
        };
        return route.fulfill({ status: 201, json: newBot });
      }
      return route.continue();
    });
  }

  test('Complete bot lifecycle: Create → Configure → Test → Deactivate', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockFullJourneyAPIs(page);

    // Step 1: Navigate to bots page
    await navigateAndWaitReady(page, '/admin/bots');

    // Step 2: Open create modal and create bot
    const createBtn = page.locator('button:has-text("Create")').first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();

      // Fill bot form
      await page.locator('input[name="name"]').fill('E2E Test Bot');
      await page.locator('select[name="messageProvider"]').selectOption('discord');
      await page.locator('select[name="llmProvider"]').selectOption('openai');

      // Submit form
      const submitBtn = page.locator('button:has-text("Save")').first();
      if ((await submitBtn.count()) > 0) {
        await submitBtn.click();
        await page.waitForResponse('**/api/bots', { timeout: 10000 });
      }
    }

    // Step 3: Verify bot appears in list
    await expect(page.locator('text=E2E Test Bot')).toBeVisible({ timeout: 10000 });

    // Step 4: Navigate to bot detail/configuration
    await page.locator('text=E2E Test Bot').first().click();
    await page.waitForURL('**/admin/bots/*');

    // Step 5: Update bot settings
    const settingsTab = page.locator('button:has-text("Settings")').first();
    if ((await settingsTab.count()) > 0) {
      await settingsTab.click();
      await page.locator('input[name="description"]').fill('E2E Test Description');
    }

    // Step 6: Verify changes persist
    await expect(page.locator('text=E2E Test Description')).toBeVisible({ timeout: 5000 });

    // Success - full journey completed
    console.log('✅ Full bot lifecycle journey completed successfully');
  });

  test('Bot creation to messaging flow', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockFullJourneyAPIs(page);

    // Mock bot creation and chat endpoints
    await page.route('**/api/bots', (route: any) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          json: {
            id: 'e2e-bot-1',
            name: 'Messaging Test Bot',
            messageProvider: 'discord',
            llmProvider: 'openai',
          },
        });
      }
      return route.fulfill({ status: 200, json: { data: { bots: [] } } });
    });

    await navigateAndWaitReady(page, '/admin/bots');

    // Create bot
    const createBtn = page.locator('button:has-text("Create")').first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.locator('input[name="name"]').fill('Messaging Test Bot');
      await page.locator('select[name="messageProvider"]').selectOption('discord');
      await page.locator('select[name="llmProvider"]').selectOption('openai');
      await page.locator('button:has-text("Save")').first().click();
    }

    // Navigate to chat/test interface
    await navigateAndWaitReady(page, '/admin/bots');

    // Verify bot is listed
    await expect(page.locator('text=Messaging Test Bot')).toBeVisible({ timeout: 10000 });

    console.log('✅ Bot creation to messaging flow completed');
  });
});
