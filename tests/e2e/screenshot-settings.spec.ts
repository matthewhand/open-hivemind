import { test, expect } from '@playwright/test';

test.describe('Settings Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Status API for StatsCards
    await page.route('**/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uptime: 86400 * 3 + 3600 * 5, // 3d 5h
          bots: [
            { name: 'Support Bot', status: 'active', provider: 'openai', llmProvider: 'gpt-4' },
            { name: 'Sales Bot', status: 'active', provider: 'anthropic', llmProvider: 'claude-3' },
            { name: 'Dev Bot', status: 'inactive', provider: 'local', llmProvider: 'llama3' },
            { name: 'Analyst', status: 'active', provider: 'openai', llmProvider: 'gpt-4' }
          ]
        })
      });
    });

    // Mock Global Config
    await page.route('**/api/config/global', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            config: {
              app: {
                name: { value: 'Hivemind Enterprise' },
                description: { value: 'Production environment for AI agents' },
                timezone: { value: 'America/New_York' }
              },
              webui: {
                theme: { value: 'dark' },
                notifications: { value: true },
                advancedMode: true
              },
              logging: {
                enabled: { value: true },
                level: { value: 'info' }
              },
              limits: {
                maxBots: { value: 25 },
                timeout: { value: 60 }
              },
              health: {
                enabled: { value: true },
                interval: { value: 30 }
              },
              auth: { enabled: { value: true } },
              rateLimit: {
                  enabled: { value: true },
                  maxRequests: { value: 1000 },
                  windowMs: { value: 60000 }
              },
              cors: { origins: { value: ['https://app.hivemind.com', 'https://admin.hivemind.com'] } }
            },
            _userSettings: { values: {} }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock Messaging Config
    await page.route('**/api/config/messaging', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                MESSAGE_ONLY_WHEN_SPOKEN_TO: true,
                MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: false,
                MESSAGE_UNSOLICITED_ADDRESSED: true,
                MESSAGE_UNSOLICITED_UNADDRESSED: false,
                MESSAGE_UNSOLICITED_BASE_CHANCE: 0.05,
                MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: 300000
            })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('capture settings tabs', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 1200 });

    // Navigate to Settings
    await page.goto('/admin/settings');

    // Verify Page Header
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByText('Configure your Open-Hivemind instance')).toBeVisible();

    // Verify Stats Cards
    await expect(page.getByText('Active Bots')).toBeVisible();
    // Use more specific locator to avoid strict mode violation (matches '3d 5h' and '3')
    const activeBotsCard = page.locator('.card', { hasText: 'Active Bots' });
    await expect(activeBotsCard.getByText('3', { exact: true })).toBeVisible();

    // Capture General Tab
    await expect(page.getByText('General Configuration')).toBeVisible();
    // Wait for inputs to be populated
    await expect(page.locator('input[value="Hivemind Enterprise"]')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/settings-general.png', fullPage: true });

    // Capture Messaging Tab
    await page.getByRole('tab', { name: 'Messaging' }).click();
    await expect(page.getByText('Messaging Behavior')).toBeVisible();
    await expect(page.getByText('Response Mode')).toBeVisible();
    await page.waitForTimeout(500); // Allow for tab transition/animation
    await page.screenshot({ path: 'docs/screenshots/settings-messaging.png', fullPage: true });

    // Capture Security Tab
    await page.getByRole('tab', { name: 'Security' }).click();
    await expect(page.getByText('Security Policies')).toBeVisible();
    await expect(page.locator('input[value="1000"]')).toBeVisible(); // Rate limit max
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'docs/screenshots/settings-security.png', fullPage: true });
  });
});
