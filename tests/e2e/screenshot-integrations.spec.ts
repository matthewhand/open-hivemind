import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Integrations Panel Screenshots', () => {
  test('Capture Integrations Panel with Status Indicators', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock Data
    const mockConfig = {
      discord: {
        values: { token: '***' },
        schema: { token: { locked: false } }
      },
      slack: {
        values: { botToken: '' },
        schema: { botToken: { locked: false } }
      },
      llm: {
        values: {},
        schema: {}
      }
    };

    const mockBots = [
      { id: 'bot-1', name: 'Support Bot', messageProvider: 'discord', llmProvider: 'openai' }
    ];

    const mockProfiles = {
      profiles: {
        llm: [
          { key: 'openai', name: 'OpenAI GPT-4', provider: 'openai', config: {} }
        ]
      }
    };

    // Mock API responses
    await page.route('**/api/config/global', async route => {
      await route.fulfill({ json: mockConfig });
    });

    await page.route('**/api/dashboard/api/status', async route => {
      await route.fulfill({ json: { bots: mockBots } });
    });

    await page.route('**/api/config/llm-profiles', async route => {
      await route.fulfill({ json: mockProfiles });
    });

    // Navigate to Config page
    await navigateAndWaitReady(page, '/admin/config');

    // Wait for content to load
    await page.waitForSelector('h1:has-text("Integrations & Configuration")');
    await page.waitForSelector('h2:has-text("Message Platforms")');

    // Ensure status badges are visible
    await expect(page.getByText('Configured').first()).toBeVisible();
    await expect(page.getByText('Not Configured').first()).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'docs/images/integrations-panel.png', fullPage: true });
  });
});
