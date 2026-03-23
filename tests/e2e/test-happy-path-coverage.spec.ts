import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Happy Path Test Coverage Gaps - Bot Creation', () => {
  test('Creating a bot displays success toast without errors', async ({ page }) => {
    await setupAuth(page);

    // Mock API responses for Bot creation
    await page.route('/api/bots', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { success: true, data: { bots: [] } } });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              bot: {
                id: 'new-bot-1',
                name: 'New Happy Path Bot',
                status: 'active',
                connected: true,
                messageCount: 0,
                errorCount: 0,
              }
            }
          }
        });
      }
    });

    await page.route('/api/config', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/personas', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/llm/profiles', async (route) => route.fulfill({ status: 200, json: { profiles: { llm: [{ key: 'openai-default', name: 'OpenAI Default', type: 'openai' }] } } }));
    await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } }));

    await page.goto('/admin/bots');

    // Wait for the page to be ready
    await page.waitForSelector('text=Create New Bot');
    await page.click('text=Create New Bot');

    // Fill out the bot creation form (Step 1)
    await page.waitForSelector('input[placeholder="e.g. HelpBot"]');
    await page.fill('input[placeholder="e.g. HelpBot"]', 'New Happy Path Bot');
    await page.fill('textarea[placeholder="What does this bot do?"]', 'A test bot');

    // Select Message Provider
    const selects = page.locator('select');
    await selects.nth(1).selectOption('discord'); // First is the search filter on BotsPage

    // Proceed to Step 2
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(200);

    // Proceed to Step 3
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(200);

    // Proceed to Step 4
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(200);

    // Submit the form
    await page.click('button:has-text("Finish & Create")');

    // Wait for success toast
    await expect(page.locator('text=Bot created successfully')).toBeVisible({ timeout: 5000 });

    // Capture screenshot as visual proof
    await page.screenshot({ path: '.jules/after-happy-path.png', fullPage: true });
  });
});
