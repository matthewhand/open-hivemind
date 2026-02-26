import { test, expect } from '@playwright/test';

test('Capture Hacker Mode', async ({ page }) => {
  // Mock API endpoints to ensure dashboard loads
  await page.route('**/api/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bots: [{ id: 'bot-1', name: 'Demo Bot', messageProvider: 'discord', llmProvider: 'openai' }],
        personas: [],
        llm_profiles: []
      }),
    });
  });

  await page.route('**/api/dashboard/api/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        active_bots: 1,
        total_messages: 1337,
        error_rate: 0,
        uptime: '1h 0m',
        bots: [{
            name: 'Demo Bot',
            provider: 'web',
            llmProvider: 'openai',
            status: 'active',
            connected: true,
            messageCount: 1337,
            errorCount: 0
        }]
      }),
    });
  });

  await page.route('**/api/personas', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/config/llm-profiles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profiles: { llm: [] }, defaultConfigured: true }),
    });
  });

  // Mock Auth and Health to prevent redirects or errors
  await page.route('**/api/auth/check', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: { id: 'admin', username: 'admin', role: 'admin' }
      }),
    });
  });

  await page.route('**/api/health/detailed', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        uptime: 3600,
        memory: { used: 500, total: 1000 },
        cpu: { user: 10, system: 5 },
        system: { platform: 'linux', arch: 'x64', release: '1.0.0', hostname: 'test', loadAverage: [0, 0, 0] }
      }),
    });
  });

  // Navigate to dashboard
  await page.goto('/admin/overview');

  // Wait for dashboard title to ensure app loaded
  await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 30000 });

  // Ensure we are on the status tab
  const statusTab = page.getByTestId('status-tab');
  await statusTab.click();
  await expect(statusTab).toHaveClass(/tab-active/);

  // Wait for stats content
  // Using a more lenient selector or ensuring it's in the DOM
  await expect(page.getByText('Active Bots').first()).toBeVisible({ timeout: 10000 });

  // Enter Konami Code
  const keys = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];

  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(100);
  }

  // Verify Hacker Mode enabled
  await expect(page.locator('html')).toHaveClass(/theme-hacker/);

  // Wait for styles to apply completely
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({
    path: 'docs/screenshots/hacker-mode.png',
    fullPage: true
  });
});
