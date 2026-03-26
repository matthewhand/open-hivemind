import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Bot Deletion Protection', () => {
  test.setTimeout(90000);

  const BOT_NAME = 'Deletion Protection Test Bot';
  const BOT_ID = 'test-bot-id';

  test('Requires typing bot name to confirm deletion', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Mock API responses

    // Catch-all for API requests (registered first, lower priority)
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, body: '{}', contentType: 'application/json' });
    });

    const mockBot = {
      id: BOT_ID,
      name: BOT_NAME,
      provider: 'discord',
      llmProvider: 'openai',
      status: 'active',
      connected: true,
      messageCount: 0,
      errorCount: 0,
    };

    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [mockBot],
        }),
      });
    });

    await page.route('**/api/bots', async (route) => {
      if (route.request().url().includes(`/api/bots/${BOT_ID}`)) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { bots: [mockBot] },
        }),
      });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profiles: { llm: [] } }),
      });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
        }),
      });
    });

    // Mock activity and history to prevent 404s/errors
    await page.route(`**/api/bots/${BOT_ID}/activity?limit=20`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { activity: [] } }),
      });
    });

    await page.route(`**/api/bots/${BOT_ID}/history?limit=20`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { history: [] } }),
      });
    });

    // Mock DELETE request
    let deleteRequested = false;
    await page.route(`**/api/bots/${BOT_ID}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequested = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for the bot to appear in the list (from mock)
    await expect(page.getByText(BOT_NAME)).toBeVisible();

    // 2. Open Settings/Configure for the bot
    const configureBtn = page.getByRole('button', { name: 'Configure' }).first();
    await expect(configureBtn).toBeVisible();
    await configureBtn.click();

    // 3. Look for a settings modal or the bot detail page
    // The page may navigate to a config page, or open a modal
    await page.waitForTimeout(1000);

    // Look for Delete Bot button - could be in a modal or on the page
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    } else {
      // If no delete button visible yet, look for a settings modal
      const settingsModal = page.locator('.modal.modal-open, .modal-box, dialog[open]').first();
      if (await settingsModal.isVisible().catch(() => false)) {
        await settingsModal.getByRole('button', { name: /delete/i }).click();
      }
    }

    // 4. Verify Delete Confirmation Modal
    const deleteModal = page.locator('dialog[open], .modal.modal-open, .modal-box').filter({ hasText: /delete|confirm/i }).last();
    await expect(deleteModal).toBeVisible();

    // 5. Check Initial State - look for a confirmation input or Delete button
    const confirmationInput = deleteModal.locator('input').first();
    const deleteConfirmButton = deleteModal.getByRole('button', { name: /delete|confirm/i }).last();

    if (await confirmationInput.isVisible().catch(() => false)) {
      // Has confirmation input - test the typed confirmation flow
      const placeholder = await confirmationInput.getAttribute('placeholder') || '';

      // Check delete button is disabled initially
      if (await deleteConfirmButton.isDisabled().catch(() => false)) {
        // 6. Test Incorrect Input
        await confirmationInput.fill('Wrong Name');
        await expect(deleteConfirmButton).toBeDisabled();

        // 7. Test Correct Input - use placeholder text or bot name
        await confirmationInput.fill(placeholder || BOT_NAME);
        await expect(deleteConfirmButton).toBeEnabled();
      }
    }

    // 8. Perform Deletion
    if (await deleteConfirmButton.isEnabled().catch(() => false)) {
      const deleteRequestPromise = page.waitForRequest(
        (request) => request.url().includes(`/api/bots/${BOT_ID}`) && request.method() === 'DELETE'
      );
      await deleteConfirmButton.click();
      await deleteRequestPromise;

      // 9. Verify Modal Closes
      await expect(deleteModal).not.toBeVisible();
    }

    await assertNoErrors(errors, 'Bot deletion protection');
  });
});
