import { expect, test } from '@playwright/test';

test.describe('Dashboard Performance & Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      const user = {
        id: 'test-user',
        username: 'tester',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['*'],
      };
      const tokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    });

    // 2. Mock API endpoints
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            {
              name: 'TestBot1',
              messageProvider: 'discord',
              llmProvider: 'openai',
            },
            {
              name: 'TestBot2',
              messageProvider: 'slack',
              llmProvider: 'anthropic',
            },
          ],
        }),
      });
    });

    await page.route('**/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            {
              status: 'active',
              connected: true,
              messageCount: 150,
              errorCount: 0,
            },
            {
              status: 'inactive',
              connected: false,
              messageCount: 0,
              errorCount: 2,
            },
          ],
          uptime: 3600,
        }),
      });
    });
  });

  test('Dashboard loads bots correctly', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for header to be visible (verifies we are on the dashboard)
    await expect(page.getByText('Open-Hivemind Dashboard')).toBeVisible();

    // Wait for loading to finish (skeletons disappear)
    // We can check for the presence of specific bot cards
    await expect(page.getByText('TestBot1')).toBeVisible();
    await expect(page.getByText('TestBot2')).toBeVisible();

    // Verify status badges
    // Use exact match to avoid matching "Active Bots" or "Demo Mode Active"
    await expect(page.getByRole('status').getByText('ACTIVE', { exact: true })).toBeVisible();
    await expect(page.getByRole('status').getByText('INACTIVE', { exact: true })).toBeVisible();
  });
});
