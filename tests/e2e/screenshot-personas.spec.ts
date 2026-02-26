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

    // Mock Personas with Traits
    const personas = [
      {
        id: 'p1',
        name: 'Customer Support',
        description: 'Friendly and helpful support agent',
        category: 'customer_service',
        systemPrompt: 'You are a helpful customer support agent. You answer questions clearly and politely.',
        isBuiltIn: false,
        traits: [
          { name: 'Creativity', value: 20 },
          { name: 'Empathy', value: 90 },
          { name: 'Logic', value: 60 },
          { name: 'Humor', value: 30 },
          { name: 'Tone', value: 80 },
        ],
      },
      {
        id: 'p2',
        name: 'Technical Assistant',
        description: 'Expert in code and technical details',
        category: 'technical',
        systemPrompt: 'You are an expert software engineer. You provide concise and correct code snippets.',
        isBuiltIn: true,
        traits: [
          { name: 'Creativity', value: 40 },
          { name: 'Empathy', value: 30 },
          { name: 'Logic', value: 95 },
          { name: 'Humor', value: 20 },
          { name: 'Tone', value: 40 },
        ],
      },
      {
        id: 'p3',
        name: 'Creative Writer',
        description: 'Imaginative storyteller',
        category: 'creative',
        systemPrompt: 'You are a creative writer. You use vivid imagery and engaging narratives.',
        isBuiltIn: false,
        traits: [
          { name: 'Creativity', value: 95 },
          { name: 'Empathy', value: 70 },
          { name: 'Logic', value: 30 },
          { name: 'Humor', value: 60 },
          { name: 'Tone', value: 70 },
        ],
      },
    ];

    await page.route('/api/admin/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: personas,
      })
    );
    await page.route('/api/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: personas,
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Wait for key elements to be visible
    await expect(page.getByText('Personas (Beta)', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer Support' })).toBeVisible();

    // Wait for the Radar Charts to render (they are within the card)
    await expect(page.getByText('Personality Profile').first()).toBeVisible();

    // Wait for data to load
    await expect(page.getByText('Total Personas')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
