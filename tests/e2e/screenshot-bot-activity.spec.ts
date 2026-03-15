import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Bot Activity Screenshots', () => {
  test('Capture Bot Activity Logs', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('requestfailed', (request) =>
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
    );

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
      messageCount: 42,
      errorCount: 0,
      config: { discord: { token: '***' }, openai: { apiKey: '***' } },
    };

    const mockActivityLogs = [
      {
        id: 'log1',
        timestamp: new Date().toISOString(),
        action: 'INCOMING',
        details: 'Message length: 15',
        result: 'success',
        metadata: {
          type: 'MESSAGE',
          channelId: '123',
          userId: 'user1',
        },
      },
      {
        id: 'log2',
        timestamp: new Date(Date.now() - 5000).toISOString(),
        action: 'OUTGOING',
        details: 'Message length: 120',
        result: 'success',
        metadata: {
          type: 'MESSAGE',
          channelId: '123',
          userId: 'bot',
        },
      },
      {
        id: 'log3',
        timestamp: new Date(Date.now() - 10000).toISOString(),
        action: 'ERROR',
        details: 'Connection timeout',
        result: 'error',
        metadata: {
          type: 'MESSAGE',
          channelId: '123',
          userId: 'user1',
        },
      },
    ];

    // Mock general endpoints that Dashboard layout requires
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'healthy', memory: { usage: 25 }, cpu: { user: 10 } } });
    });

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
      await route.fulfill({ json: { _userSettings: { values: {} } } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ status: 200, json: { defaultConfigured: true } });
    });

    // Handle Config GET (it's called by multiple components, sometimes checking /api/config)
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ bots: [mockBot], legacyMode: false, environment: 'test', warnings: [] }),
        });
      } else {
        await route.continue();
      }
    });

    // Handle /api/bots GET since BotsPage uses withRetry which checks success flag
    await page.route('**/api/bots', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, bots: [mockBot], data: { bots: [mockBot] } }),
        });
      } else {
        await route.continue();
      }
    });

    // Handle Activity Logs GET
    await page.route('**/api/bots/screenshot-bot/activity*', async (route) => {
      console.log('Intercepted activity request');
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { activity: mockActivityLogs } }),
      });
    });

    // Handle History GET (Empty for now)
    await page.route('**/api/bots/*/history*', async (route) => {
      await route.fulfill({
        json: { success: true, history: [] },
      });
    });

    // Navigate to Bots page
    await page.goto('/admin/bots');

    // Wait for content
    await expect(page.getByText('Screenshot Bot')).toBeVisible({ timeout: 10000 });

    // Screenshot Bots Page (Clean)
    await page.screenshot({ path: 'docs/screenshots/bots-page.png', fullPage: true });

    // To open the preview, we need to click the card.
    // The safest way is to find the card element and click it via evaluate.
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Screenshot Bot'));
      if (heading) {
        const cardBody = heading.closest('.card-body');
        if (cardBody) {
            // Find a button or the outer container that has the click handler
            const card = cardBody.closest('.card') as HTMLElement;
            if (card) {
                card.click();
            }
        }
      }
    });

    await page.waitForTimeout(1000);

    // Wait for the Activity text or similar inside the sidebar.
    try {
      await expect(page.getByText('Connection timeout')).toBeVisible({ timeout: 2000 });
    } catch (e) {
      console.log('Activity log not visible, trying clicking the "More Options" button or the card itself...');

      // Let's click the card body containing the description.
      await page.getByText('A bot for screenshots').click();
      await page.waitForTimeout(1000);

      try {
        await expect(page.getByText('Connection timeout')).toBeVisible({ timeout: 5000 });
      } catch (innerE) {
        console.log('Log still not found, clicking "Configure" as fallback...');
        // In case the preview doesn't exist, maybe it's in a modal like before.
        await page.getByRole('button', { name: 'Configure' }).click();

        try {
            await expect(page.getByText('Connection timeout')).toBeVisible({ timeout: 5000 });
        } catch (finalE) {
            console.log('Log still not found, taking debug screenshot');
            await page.screenshot({ path: 'docs/screenshots/debug-failure.png' });
            throw finalE;
        }
      }
    }

    // Screenshot Details panel
    await page.screenshot({ path: 'docs/screenshots/bot-details-modal.png', fullPage: true });
  });
});
