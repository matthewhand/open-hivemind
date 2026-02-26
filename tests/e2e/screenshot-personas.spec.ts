import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock layout dependencies
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );
    await page.route(
      '/api/config/global',
      async (route) => route.fulfill({ status: 200, json: { bots: [] } })
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

    // Mock Personas Data
    const mockBots = [
      { id: 'bot1', name: 'Support Bot', persona: 'persona1' },
      { id: 'bot2', name: 'Sales Bot', persona: 'persona1' },
      { id: 'bot3', name: 'Tech Bot', persona: 'persona1' },
      { id: 'bot4', name: 'HR Bot', persona: 'persona1' },
      { id: 'bot5', name: 'Marketing Bot', persona: 'persona1' },
      { id: 'bot6', name: 'Dev Bot', persona: 'persona2' },
    ];

    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: mockBots,
        },
      })
    );

    await page.route('/api/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: [
          {
            id: 'persona1',
            name: 'Customer Specialist',
            description: 'A friendly and knowledgeable customer support agent.',
            category: 'customer_service',
            systemPrompt: 'You are a helpful customer support agent. Be polite, concise, and accurate.',
            isBuiltIn: false,
          },
          {
            id: 'persona2',
            name: 'Senior Developer',
            description: 'Expert in TypeScript, React, and Node.js.',
            category: 'technical',
            systemPrompt: 'You are a senior software engineer. Provide high-quality, bug-free code examples.',
            isBuiltIn: true,
          },
        ],
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Wait for header
    await expect(page.getByText('Personas (Beta)', { exact: true })).toBeVisible();

    // Wait for personas to load
    await expect(page.getByText('Customer Specialist')).toBeVisible();
    await expect(page.getByText('Senior Developer')).toBeVisible();

    // Verify the "+2 more" badge is visible (3 bots shown, 2 hidden out of 5)
    // The exact text depends on implementation, but we expect "+2 more"
    await expect(page.getByText('+2 more')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
