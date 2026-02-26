import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[Browser Error]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`[Page Error]: ${err.message}`);
    });

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock global config (bots needed for mapping)
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'Bot1', id: 'bot1', persona: 'persona-1' },
            { name: 'Bot2', id: 'bot2', persona: 'persona-1' },
            { name: 'Bot3', id: 'bot3', persona: 'persona-2' },
            { name: 'Bot4', id: 'bot4', persona: 'persona-2' },
            { name: 'Bot5', id: 'bot5', persona: 'persona-2' },
            { name: 'Bot6', id: 'bot6', persona: 'persona-2' },
            { name: 'Bot7', id: 'bot7', persona: 'persona-2' },
            { name: 'Bot8', id: 'bot8', persona: 'default' },
          ],
        },
      })
    );

    // Mock Personas
    await page.route('/api/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: [
          {
            id: 'persona-1',
            name: 'Customer Support',
            description: 'Professional and helpful support agent',
            category: 'customer_service',
            systemPrompt: 'You are a professional customer support agent. Be polite, concise, and helpful.',
            isBuiltIn: false,
          },
          {
            id: 'persona-2',
            name: 'Creative Writer',
            description: 'Imaginative and detailed storyteller',
            category: 'creative',
            systemPrompt: 'You are a creative writer. Use vivid imagery and detailed descriptions.',
            isBuiltIn: false,
          },
          {
            id: 'persona-3',
            name: 'Coding Assistant',
            description: 'Expert software engineer',
            category: 'technical',
            systemPrompt: 'You are an expert software engineer. Provide clean, efficient, and well-documented code.',
            isBuiltIn: true,
          },
        ],
      })
    );

    // Mock other potential dependencies to prevent 404s
    await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: {} }));
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/admin/personas');

    // Wait for content to load
    await expect(page.getByText('Personas (Beta)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer Support' })).toBeVisible();

    // Verify the "+N more" badge logic (Creative Writer has 5 bots: Bot3, Bot4, Bot5, Bot6, Bot7)
    // Assigned logic in component maps bots by `bot.persona === p.id`.
    // So for persona-2, we have Bot3..Bot7 (5 bots).
    // MAX_BOTS_SHOWN = 3. Remaining = 2.
    // Expect to see "+2 more".
    await expect(page.getByText('+2 more')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
