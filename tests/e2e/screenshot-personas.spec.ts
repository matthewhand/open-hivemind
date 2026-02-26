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

    // Mock Personas
    const mockPersonas = [
      {
        id: 'p1',
        name: 'Helpful Assistant',
        description: 'Standard helpful AI assistant',
        category: 'general',
        systemPrompt: 'You are a helpful assistant who provides clear and concise answers.',
        isBuiltIn: true,
      },
      {
        id: 'p2',
        name: 'Coding Expert',
        description: 'Specialized in writing and debugging code',
        category: 'technical',
        systemPrompt: 'You are an expert software engineer. Always provide code examples and explain your reasoning.',
        isBuiltIn: false,
      },
      {
        id: 'p3',
        name: 'Creative Writer',
        description: 'Great for brainstorming and story writing',
        category: 'creative',
        systemPrompt: 'You are a creative writer. Use vivid imagery and engaging narratives.',
        isBuiltIn: false,
      },
    ];

    await page.route('/api/personas', async (route) =>
      route.fulfill({ status: 200, json: mockPersonas })
    );

    // Mock Bots (to show assignments)
    // p1 has 1 bot
    // p2 has 5 bots (to test +N more)
    // p3 has 0 bots
    const mockBots = [
      { id: 'b1', name: 'GeneralBot', persona: 'p1' },
      { id: 'b2', name: 'CodeBot 1', persona: 'p2' },
      { id: 'b3', name: 'CodeBot 2', persona: 'p2' },
      { id: 'b4', name: 'CodeBot 3', persona: 'p2' },
      { id: 'b5', name: 'CodeBot 4', persona: 'p2' },
      { id: 'b6', name: 'CodeBot 5', persona: 'p2' },
    ];

    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: { bots: mockBots },
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Wait for key elements to be visible
    await expect(page.getByText('Personas (Beta)', { exact: false })).toBeVisible();

    // Wait for cards to load
    await expect(page.getByRole('heading', { name: 'Helpful Assistant' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Coding Expert' })).toBeVisible();

    // Check for badge "+2 more" (since 5 bots assigned, 3 shown)
    await expect(page.getByText('+2 more')).toBeVisible();

    // Check for View button
    // It's an icon button with title "View Details"
    const viewButtons = page.locator('button[title="View Details"]');
    await expect(viewButtons.first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
