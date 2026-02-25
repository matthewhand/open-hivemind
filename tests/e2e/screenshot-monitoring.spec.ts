import { test, expect } from '@playwright/test';

test('screenshot monitoring dashboard', async ({ page }) => {
  // Mock API endpoints
  await page.route('**/api/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bots: [
          { name: 'SupportBot', messageProvider: 'discord', llmProvider: 'openai', persona: 'Customer Support' },
          { name: 'DevBot', messageProvider: 'slack', llmProvider: 'anthropic', persona: 'Developer Assistant' },
          { name: 'TestBot', messageProvider: 'mattermost', llmProvider: 'local', persona: 'Testing' }
        ],
        warnings: [],
        legacyMode: false,
        environment: 'production'
      })
    });
  });

  await page.route('**/api/dashboard/api/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bots: [
          { name: 'SupportBot', status: 'active', connected: true, messageCount: 1245, errorCount: 0, responseTime: 250 },
          { name: 'DevBot', status: 'warning', connected: true, messageCount: 56, errorCount: 2, responseTime: 850 },
          { name: 'TestBot', status: 'error', connected: false, messageCount: 0, errorCount: 5, responseTime: 0 }
        ],
        uptime: 86400 * 3.5 // 3.5 days
      })
    });
  });

  await page.route('**/health/detailed', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        uptime: 86400 * 3.5,
        timestamp: new Date().toISOString(),
        memory: {
          used: 8 * 1024 * 1024 * 1024, // 8GB
          total: 16 * 1024 * 1024 * 1024, // 16GB
          usage: 50
        },
        cpu: {
          user: 25,
          system: 15
        },
        system: {
          platform: 'linux',
          arch: 'x64',
          release: '5.15.0',
          hostname: 'hivemind-server',
          loadAverage: [1.25, 0.95, 0.80]
        }
      })
    });
  });

  await page.route('**/health/api-endpoints', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overall: { status: 'healthy' },
        endpoints: [
          { id: '1', name: 'OpenAI API', status: 'online', responseTime: 145, lastChecked: new Date().toISOString() },
          { id: '2', name: 'Discord Gateway', status: 'online', responseTime: 45, lastChecked: new Date().toISOString() },
          { id: '3', name: 'Slack API', status: 'slow', responseTime: 850, lastChecked: new Date().toISOString(), errorMessage: 'High latency' }
        ]
      })
    });
  });

  await page.route('**/api/dashboard/api/activity*', async (route) => {
    const now = Date.now();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: '1',
            timestamp: new Date(now - 5000).toISOString(),
            botName: 'SupportBot',
            provider: 'discord',
            llmProvider: 'openai',
            status: 'success',
            messageType: 'incoming',
            processingTime: 245
          },
          {
            id: '2',
            timestamp: new Date(now - 15000).toISOString(),
            botName: 'DevBot',
            provider: 'slack',
            llmProvider: 'anthropic',
            status: 'success',
            messageType: 'outgoing',
            processingTime: 520
          },
          {
            id: '3',
            timestamp: new Date(now - 45000).toISOString(),
            botName: 'TestBot',
            provider: 'mattermost',
            llmProvider: 'local',
            status: 'error',
            messageType: 'outgoing',
            errorMessage: 'Connection timed out',
            processingTime: 5000
          }
        ],
        filters: { agents: [], messageProviders: [], llmProviders: [] },
        timeline: [],
        agentMetrics: []
      })
    });
  });

  // Mock auth check
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            id: 'admin',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin'
        })
    });
  });

  // Navigate to monitoring page
  await page.goto('/admin/monitoring');

  // Wait for content to load
  await expect(page.getByText('System Monitoring Dashboard')).toBeVisible();

  // Wait for stats to animate/load
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });
});
