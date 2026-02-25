import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Analytics Dashboard Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling to prevent 404s
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
    await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { defaultConfigured: true } }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/admin/guard-profiles', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/demo/status', async (route) => route.fulfill({ status: 200, json: { enabled: false } }));
    await page.route('/api/csrf-token', async (route) => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));
    await page.route('/api/health/detailed', async (route) => route.fulfill({ status: 200, json: { status: 'ok' } }));

    // Mock WebSocket context data (metrics)
    // Note: WS data is harder to mock directly in E2E without connecting to a real WS server,
    // but the component might fetch initial data via API or handle empty states gracefully.
    // The dashboard component uses apiService.getActivity which calls /api/dashboard/api/activity

    // Mock Activity Data
    await page.route('/api/dashboard/api/activity*', async (route) => {
      const now = new Date();
      // Generate some trend data
      const timeline = Array.from({ length: 24 }, (_, i) => {
        const date = new Date(now);
        date.setHours(now.getHours() - (23 - i));
        return {
          timestamp: date.toISOString(),
          messageProviders: { discord: Math.floor(Math.random() * 50) + 10, slack: Math.floor(Math.random() * 30) },
          llmProviders: { openai: Math.floor(Math.random() * 80) }
        };
      });

      await route.fulfill({
        status: 200,
        json: {
          events: [
            { id: "1", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), botName: "Support Bot", provider: "discord", llmProvider: "openai", channelId: "123", userId: "user1", messageType: "incoming", contentLength: 50, processingTime: 120, status: "success" },
            { id: "2", timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(), botName: "Support Bot", provider: "discord", llmProvider: "openai", channelId: "123", userId: "bot", messageType: "outgoing", contentLength: 200, processingTime: 0, status: "success" },
            { id: "3", timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), botName: "Dev Bot", provider: "slack", llmProvider: "anthropic", channelId: "456", userId: "user2", messageType: "incoming", contentLength: 100, processingTime: 500, status: "error", errorMessage: "Rate limit exceeded" }
          ],
          filters: { agents: ["Support Bot", "Dev Bot"], messageProviders: ["discord", "slack"], llmProviders: ["openai", "anthropic"] },
          timeline: timeline,
          agentMetrics: [
            { botName: "Support Bot", messageProvider: "discord", llmProvider: "openai", events: 1200, errors: 5, lastActivity: new Date().toISOString(), totalMessages: 1200, recentErrors: [] },
            { botName: "Dev Bot", messageProvider: "slack", llmProvider: "anthropic", events: 800, errors: 25, lastActivity: new Date().toISOString(), totalMessages: 800, recentErrors: ["Rate limit"] }
          ]
        }
      });
    });
  });

  test('capture analytics dashboard screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 }); // Taller viewport for dashboard
    await page.goto('/admin/analytics');

    // Wait for header and charts
    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible();
    await expect(page.getByText('Message Volume')).toBeVisible();

    // Wait a bit for animations/charts to settle
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'docs/screenshots/analytics-dashboard.png', fullPage: true });
  });
});
