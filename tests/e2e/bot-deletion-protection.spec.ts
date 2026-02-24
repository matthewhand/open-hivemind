import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bot Deletion Protection', () => {
  test.setTimeout(45000);

  test('requires bot name confirmation to delete', async ({ page }) => {
    // Setup API mocks
    const botId = 'deletion-test-bot';
    const botName = 'Deletion Test Bot';

    // Mock CSRF token
    await page.route('/api/csrf-token', async route => route.fulfill({ json: { token: 'mock-csrf' } }));

    await page.route('/api/config', async route => {
      const json = {
        bots: [
          {
            id: botId,
            name: botName,
            description: 'Test Bot',
            messageProvider: 'discord',
            llmProvider: 'openai',
            status: 'active',
            connected: true,
            messageCount: 100,
            errorCount: 0,
            config: {
                discord: { token: '***' },
                llm: { model: 'gpt-4' }
            }
          }
        ],
        warnings: [],
        legacyMode: false,
        environment: 'test'
      };
      await route.fulfill({ json });
    });

    // Mock other endpoints
    await page.route('/api/config/global', async route => route.fulfill({ json: {} }));
    await page.route('/api/personas', async route => route.fulfill({ json: [] }));
    await page.route('/api/config/llm-profiles', async route => route.fulfill({ json: { profiles: { llm: [] } } }));
    await page.route('/api/config/llm-status', async route => route.fulfill({ json: { defaultConfigured: true, providers: [] } }));
    await page.route('/api/admin/guard-profiles', async route => route.fulfill({ json: { data: [] } }));

    // Mock activity/history
    await page.route(`/api/bots/${botId}/activity*`, async route => route.fulfill({ json: { data: { activity: [] } } }));
    await page.route(`/api/bots/${botId}/history*`, async route => route.fulfill({ json: { data: { history: [] } } }));

    // Mock Delete endpoint
    await page.route(`/api/bots/${botId}`, async route => {
      console.log(`Mock hit: ${route.request().method()} ${route.request().url()}`);
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ json: { success: true, message: 'Bot deleted' } });
      } else {
        await route.continue();
      }
    });

    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for bot to appear
    await expect(page.locator(`text=${botName}`)).toBeVisible();

    // 2. Open Settings
    const botRow = page.locator('.bg-base-100.border.rounded-xl', { hasText: botName });
    await botRow.locator('button[title="Bot Settings"]').click();

    // 3. Click Delete in Settings Modal
    const settingsModal = page.locator('.modal-box').filter({ hasText: botName });
    await settingsModal.locator('button:has-text("Delete Bot")').click();

    // 4. Verify Confirmation Modal
    const deleteModal = page.locator('.modal-box').filter({ hasText: 'Delete Bot' }).last();
    await expect(deleteModal).toBeVisible();

    const deleteBtn = deleteModal.locator('button.btn-error');
    const confirmationInput = deleteModal.locator('input[placeholder="Type bot name to confirm"]');
    await expect(confirmationInput).toBeVisible();

    // 5. Verify logic
    await expect(deleteBtn).toBeDisabled();
    await confirmationInput.fill('Wrong Name');
    await expect(deleteBtn).toBeDisabled();

    await confirmationInput.fill(botName);
    await expect(deleteBtn).toBeEnabled();

    // 7. Delete
    await deleteBtn.click();

    // 8. Verify modal closes
    await expect(deleteModal).not.toBeVisible();

    await assertNoErrors(errors, 'Bot deletion protection');
  });
});
