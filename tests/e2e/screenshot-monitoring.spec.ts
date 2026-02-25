import { test, expect } from '@playwright/test';

test.describe('Monitoring Dashboard Screenshots', () => {
  test('monitoring dashboard screenshot', async ({ page }) => {
    // Setup authentication
    await page.addInitScript(() => {
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
        const fakeUser = JSON.stringify({
            id: 'admin',
            username: 'admin',
            email: 'admin@open-hivemind.com',
            role: 'owner',
            permissions: ['*'],
        });
        localStorage.setItem('auth_tokens', JSON.stringify({
            accessToken: fakeToken,
            refreshToken: fakeToken,
            expiresIn: 3600,
        }));
        localStorage.setItem('auth_user', fakeUser);
    });

    // Mock API endpoints... (same as before)
    await page.route('**/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            {
              name: 'Support Bot',
              provider: 'discord',
              llmProvider: 'openai',
              status: 'healthy',
              connected: true,
              messageCount: 1542,
              errorCount: 2,
              healthDetails: { latency: '45ms' }
            },
            {
              name: 'Sales Bot',
              provider: 'slack',
              llmProvider: 'anthropic',
              status: 'warning',
              connected: true,
              messageCount: 890,
              errorCount: 12,
              healthDetails: { latency: '120ms' }
            },
            {
              name: 'Dev Bot',
              provider: 'mattermost',
              llmProvider: 'local',
              status: 'error',
              connected: false,
              messageCount: 0,
              errorCount: 5,
              healthDetails: { error: 'Connection refused' }
            }
          ],
          uptime: 345600 // 4 days
        }),
      });
    });

    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            { name: 'Support Bot', messageProvider: 'discord', llmProvider: 'openai' },
            { name: 'Sales Bot', messageProvider: 'slack', llmProvider: 'anthropic' },
            { name: 'Dev Bot', messageProvider: 'mattermost', llmProvider: 'local' }
          ],
          warnings: [],
          legacyMode: false,
          environment: 'production'
        }),
      });
    });

    await page.route('**/health/detailed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 345600,
          memory: { used: 4096 * 1024 * 1024, total: 16384 * 1024 * 1024, usage: 25 },
          cpu: { user: 15, system: 5 },
          system: { platform: 'linux', arch: 'x64', release: '5.4.0', hostname: 'hivemind-server', loadAverage: [0.45, 0.60, 0.55] },
          disk: { total: 500 * 1024 * 1024 * 1024, used: 120 * 1024 * 1024 * 1024, usage: 24 },
          network: { status: 'online', latency: 25 }
        }),
      });
    });

    await page.route('**/api/dashboard/api/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: '1',
              timestamp: new Date().toISOString(),
              botName: 'Support Bot',
              provider: 'discord',
              llmProvider: 'openai',
              channelId: '123',
              userId: 'user1',
              messageType: 'incoming',
              contentLength: 50,
              processingTime: 120,
              status: 'success'
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 60000).toISOString(),
              botName: 'Sales Bot',
              provider: 'slack',
              llmProvider: 'anthropic',
              channelId: '456',
              userId: 'user2',
              messageType: 'outgoing',
              contentLength: 200,
              processingTime: 450,
              status: 'success'
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 120000).toISOString(),
              botName: 'Dev Bot',
              provider: 'mattermost',
              llmProvider: 'local',
              channelId: '789',
              userId: 'user3',
              messageType: 'incoming',
              contentLength: 10,
              processingTime: 0,
              status: 'error',
              errorMessage: 'Connection timeout'
            }
          ],
          filters: { agents: [], messageProviders: [], llmProviders: [] },
          timeline: [],
          agentMetrics: []
        }),
      });
    });

    await page.route('**/health/api-endpoints', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                overall: { status: 'healthy' },
                endpoints: [
                    { id: '1', name: 'OpenAI API', status: 'online', responseTime: 120, lastChecked: new Date().toISOString() },
                    { id: '2', name: 'Discord Gateway', status: 'online', responseTime: 45, lastChecked: new Date().toISOString() },
                    { id: '3', name: 'Database', status: 'online', responseTime: 5, lastChecked: new Date().toISOString() }
                ]
            })
        });
    });

    await page.route('**/api/csrf-token', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ csrfToken: 'mock-csrf-token' }),
        });
    });

    await page.route('**/api/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'admin',
                username: 'admin',
                role: 'owner'
            }),
        });
    });

    // Mock other config calls that might happen
    await page.route('**/api/config/llm-profiles', async route => {
      await route.fulfill({ json: { profiles: { llm: [] } } });
    });
    await page.route('**/api/bots/templates', async route => {
      await route.fulfill({ json: { templates: [] } });
    });
    await page.route('**/api/demo/status', async route => {
        await route.fulfill({ json: { enabled: false } });
    });
    await page.route('**/api/webui/system-status', async route => {
        await route.fulfill({ json: { version: '1.0.0' } });
    });
    await page.route('**/api/admin/mcp-servers', async route => {
        await route.fulfill({ json: { servers: [] } });
    });


    await page.setViewportSize({ width: 1280, height: 1200 });

    // Go to admin root
    await page.goto('/admin/overview');

    // Check if we are on login
    if (page.url().includes('/login')) {
        console.log('Detected login page, attempting to log in...');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin'); // Assuming default or ignored
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin/overview');
    }

    // Now navigate to monitoring
    await page.goto('/admin/monitoring');

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'System Monitoring Dashboard' })).toBeVisible({ timeout: 10000 });

    // Wait for stats to appear (e.g. System Health card)
    // We target the heading inside the card specifically to be sure
    await expect(page.getByRole('tab', { name: 'System Health' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });
  });
});
