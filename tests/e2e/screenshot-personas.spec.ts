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
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
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

    // Mock Bots (for assignment resolution)
    const bots = [
      { id: 'bot1', name: 'Support Bot', persona: 'p1' },
      { id: 'bot2', name: 'Sales Bot', persona: 'p1' },
      { id: 'bot3', name: 'Internal Helper', persona: 'p2' },
      { id: 'bot4', name: 'Dev Bot', persona: 'p1' },
      { id: 'bot5', name: 'Analytics Bot', persona: 'p1' },
    ];

    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: { bots },
      })
    );

    // Mock Personas
    const personas = [
      {
        id: 'p1',
        name: 'Customer Support',
        description: 'Friendly and helpful support agent',
        category: 'customer_service',
        systemPrompt:
          'You are a helpful customer support agent. You answer questions clearly and politely.',
        isBuiltIn: false,
      },
      {
        id: 'p2',
        name: 'Technical Assistant',
        description: 'Expert in code and technical details',
        category: 'technical',
        systemPrompt:
          'You are an expert software engineer. You provide concise and correct code snippets.',
        isBuiltIn: true,
      },
      {
        id: 'p3',
        name: 'Creative Writer',
        description: 'Imaginative storyteller',
        category: 'creative',
        systemPrompt: 'You are a creative writer. You use vivid imagery and engaging narratives.',
        isBuiltIn: false,
      },
    ];

    await page.route(
      '/api/admin/personas',
      async (
        route // Note: The client uses /api/personas but sometimes redirects or aliases might exist. Let's mock both just in case or verify.
      ) =>
        // apiService.getPersonas() -> /api/personas
        // But in the previous block I read apiService.getPersonas() calls /api/personas.
        // Wait, let me check the route again.
        // return this.request<Persona[]>('/api/personas');
        // So I should mock /api/personas.
        route.fulfill({
          status: 200,
          json: personas,
        })
    );
    // Double mock just to be safe if there is a redirect I missed, or I can just mock /api/personas.
    await page.route('/api/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: personas,
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    page.on('console', (msg) => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err}`));

    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Wait for key elements to be visible
    await expect(page.getByText('Personas (Beta)', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer Support' })).toBeVisible();

    // Wait for data to load
    await expect(page.getByText('Total Personas')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
