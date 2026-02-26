import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Dashboard Overview Screenshots', () => {
  test('Capture Overview Page with Swarm Topology', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock API endpoints
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock Config (Bots Definition)
    const bots = [
      { name: 'SupportAgent', messageProvider: 'discord', llmProvider: 'openai', persona: 'Support' },
      { name: 'DevOpsBot', messageProvider: 'slack', llmProvider: 'anthropic', persona: 'Engineer' },
      { name: 'SalesBot', messageProvider: 'mattermost', llmProvider: 'local', persona: 'Sales' },
      { name: 'AlertBot', messageProvider: 'webhook', llmProvider: 'openai' },
      { name: 'CommunityMgr', messageProvider: 'discord', llmProvider: 'flowise', persona: 'Community' },
    ];

    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots,
          environment: 'production',
          system: { version: '2.4.0', environment: 'production' },
          warnings: []
        },
      })
    );

    // Mock Status (Real-time State)
    await page.route('/api/dashboard/api/status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'SupportAgent', status: 'active', connected: true, messageCount: 1240, errorCount: 0 },
            { name: 'DevOpsBot', status: 'active', connected: true, messageCount: 85, errorCount: 0 },
            { name: 'SalesBot', status: 'error', connected: true, messageCount: 42, errorCount: 3 },
            { name: 'AlertBot', status: 'offline', connected: false, messageCount: 0, errorCount: 0 },
            { name: 'CommunityMgr', status: 'active', connected: true, messageCount: 567, errorCount: 1 },
          ],
          uptime: 3600 * 48, // 48 hours
        },
      })
    );

    // Mock other dependencies to ensure clean load
    await page.route('/api/personas', async (route) => route.fulfill({ status: 200, json: [] }));
    await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: { profiles: { llm: [] } } }));

    // Navigate to Dashboard
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/overview'); // Or just /admin if it redirects

    // Wait for the new section to be visible
    // The new section has text "Live Swarm Topology"
    await expect(page.getByText('Live Swarm Topology')).toBeVisible();

    // Hover over one of the nodes to show tooltip (optional, but adds detail)
    // We can try to hover over the first node (SupportAgent)
    // The nodes are in a container. We can find by text logic or just take the shot.
    // Let's just take the shot to keep it clean.

    // Wait for animations to settle (though pulse is continuous)
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/overview-page.png', fullPage: true });
  });
});
