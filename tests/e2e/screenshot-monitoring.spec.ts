import { test, expect } from '@playwright/test';

test('monitoring dashboard screenshot', async ({ page }) => {
  // Set viewport size for consistent screenshots
  await page.setViewportSize({ width: 1280, height: 800 });

  // Mock API calls
  await page.route('**/api/config/global', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.route('**/api/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bots: [
          { name: 'SupportBot', messageProvider: 'discord', llmProvider: 'openai', persona: 'Helper' },
          { name: 'DevBot', messageProvider: 'slack', llmProvider: 'anthropic', persona: 'Coder' }
        ],
        warnings: [],
        legacyMode: false,
        environment: 'development'
      })
    });
  });

  await page.route('**/api/dashboard/api/status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bots: [
          { name: 'SupportBot', provider: 'discord', llmProvider: 'openai', status: 'active', connected: true, messageCount: 150, errorCount: 0 },
          { name: 'DevBot', provider: 'slack', llmProvider: 'anthropic', status: 'active', connected: true, messageCount: 85, errorCount: 2 }
        ],
        uptime: 12345
      })
    });
  });

  await page.route('**/health/detailed', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 12345,
        memory: { used: 4000, total: 8000, usage: 50 },
        cpu: { user: 10, system: 5 },
        system: { platform: 'linux', arch: 'x64', release: '1.0.0', hostname: 'server', loadAverage: [0.5, 0.4, 0.3] }
      })
    });
  });

  await page.route('**/api/dashboard/api/activity**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            botName: 'SupportBot',
            provider: 'discord',
            llmProvider: 'openai',
            channelId: '123',
            userId: 'user1',
            messageType: 'incoming',
            contentLength: 20,
            status: 'success'
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 1000).toISOString(),
            botName: 'SupportBot',
            provider: 'discord',
            llmProvider: 'openai',
            channelId: '123',
            userId: 'bot',
            messageType: 'outgoing',
            contentLength: 50,
            processingTime: 150,
            status: 'success'
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 5000).toISOString(),
            botName: 'DevBot',
            provider: 'slack',
            llmProvider: 'anthropic',
            channelId: '456',
            userId: 'user2',
            messageType: 'incoming',
            contentLength: 15,
            status: 'success'
          }
        ]
      })
    });
  });

  // Mock other potentially needed endpoints to prevent 404s/errors
  await page.route('**/api/health/detailed', async route => route.fulfill({ status: 200, body: JSON.stringify({ status: 'healthy' }) }));
  await page.route('**/api/bots/templates', async route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
  await page.route('**/api/webui/system-status', async route => route.fulfill({ status: 200, body: JSON.stringify({}) }));


  // Navigate to monitoring page
  await page.goto('/admin/monitoring');

  // Wait for critical elements to be visible
  await expect(page.getByRole('heading', { name: 'System Monitoring' })).toBeVisible();

  // Wait for stats to load
  await expect(page.getByRole('tab', { name: 'System Health' })).toBeVisible();
  await expect(page.getByText('Active Bots', { exact: true })).toBeVisible();

  // Wait for content to stabilize
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });
});
