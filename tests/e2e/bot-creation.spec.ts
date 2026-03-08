import { expect, Page, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  SELECTORS,
  setupTestWithErrorDetection,
} from './test-utils';

/**
 * Bot Creation Validation E2E Tests
 * Tests all permutations of the Create Bot form validation.
 * Tests FAIL on any console errors.
 */

// Helper to get modal context
const getModalDialog = (page: Page) => {
  return page.locator('.modal-box, [role="dialog"]').first();
};

// Helper to open the modal
async function openCreateBotModal(page: Page) {
  const createButton = page
    .locator('button')
    .filter({ hasText: /create.*bot|new.*bot/i })
    .first();
  await createButton.click();
  await page.waitForTimeout(1000);
  return getModalDialog(page);
}

test.describe('Bot Creation Form Validation', () => {
  test.setTimeout(90000);

<<<<<<< HEAD
=======
  test.beforeEach(async ({ page }) => {
    await page.route('/api/config', route => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/admin/llm-profiles', route => route.fulfill({
      status: 200,
      json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] }
    }));
    await page.route('/api/admin/guard-profiles', route => route.fulfill({
      status: 200,
      json: { data: [] }
    }));
    await page.route('/api/config/llm-status', route => route.fulfill({
      status: 200,
      json: { defaultConfigured: true }
    }));
  });

>>>>>>> origin/main
  test('Create Bot modal opens with all form fields', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);
    await expect(modal).toBeVisible();

    // Check for form fields
    await expect(modal.locator('input').first()).toBeVisible();
    await expect(modal.locator('select').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/create-bot-01-modal-open.png', fullPage: true });
    await assertNoErrors(errors, 'Create Bot modal open');
  });

  test('Submit button disabled when form is empty', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Find the submit button WITHIN the modal
    const submitButton = modal.locator('button').filter({ hasText: /create bot/i });

    // Should be disabled when form is empty
    await expect(submitButton).toBeDisabled();

    await page.screenshot({
      path: 'test-results/create-bot-02-disabled-empty.png',
      fullPage: true,
    });
    await assertNoErrors(errors, 'Submit button disabled');
  });

  test('Submit button disabled with only name filled', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Fill only name
    const nameInput = modal.locator('input').first();
    await nameInput.fill('Test Bot');
    await page.waitForTimeout(300);

    const submitButton = modal.locator('button').filter({ hasText: /create bot/i });
    await expect(submitButton).toBeDisabled();

    await page.screenshot({ path: 'test-results/create-bot-03-only-name.png', fullPage: true });
    await assertNoErrors(errors, 'Submit with only name');
  });

  test('Submit button disabled without message provider', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Fill name
    await modal.locator('input').first().fill('Test Bot');

<<<<<<< HEAD
    // Select only LLM provider
    const llmSelect = modal.locator('select').last();
    await llmSelect.selectOption('openai');
=======
    // Ensure message provider is empty
    const selects = modal.locator('select');
    const selectCount = await selects.count();
    if (selectCount >= 2) {
      await selects.nth(0).selectOption({ value: '' });
      // Skip selecting LLM provider for this specific test as it only needs message provider empty
    }
>>>>>>> origin/main
    await page.waitForTimeout(300);

    const submitButton = modal.locator('button').filter({ hasText: /create bot/i });
    await expect(submitButton).toBeDisabled();

    await page.screenshot({ path: 'test-results/create-bot-04-no-message.png', fullPage: true });
    await assertNoErrors(errors, 'Submit without message provider');
  });

  test('Submit button disabled without LLM provider', async ({ page }) => {
    await page.route('/api/config/llm-status', route => route.fulfill({
      status: 200,
      json: { defaultConfigured: false }
    }));
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Fill name
    await modal.locator('input').first().fill('Test Bot');

    // Select only message provider (second select after persona)
    const selects = modal.locator('select');
    const selectCount = await selects.count();
    if (selectCount >= 2) {
      await selects.nth(1).selectOption('discord');
    }
    await page.waitForTimeout(300);

    const submitButton = modal.locator('button').filter({ hasText: /create bot/i });
    await expect(submitButton).toBeDisabled();

    await page.screenshot({ path: 'test-results/create-bot-05-no-llm.png', fullPage: true });
    await assertNoErrors(errors, 'Submit without LLM provider');
  });

  test('Submit button enabled with all required fields', async ({ page }) => {
    // Wait for the modal to be ready and APIs to settle
    await page.waitForTimeout(500);
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);
    await expect(modal).toBeVisible();

    // Fill name
    await modal
      .locator('input')
      .first()
      .fill('Test Bot ' + Date.now());

    // Get all selects and fill them
    const selects = modal.locator('select');
    const selectCount = await selects.count();

<<<<<<< HEAD
    // Fill message provider (index 1 after persona)
    if (selectCount >= 2) {
      await selects.nth(1).selectOption('discord');
    }
    // Fill LLM provider (index 2)
    if (selectCount >= 3) {
      await selects.nth(2).selectOption('openai');
    }
    await page.waitForTimeout(300);

    const submitButton = modal.locator('button').filter({ hasText: /create bot/i });
=======
    // Fill message provider (index 0 on step 1)
    if (selectCount >= 1) {
      await selects.nth(0).selectOption('discord');
    }

    // Fill LLM provider
    if (selectCount >= 2) {
      // In tests, default is configured so we don't need to explicitly select an option,
      // it should be valid since the default is configured.
    }

    await page.waitForTimeout(300);
    const submitButton = modal.locator('button').filter({ hasText: /Next/i });

    // In our test, if LLM provider defaults are configured, selecting only Message Provider satisfies validation.
    // Ensure all state has updated properly before asserting enabled.
>>>>>>> origin/main
    await expect(submitButton).toBeEnabled();

    await page.screenshot({ path: 'test-results/create-bot-06-all-fields.png', fullPage: true });
    await assertNoErrors(errors, 'Submit enabled with all fields');
  });

  test('Error styling on empty required selects', async ({ page }) => {
    await page.route('/api/config/llm-status', route => route.fulfill({
      status: 200,
      json: { defaultConfigured: false }
    }));
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Check for error styling on selects
    const errorSelects = modal.locator('select.select-error');
    const errorCount = await errorSelects.count();

    // Should have error styling on message and LLM provider selects
    expect(errorCount).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: 'test-results/create-bot-07-error-styling.png', fullPage: true });
    await assertNoErrors(errors, 'Error styling on selects');
  });

  test('Persona has default value selected', async ({ page }) => {
    await page.waitForTimeout(500);
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);
    await expect(modal).toBeVisible();

<<<<<<< HEAD
    // First select is persona, should have default value
    const personaSelect = modal.locator('select').first();
    const value = await personaSelect.inputValue();
=======
    // Fill required fields and go to step 2
    await modal.locator('input').first().fill('Test Bot');
    const selects = modal.locator('select');
    const selectCount = await selects.count();
    if (selectCount >= 2) {
      await selects.nth(0).selectOption('discord');
    }
    await page.waitForTimeout(300);
    const nextButton = modal.locator('button').filter({ hasText: /Next/i });
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await page.waitForTimeout(300);
>>>>>>> origin/main

    expect(value).toBeTruthy();
    expect(value).toBe('default');

    await page.screenshot({ path: 'test-results/create-bot-08-persona.png', fullPage: true });
    await assertNoErrors(errors, 'Persona default value');
  });

  test('Cancel button closes modal', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);
    await expect(modal).toBeVisible();

    // Click cancel
    const cancelButton = modal.locator('button').filter({ hasText: /cancel/i });
    await cancelButton.click();
    await page.waitForTimeout(500);

    // Modal should not be visible
    await expect(modal).not.toBeVisible();

    await page.screenshot({ path: 'test-results/create-bot-09-cancelled.png', fullPage: true });
    await assertNoErrors(errors, 'Cancel button closes modal');
  });

  test('Required fields marked with asterisk', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Check for asterisks
    const asterisks = modal.locator('span.text-error:has-text("*")');
    const count = await asterisks.count();

    // Should have at least 2 (Message Provider and LLM Provider)
    expect(count).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: 'test-results/create-bot-10-asterisks.png', fullPage: true });
    await assertNoErrors(errors, 'Required field asterisks');
  });

  test('Message provider has + button', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Find Message Provider label section
    const msgLabel = modal.locator('label:has-text("Message Provider")');
    const msgFormControl = msgLabel.locator('xpath=..'); // Parent

    // Should have a square button with +
    const plusButton = msgFormControl.locator('button.btn-square');
    await expect(plusButton).toBeVisible();

    await page.screenshot({ path: 'test-results/create-bot-11-msg-plus.png', fullPage: true });
    await assertNoErrors(errors, 'Message provider + button');
  });

  test('LLM provider has no + button', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/bots');

    const modal = await openCreateBotModal(page);

    // Find LLM Provider label section
    const llmLabel = modal.locator('label:has-text("LLM Provider")');
    const llmFormControl = llmLabel.locator('xpath=..');

    // Should NOT have a square button
    const plusButton = llmFormControl.locator('button.btn-square');
    const count = await plusButton.count();

    expect(count).toBe(0);

    await page.screenshot({ path: 'test-results/create-bot-12-no-llm-plus.png', fullPage: true });
    await assertNoErrors(errors, 'LLM provider no + button');
  });
});
