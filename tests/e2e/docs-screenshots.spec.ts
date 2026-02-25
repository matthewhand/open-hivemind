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
      const mockEvents = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          botName: 'CustomerSupport',
          provider: 'discord',
          llmProvider: 'openai',
          status: 'success',
          processingTime: 1250,
          contentLength: 450,
          messageType: 'incoming',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          botName: 'SalesBot',
          provider: 'slack',
          llmProvider: 'anthropic',
          status: 'pending',
          messageType: 'outgoing',
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          botName: 'TechHelper',
          provider: 'discord',
          llmProvider: 'local',
          status: 'error',
          processingTime: 5000,
          errorMessage: 'Connection timeout to LLM provider',
          messageType: 'incoming',
        },
        {
            id: '4',
            timestamp: new Date(Date.now() - 180000).toISOString(),
            botName: 'CustomerSupport',
            provider: 'discord',
            llmProvider: 'openai',
            status: 'success',
            processingTime: 800,
            contentLength: 120,
            messageType: 'outgoing',
        }
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: mockEvents,
          filters: {
            agents: ['CustomerSupport', 'SalesBot', 'TechHelper'],
            messageProviders: ['discord', 'slack'],
            llmProviders: ['openai', 'anthropic', 'local'],
          },
          timeline: [],
          agentMetrics: []
        }),
      });
    });

    // Navigate to Activity page
    await navigateAndWaitReady(page, '/admin/activity');

    // Wait for content
    await page.waitForSelector('h1:has-text("Activity Feed")');
    // Wait for at least one row
    await page.waitForSelector('table tbody tr');

    // Screenshot Activity Page
    await page.screenshot({ path: 'docs/images/activity-page.png', fullPage: true });

    // Click on the first row to open details
    await page.locator('table tbody tr').first().click();

    // Wait for modal
    const modal = page.locator('.modal-box, [role="dialog"]').last();
    await expect(modal).toBeVisible();
    await page.waitForTimeout(500); // Animation

    // Screenshot Details Modal
    await page.screenshot({ path: 'docs/images/activity-details-modal.png', fullPage: true });
  });
});
