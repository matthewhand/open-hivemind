import { expect, test } from '@playwright/test';

test.describe('Dashboard Performance & Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock Authentication — use a valid JWT with far-future exp so it's not detected as expired
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
    await page.addInitScript(
      ({ token }) => {
        const user = {
          id: 'test-user',
          username: 'tester',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['*'],
        };
        const tokens = {
          accessToken: token,
          refreshToken: token,
          expiresIn: 3600,
        };
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('auth_tokens', JSON.stringify(tokens));
      },
      { token: fakeToken }
    );

    // 2. Mock API endpoints
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bots: [
            {
              id: 'TestBot1',
              name: 'TestBot1',
              messageProvider: 'discord',
              llmProvider: 'openai',
            },
            {
              id: 'TestBot2',
              name: 'TestBot2',
              messageProvider: 'slack',
              llmProvider: 'anthropic',
            },
          ],
        }),
      });
    });

    // Mock both status endpoint patterns used by apiService.getStatus()
    const statusBody = JSON.stringify({
      bots: [
        {
          id: 'TestBot1',
          name: 'TestBot1',
          status: 'active',
          connected: true,
          messageCount: 150,
          errorCount: 0,
        },
        {
          id: 'TestBot2',
          name: 'TestBot2',
          status: 'inactive',
          connected: false,
          messageCount: 0,
          errorCount: 2,
        },
      ],
      uptime: 3600,
    });
    await page.route('**/api/dashboard/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: statusBody,
      });
    });
    await page.route('**/api/dashboard/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: statusBody,
      });
    });

    // Mock other common endpoints to prevent errors
    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({ json: { defaultConfigured: false, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false } });
    });
    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ json: { token: 'mock-token' } });
    });
    await page.route('**/api/health', async (route) => route.fulfill({ json: { status: 'ok' } }));
    await page.route('**/api/demo/status', async (route) => route.fulfill({ json: { active: false } }));
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
