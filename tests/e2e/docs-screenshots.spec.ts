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

    // Mock API response
    await page.route('**/api/dashboard/api/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'evt-001',
              timestamp: new Date().toISOString(),
              botName: 'SupportBot',
              provider: 'discord',
              llmProvider: 'openai',
              status: 'success',
              processingTime: 1250,
              contentLength: 450,
              messageType: 'incoming',
              channelId: '123456',
              userId: 'user-001'
            },
            {
              id: 'evt-002',
              timestamp: new Date(Date.now() - 5000).toISOString(),
              botName: 'CodingHelper',
              provider: 'slack',
              llmProvider: 'anthropic',
              status: 'error',
              processingTime: 500,
              contentLength: 120,
              errorMessage: 'Rate limit exceeded',
              messageType: 'outgoing',
              channelId: 'general',
              userId: 'user-002'
            },
            {
              id: 'evt-003',
              timestamp: new Date(Date.now() - 15000).toISOString(),
              botName: 'ReviewBot',
              provider: 'github',
              llmProvider: 'google',
              status: 'success',
              processingTime: 3200,
              contentLength: 850,
              messageType: 'incoming',
              channelId: 'pr-123',
              userId: 'user-003'
            }
          ],
          filters: {
            agents: ['SupportBot', 'CodingHelper', 'ReviewBot'],
            messageProviders: ['discord', 'slack', 'github'],
            llmProviders: ['openai', 'anthropic', 'google']
          },
          timeline: [],
          agentMetrics: []
        })
      });
    });

    // Navigate to Activity Page
    await navigateAndWaitReady(page, '/admin/activity');

    // Wait for content
    await page.waitForSelector('h1:has-text("Activity Feed")');
    // Wait for table rows
    await page.waitForSelector('table tbody tr');

    // Screenshot Activity Page
    await page.screenshot({ path: 'docs/images/activity-page.png', fullPage: true });

    // Click the first row to open details
    // We target the first row explicitly
    await page.locator('table tbody tr').first().click();

    // Wait for modal
    // Using dialog[open]
    const modal = page.locator('dialog[open]').last();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Event Details');

    // Wait a bit for animation
    await page.waitForTimeout(500);

    // Screenshot Modal
    await page.screenshot({ path: 'docs/images/activity-details-modal.png', fullPage: true });
  });
});
