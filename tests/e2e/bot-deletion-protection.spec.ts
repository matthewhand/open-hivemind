import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupErrorCollection } from './test-utils';

test.describe('Bot Deletion Protection', () => {
  test.setTimeout(90000);

  test('Delete confirmation modal requires bot name input', async ({ page, request }) => {
    // We rely on ALLOW_LOCALHOST_ADMIN=true for auth bypass (no token required)
    const errors = setupErrorCollection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    // Create a temporary bot for deletion test
    const botName = `DeleteTestBot-${Date.now()}`;

    // Open Create Bot Modal
    await page.getByRole('button', { name: 'Create Bot' }).first().click();

    // Wizard Step 1: Basics
    // Fill Bot Name
    await page.getByPlaceholder('e.g. HelpBot').fill(botName);

    // Select Message Provider (Discord) - usually the 1st select
    const selects = page.locator('select');
    await selects.nth(0).selectOption('discord');

    // Select LLM Provider - select the first available profile (index 1, as index 0 is "System Default")
    // We assume there's at least one profile like "Demo OpenAI Profile" present in dev/test environment
    await selects.nth(1).selectOption({ index: 1 });

    // Click Next (Step 1 -> 2)
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Persona
    // Click Next (Step 2 -> 3)
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Guardrails
    // Click Next (Step 3 -> 4)
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 4: Review
    // Click Finish & Create
    await page.getByRole('button', { name: 'Finish & Create' }).click();

    // Verify bot is created and visible
    await expect(page.getByText(botName)).toBeVisible({ timeout: 15000 });

    // Find the bot row
    const botRow = page.locator('.group', { hasText: botName }).first();

    // Refresh if not visible (sometimes list update lags)
    if (!await botRow.isVisible()) {
        await page.getByRole('button', { name: 'Refresh' }).click();
        await page.waitForTimeout(1000);
    }

    await expect(botRow).toBeVisible();

    // Click Settings Button
    // The settings button has title "Bot Settings"
    await botRow.getByTitle('Bot Settings').click();

    // Verify Settings Modal is open
    const settingsModal = page.locator('dialog.modal-open');
    await expect(settingsModal).toBeVisible();
    await expect(settingsModal).toContainText(botName);

    // Click Delete in Settings Modal (labeled "Delete Bot")
    await settingsModal.getByRole('button', { name: 'Delete Bot' }).click();

    // Verify Delete Confirmation Modal is open
    // Wait for the specific delete confirmation text to be visible
    await expect(page.getByText(`Are you sure you want to delete ${botName}?`)).toBeVisible();

    const deleteModal = page.locator('div.modal-box').filter({ hasText: `Are you sure you want to delete ${botName}?` });

    // Expect Input Field
    const confirmationInput = deleteModal.locator('input[placeholder="Type bot name to confirm"]');
    await expect(confirmationInput).toBeVisible();

    // Delete button
    const deleteBtn = deleteModal.getByRole('button', { name: 'Delete', exact: true });

    // Initial State: Delete button disabled
    await expect(deleteBtn).toBeDisabled();

    // Type wrong name
    await confirmationInput.fill('Wrong Name');
    await expect(deleteBtn).toBeDisabled();

    // Type correct name
    await confirmationInput.fill(botName);
    await expect(deleteBtn).toBeEnabled();

    // Click Delete
    await deleteBtn.click();

    // Verify Bot is gone
    await expect(page.getByText(botName)).not.toBeVisible();

    await assertNoErrors(errors, 'Bot Deletion Protection');
  });
});
