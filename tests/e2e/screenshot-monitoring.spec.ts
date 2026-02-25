import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Monitoring Dashboard Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock config endpoints
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
        route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Config Response (for bots list)
    await page.route('/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: "Support Bot", messageProvider: "discord", llmProvider: "openai", persona: "Customer Support", systemInstruction: "Be helpful." },
            { name: "Helper Bot", messageProvider: "slack", llmProvider: "anthropic", persona: "General Assistant", systemInstruction: "Be concise." },
            { name: "Dev Bot", messageProvider: "mattermost", llmProvider: "local", persona: "Coding Assistant", systemInstruction: "Write clean code." }
          ],
          warnings: [],
          legacyMode: false,
          environment: "production"
        }
      });
    });

    // Mock Status Response
    await page.route('/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: "Support Bot", provider: "discord", llmProvider: "openai", status: "active", connected: true, messageCount: 1245, errorCount: 2, responseTime: 150 },
            { name: "Helper Bot", provider: "slack", llmProvider: "anthropic", status: "active", connected: true, messageCount: 856, errorCount: 0, responseTime: 120 },
            { name: "Dev Bot", provider: "mattermost", llmProvider: "local", status: "warning", connected: true, messageCount: 42, errorCount: 5, responseTime: 450 }
          ],
          uptime: 123456
        }
      });
    });

    // Mock System Health
    await page.route('/health/detailed', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: 123456,
          memory: { used: 8589934592, total: 17179869184, usage: 50 },
          cpu: { user: 15, system: 5 },
          system: { platform: "linux", arch: "x64", release: "5.4.0", hostname: "server-1", loadAverage: [0.5, 0.4, 0.3] },
          network: { status: "online", latency: 25 }
        }
      });
    });

    // Mock Activity
    await page.route('/api/dashboard/api/activity*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          events: [
            { id: "1", timestamp: new Date(Date.now() - 5000).toISOString(), botName: "Support Bot", provider: "discord", llmProvider: "openai", channelId: "123", userId: "user1", messageType: "incoming", contentLength: 50, processingTime: 120, status: "success" },
            { id: "2", timestamp: new Date(Date.now() - 3000).toISOString(), botName: "Support Bot", provider: "discord", llmProvider: "openai", channelId: "123", userId: "bot", messageType: "outgoing", contentLength: 200, processingTime: 0, status: "success" },
            { id: "3", timestamp: new Date(Date.now() - 1000).toISOString(), botName: "Dev Bot", provider: "mattermost", llmProvider: "local", channelId: "456", userId: "user2", messageType: "incoming", contentLength: 100, processingTime: 500, status: "timeout", errorMessage: "LLM timeout" }
          ],
          filters: { agents: ["Support Bot", "Helper Bot", "Dev Bot"], messageProviders: ["discord", "slack", "mattermost"], llmProviders: ["openai", "anthropic", "local"] },
          timeline: [],
          agentMetrics: []
        }
      });
    });
  });

  test('capture monitoring dashboard screenshot', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to Monitoring page
    await page.goto('/admin/monitoring');

    // Wait for the page to load and stats cards to be visible
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'System Monitoring' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'System Health' })).toBeVisible();

    // Take screenshot of the main dashboard (System Health tab active by default)
    await page.screenshot({ path: 'docs/screenshots/monitoring-dashboard.png', fullPage: true });

    // Switch to Bot Status tab
    await page.getByRole('tab', { name: 'Bot Status' }).click();
    await expect(page.getByText('Support Bot')).toBeVisible();
    await page.waitForTimeout(500); // Wait for transition
    await page.screenshot({ path: 'docs/screenshots/monitoring-bots.png', fullPage: true });

    // Switch to Activity Monitor tab
    await page.getByRole('tab', { name: 'Activity Monitor' }).click();
    await expect(page.getByText('Recent Activity')).toBeVisible();
    await page.waitForTimeout(500); // Wait for transition
    await page.screenshot({ path: 'docs/screenshots/monitoring-activity.png', fullPage: true });
  });
});
