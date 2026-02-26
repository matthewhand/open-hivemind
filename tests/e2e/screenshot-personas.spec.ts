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

    // Mock Personas Data
    await page.route('/api/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: [
          {
            id: 'p1',
            name: 'Friendly Assistant',
            description: 'A helpful and polite general assistant.',
            category: 'general',
            systemPrompt: 'You are a helpful assistant. You answer questions clearly and politely.',
            isBuiltIn: true,
          },
          {
            id: 'p2',
            name: 'Code Expert',
            description: 'Specialized in writing clean, efficient code.',
            category: 'technical',
            systemPrompt: 'You are an expert software engineer. You write clean, documented code.',
            isBuiltIn: false,
          },
          {
            id: 'p3',
            name: 'Creative Writer',
            description: 'Helps with creative writing tasks.',
            category: 'creative',
            systemPrompt: 'You are a creative writer. Use vivid imagery.',
            isBuiltIn: false,
          },
          {
            id: 'p4',
            name: 'Support Agent',
            description: 'Handles customer inquiries.',
            category: 'customer_service',
            systemPrompt: 'You are a customer support agent.',
            isBuiltIn: false,
          }
        ],
      })
    );

    // Mock Config (Bots) for assignments
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { id: 'b1', name: 'HelpBot', persona: 'p1' },
            { id: 'b2', name: 'DevBot', persona: 'p2' },
            { id: 'b3', name: 'CodeBot', persona: 'p2' },
            { id: 'b4', name: 'ReviewBot', persona: 'p2' },
            { id: 'b5', name: 'TestBot', persona: 'p2' }, // 4th bot for p2 -> +1 more
            { id: 'b6', name: 'StoryBot', persona: 'p3' },
          ],
        },
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Wait for key elements
    await expect(page.getByText('Personas (Beta)')).toBeVisible();
    await expect(page.getByText('Friendly Assistant')).toBeVisible();

    // Verify badge rendering (wait for it)
    await expect(page.getByText('+1 more')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
