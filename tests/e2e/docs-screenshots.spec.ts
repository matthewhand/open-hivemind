import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Documentation Screenshots', () => {
  test('Capture Bots Page and Create Bot Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock API to ensure consistent data for screenshots
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            bots: [
              {
                id: 'bot-1',
                name: 'My Helper Bot',
                description: 'A helpful assistant',
                provider: 'discord',
                llmProvider: 'openai',
                persona: 'default',
                status: 'active',
                connected: true,
                messageCount: 123,
                errorCount: 0
              }
            ],
            warnings: [],
            legacyMode: false,
            environment: 'production'
          }
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/config/global', async route => route.fulfill({ json: {} }));
    await page.route('**/api/personas', async route => route.fulfill({ json: [] }));
    await page.route('**/api/config/llm-profiles', async route => route.fulfill({ json: { profiles: { llm: [] } } }));
    await page.route('**/api/health/detailed', async route => route.fulfill({ json: { status: 'ok' } }));

    // Navigate to Bots page
    await navigateAndWaitReady(page, '/admin/bots');

    // Wait for content to load properly
    await page.waitForSelector('h1:has-text("Bot Management")');

    // Screenshot Bots Page
    await page.screenshot({ path: 'docs/images/bots-page.png', fullPage: true });

    // Open Create Bot Modal
    const createButton = page.locator('button').filter({ hasText: /create.*bot|new.*bot/i }).first();
    await createButton.click();

    // Wait for modal
    const modal = page.locator('dialog[open]');
    await expect(modal).toBeVisible();

    // Fill in dummy data for better visual
    await modal.locator('input').first().fill('My New Bot');

    // Attempt to select providers based on observed UI (Basics tab: Message Provider, LLM Provider)
    const selects = modal.locator('select');

    // Message Provider (usually first on Basics tab)
    if (await selects.count() > 0) {
      // Try to select 'discord', or fall back to index 1, with short timeout
      await selects.first().selectOption('discord', { timeout: 2000 })
        .catch(() => selects.first().selectOption({ index: 1 }, { timeout: 2000 }))
        .catch(() => {}); // Ignore errors, default selection or empty is acceptable for screenshot
    }

    // LLM Provider (usually second on Basics tab)
    if (await selects.count() > 1) {
      // Try to select 'openai', or fall back to index 1, with short timeout
      await selects.nth(1).selectOption('openai', { timeout: 2000 })
        .catch(() => selects.nth(1).selectOption({ index: 1 }, { timeout: 2000 }))
        .catch(() => {}); // Ignore errors, default selection or empty is acceptable for screenshot
    }

    // Wait a bit for UI to settle
    await page.waitForTimeout(500);

    // Screenshot Create Bot Modal
    await page.screenshot({ path: 'docs/images/create-bot-modal.png', fullPage: true });

    // Close Create Modal
    await modal.getByLabel('Close modal').click();
    await expect(modal).not.toBeVisible();

    // Open Clone Bot Modal
    // Find the Duplicate button (using title attribute as it is an icon button)
    const duplicateButton = page.locator('button[title="Duplicate Bot"]').first();
    await duplicateButton.click();

    // Wait for Clone Modal
    const cloneModal = page.locator('dialog[open]').filter({ hasText: 'Duplicate Bot' }).first();
    await expect(cloneModal).toBeVisible();

    // Screenshot Clone Bot Modal
    await page.screenshot({ path: 'docs/images/clone-bot-modal.png' });
  });
});
