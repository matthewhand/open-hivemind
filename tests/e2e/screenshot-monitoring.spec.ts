import { test, expect } from '@playwright/test';

test('Monitoring Dashboard Screenshot', async ({ page }) => {
  // Set viewport for consistent screenshot
  await page.setViewportSize({ width: 1280, height: 1200 });

  // Mock API responses
  await page.route('**/api/dashboard/api/status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bots: [
            { name: 'SupportBot', provider: 'slack', llmProvider: 'openai', status: 'active', connected: true, messageCount: 1542, errorCount: 2, healthDetails: { latency: 45 } },
            { name: 'DevAssistant', provider: 'discord', llmProvider: 'anthropic', status: 'active', connected: true, messageCount: 890, errorCount: 0, healthDetails: { latency: 32 } },
            { name: 'OnboardingBot', provider: 'mattermost', llmProvider: 'openai', status: 'warning', connected: true, messageCount: 120, errorCount: 5, healthDetails: { latency: 150 } },
        ],
        uptime: 123456
      })
    });
  });

  await page.route('**/api/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bots: [
            { name: 'SupportBot', messageProvider: 'slack', llmProvider: 'openai', persona: 'Customer Support' },
            { name: 'DevAssistant', messageProvider: 'discord', llmProvider: 'anthropic', persona: 'Developer' },
            { name: 'OnboardingBot', messageProvider: 'mattermost', llmProvider: 'openai', persona: 'HR' },
        ],
        warnings: [],
        legacyMode: false,
        environment: 'production'
      })
    });
  });

  // getSystemHealth -> /health/detailed
  await page.route('**/health/detailed', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: 3600 * 24 * 3, // 3 days
            memory: { used: 4 * 1024 * 1024 * 1024, total: 16 * 1024 * 1024 * 1024, usage: 25 },
            cpu: { user: 15, system: 5 },
            system: { platform: 'linux', arch: 'x64', release: '5.15.0', hostname: 'server-01', loadAverage: [0.45, 0.52, 0.48] }
        })
      });
  });

  // getApiEndpointsStatus -> /health/api-endpoints
  await page.route('**/health/api-endpoints', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            overall: { status: 'healthy', message: 'All systems operational', stats: { total: 3, online: 3, slow: 0, offline: 0, error: 0 } },
            endpoints: [
                { id: '1', name: 'Primary Database', url: 'localhost:5432', status: 'online', responseTime: 12, lastChecked: new Date().toISOString() },
                { id: '2', name: 'Redis Cache', url: 'localhost:6379', status: 'online', responseTime: 2, lastChecked: new Date().toISOString() },
                { id: '3', name: 'OpenAI API', url: 'api.openai.com', status: 'online', responseTime: 145, lastChecked: new Date().toISOString() },
            ],
            timestamp: new Date().toISOString()
        })
      });
  });

  // getActivity -> /api/dashboard/api/activity
  await page.route('**/api/dashboard/api/activity', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            events: [
                { id: '1', timestamp: new Date().toISOString(), botName: 'SupportBot', provider: 'slack', llmProvider: 'openai', channelId: 'C123', userId: 'U456', messageType: 'incoming', contentLength: 50, processingTime: 120, status: 'success' },
                { id: '2', timestamp: new Date(Date.now() - 5000).toISOString(), botName: 'SupportBot', provider: 'slack', llmProvider: 'openai', channelId: 'C123', userId: 'U456', messageType: 'outgoing', contentLength: 200, processingTime: 450, status: 'success' },
                { id: '3', timestamp: new Date(Date.now() - 15000).toISOString(), botName: 'DevAssistant', provider: 'discord', llmProvider: 'anthropic', channelId: 'C789', userId: 'U012', messageType: 'incoming', contentLength: 80, processingTime: 110, status: 'success' },
                { id: '4', timestamp: new Date(Date.now() - 20000).toISOString(), botName: 'DevAssistant', provider: 'discord', llmProvider: 'anthropic', channelId: 'C789', userId: 'U012', messageType: 'outgoing', contentLength: 350, processingTime: 890, status: 'success' },
                { id: '5', timestamp: new Date(Date.now() - 60000).toISOString(), botName: 'OnboardingBot', provider: 'mattermost', llmProvider: 'openai', channelId: 'C456', userId: 'U789', messageType: 'incoming', contentLength: 20, processingTime: 0, status: 'error', errorMessage: 'Rate limit exceeded' },
            ],
            filters: { agents: ['SupportBot', 'DevAssistant', 'OnboardingBot'], messageProviders: ['slack', 'discord', 'mattermost'], llmProviders: ['openai', 'anthropic'] },
            timeline: [],
            agentMetrics: []
        })
      });
  });

  // Navigate to Monitoring page
  await page.goto('/admin/monitoring');

  // Wait for the page to load and data to be populated
  await expect(page.getByRole('heading', { name: 'System Monitoring Dashboard' })).toBeVisible();
  await expect(page.getByText('System Health Monitor')).toBeVisible();

  // Wait a bit for animations/charts
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });
});
