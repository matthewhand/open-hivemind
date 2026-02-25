import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Documentation Screenshots', () => {
  test('Capture Bots Page and Create Bot Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Bots page
    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for content to load properly
    await page.waitForSelector('h1:has-text("Bot Management")');

    // Screenshot Bots Page
    await page.screenshot({ path: 'docs/screenshots/bots-page.png', fullPage: true });

    // Open Create Bot Modal
    const createButton = page
      .locator('button')
      .filter({ hasText: /create.*bot|new.*bot/i })
      .first();
    await createButton.click();

    // Wait for modal
    const modal = page.locator('.modal-box, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Fill in dummy data for better visual
    await modal.locator('input').first().fill('My Helper Bot');

    // Attempt to select providers based on observed UI (Basics tab: Message Provider, LLM Provider)
    const selects = modal.locator('select');

    // Message Provider (usually first on Basics tab)
    if ((await selects.count()) > 0) {
      // Try to select 'discord', or fall back to index 1, with short timeout
      await selects
        .first()
        .selectOption('discord', { timeout: 2000 })
        .catch(() => selects.first().selectOption({ index: 1 }, { timeout: 2000 }))
        .catch(() => {}); // Ignore errors, default selection or empty is acceptable for screenshot
    }

    // LLM Provider (usually second on Basics tab)
    if ((await selects.count()) > 1) {
      // Try to select 'openai', or fall back to index 1, with short timeout
      await selects
        .nth(1)
        .selectOption('openai', { timeout: 2000 })
        .catch(() => selects.nth(1).selectOption({ index: 1 }, { timeout: 2000 }))
        .catch(() => {}); // Ignore errors, default selection or empty is acceptable for screenshot
    }

    // Wait a bit for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Create Bot Modal
    await page.screenshot({ path: 'docs/screenshots/create-bot-modal.png', fullPage: true });
  });

  test('Create and Duplicate Bot', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Data
    const mockBot = {
      id: 'screenshot-bot',
      name: 'Screenshot Bot',
      description: 'A bot for screenshots',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'default',
      status: 'active',
      connected: true,
      messageCount: 0,
      errorCount: 0,
    };

    // We use a variable to simulate server state
    let bots: any[] = [];

    // Mock API responses
    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        json: { profiles: { llm: [{ key: 'openai', name: 'GPT-4', provider: 'openai' }] } },
      });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'default',
            name: 'Default Assistant',
            description: 'Helpful assistant',
            systemPrompt: 'You are helpful.',
          },
        ],
      });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ json: { openai: { values: {} }, discord: { values: {} } } });
    });

    // Handle Config GET
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: { bots: bots, legacyMode: false, environment: 'test', warnings: [] },
        });
      } else {
        await route.continue();
      }
    });

    // Handle Bot POST (Create)
    await page.route('**/api/bots', async (route) => {
      if (route.request().method() === 'POST') {
        bots = [mockBot]; // Update state
        await route.fulfill({ json: { success: true, bot: mockBot } });
      } else {
        await route.continue();
      }
    });

    // Navigate to Bots page
    await navigateAndWaitReady(page, '/admin/bots');

    // Open Create Bot Modal
    await page
      .getByRole('button', { name: /create.*bot/i })
      .first()
      .click();

    // Step 1: Basics
    const modal = page.locator('.modal-box').first();
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder('e.g. HelpBot').fill('Screenshot Bot');

    // Select LLM Provider (Mocked 'openai')
    const selects = modal.locator('select');
    // We expect at least Message Provider and LLM Provider
    if ((await selects.count()) > 1) {
      await selects.nth(1).selectOption('openai');
    }

    // Click Next
    await modal.getByRole('button', { name: 'Next' }).click();

    // Step 2: Persona
    await modal.getByRole('button', { name: 'Next' }).click();

    // Step 3: Guards
    await modal.getByRole('button', { name: 'Next' }).click();

    // Step 4: Review -> Finish
    await modal.getByRole('button', { name: 'Finish & Create' }).click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible();

    // Find the new bot row
    await expect(page.getByText('Screenshot Bot')).toBeVisible();

    // Locate the specific row that contains "Screenshot Bot"
    const duplicateButton = page
      .locator('div:has-text("Screenshot Bot")')
      .locator('button[title="Duplicate Bot"]')
      .first();

    await expect(duplicateButton).toBeVisible();
    await duplicateButton.click();

    // Wait for Clone Modal
    const cloneModal = page.locator('.modal-box', { hasText: 'Clone Bot' });
    await expect(cloneModal).toBeVisible();

    // Wait for animation
    await page.waitForTimeout(500);

    // Screenshot
    await page.screenshot({ path: 'docs/screenshots/clone-bot-modal.png' });
  });
});
