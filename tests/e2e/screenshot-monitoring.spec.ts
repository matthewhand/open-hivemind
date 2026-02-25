import { test, expect } from '@playwright/test';

test.describe('Monitoring Dashboard', () => {
  test('should display system monitoring dashboard', async ({ page }) => {
    // Mock /api/config
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            {
              name: 'HelpBot',
              messageProvider: 'discord',
              llmProvider: 'openai',
              persona: 'Helper'
            },
            {
              name: 'SlackBot',
              messageProvider: 'slack',
              llmProvider: 'anthropic',
            }
          ],
          environment: 'production'
        }),
      });
    });

    // Mock /api/dashboard/api/status
    await page.route('**/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            {
              name: 'HelpBot',
              provider: 'discord',
              llmProvider: 'openai',
              status: 'active',
              connected: true,
              messageCount: 1240,
              errorCount: 2
            },
            {
              name: 'SlackBot',
              provider: 'slack',
              llmProvider: 'anthropic',
              status: 'warning',
              connected: true,
              messageCount: 50,
              errorCount: 12
            }
          ],
          uptime: 3600 * 24 * 3 // 3 days
        }),
      });
    });

    // Mock /health/detailed
    await page.route('**/health/detailed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 3600 * 24 * 3,
          memory: {
            used: 1024 * 1024 * 512, // 512MB
            total: 1024 * 1024 * 1024 * 2, // 2GB
            usage: 25
          },
          cpu: {
            user: 10,
            system: 5
          },
          system: {
            platform: 'linux',
            arch: 'x64',
            release: '5.4.0',
            hostname: 'hivemind-server',
            loadAverage: [0.5, 0.3, 0.1]
          }
        }),
      });
    });

    // Mock /api/dashboard/api/activity
    await page.route('**/api/dashboard/api/activity*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: '1',
              timestamp: new Date().toISOString(),
              botName: 'HelpBot',
              provider: 'discord',
              llmProvider: 'openai',
              channelId: '123',
              userId: 'user1',
              messageType: 'incoming',
              contentLength: 50,
              status: 'success'
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 1000).toISOString(),
              botName: 'HelpBot',
              provider: 'discord',
              llmProvider: 'openai',
              channelId: '123',
              userId: 'user1',
              messageType: 'outgoing',
              contentLength: 200,
              processingTime: 450,
              status: 'success'
            }
          ]
        }),
      });
    });

    // Mock other config calls if needed (global, llm-profiles)
    await page.route('**/api/config/global', async (route) => {
        await route.fulfill({ status: 200, body: '{}' });
    });

    await page.route('**/api/bots/templates', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    // Mock mcp-servers for global nav or similar
    await page.route('**/api/admin/mcp-servers', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify({ servers: [] }) });
    });

    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/monitoring');

    // Wait for content to load
    await expect(page.getByText('System Monitoring')).toBeVisible();
    await expect(page.getByText('System Health Monitor')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });

    // Also verify Bots tab works (optional, but good for verification)
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    await expect(page.getByText('HelpBot')).toBeVisible();
  });
});
