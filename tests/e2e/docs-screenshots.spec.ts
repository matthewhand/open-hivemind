import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Documentation Screenshots', () => {
  test('Capture Bots Page and Create Bot Modal', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

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
    const modal = page.locator('.modal-box, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Fill in dummy data for better visual
    await modal.locator('input').first().fill('My Helper Bot');

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
  });

  test('Capture Activity Page and Event Details', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock the activity API
    await page.route('**/api/dashboard/api/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'evt_123456789',
              timestamp: new Date().toISOString(),
              botName: 'SupportBot',
              provider: 'discord',
              llmProvider: 'openai',
              status: 'success',
              processingTime: 450,
              contentLength: 125,
              messageType: 'incoming',
            },
            {
              id: 'evt_987654321',
              timestamp: new Date(Date.now() - 5000).toISOString(),
              botName: 'CodingAssistant',
              provider: 'slack',
              llmProvider: 'anthropic',
              status: 'error',
              processingTime: 1200,
              errorMessage: 'Rate limit exceeded',
              contentLength: 50,
              messageType: 'outgoing',
            },
             {
              id: 'evt_555555555',
              timestamp: new Date(Date.now() - 15000).toISOString(),
              botName: 'CasualChat',
              provider: 'discord',
              llmProvider: 'local',
              status: 'pending',
              processingTime: 0,
              contentLength: 200,
              messageType: 'incoming',
            }
          ],
          filters: {
            agents: ['SupportBot', 'CodingAssistant', 'CasualChat'],
            messageProviders: ['discord', 'slack'],
            llmProviders: ['openai', 'anthropic', 'local']
          },
          timeline: [],
          agentMetrics: []
        }),
      });
    });

    // Navigate to Activity page
    await navigateAndWaitReady(page, '/admin/activity');

    // Wait for content to load (Table)
    await page.waitForSelector('table');

    // Wait a bit for stats to render
    await page.waitForTimeout(500);

    // Screenshot Activity Page
    await page.screenshot({ path: 'docs/images/activity-page.png', fullPage: true });

    // Click the first row to open details
    await page.locator('table tbody tr').first().click();

    // Wait for modal
    const modal = page.locator('.modal-open').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Event Details');
    await expect(modal).toContainText('evt_123456789');

    // Wait for modal transition
    await page.waitForTimeout(500);

    // Screenshot Activity Details Modal
    await page.screenshot({ path: 'docs/images/activity-details-modal.png', fullPage: true });
  });
});
