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

    // Mock Personas
    await page.route('/api/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: [
          {
            id: 'p1',
            name: 'Customer Support',
            description: 'Friendly and helpful support agent',
            category: 'customer_service',
            systemPrompt: 'You are a friendly customer support agent. Help users with their inquiries.',
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'p2',
            name: 'Senior Developer',
            description: 'Expert in TypeScript and React',
            category: 'technical',
            systemPrompt: 'You are a senior software engineer. Provide code examples and technical explanations.',
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'default',
            name: 'Default Assistant',
            description: 'General purpose assistant',
            category: 'general',
            systemPrompt: 'You are a helpful assistant.',
            isBuiltIn: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      })
    );

    // Mock Bots (via config)
    const mockBots = {
      bots: [
        { id: 'b1', name: 'SupportBot1', persona: 'p1' },
        { id: 'b2', name: 'SupportBot2', persona: 'p1' },
        { id: 'b3', name: 'SupportBot3', persona: 'p1' },
        { id: 'b4', name: 'SupportBot4', persona: 'p1' },
        { id: 'b5', name: 'SupportBot5', persona: 'p1' },
        { id: 'b6', name: 'DevBot', persona: 'p2' },
      ],
    };

    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );

    // Catch-all for config if it uses a different endpoint
    await page.route('/api/config', async (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/admin/personas');

    // Wait for content
    await expect(page.getByText('Personas (Beta)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer Support' })).toBeVisible();

    // Verify badge visibility
    await expect(page.getByText('+2 more')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
