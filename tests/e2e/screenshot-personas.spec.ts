import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Page Screenshot', () => {
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
            description: 'Friendly and professional support agent.',
            category: 'customer_service',
            systemPrompt: 'You are a helpful customer support agent. Be polite, concise, and professional.',
            isBuiltIn: true,
          },
          {
            id: 'p2',
            name: 'Senior Developer',
            description: 'Expert in TypeScript and React.',
            category: 'technical',
            systemPrompt: 'You are a senior software engineer. specific, code-focused, and efficient.',
            isBuiltIn: false,
          },
           {
            id: 'p3',
            name: 'Creative Writer',
            description: ' imaginative storyteller.',
            category: 'creative',
            systemPrompt: 'You are a creative writer. Use vivid imagery and metaphors.',
            isBuiltIn: false,
          }
        ],
      })
    );

    // Mock Bots (for assignment count)
    // We need 5 bots for p1 to test the "+2 more" badge
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { id: 'b1', name: 'Support Bot 1', persona: 'p1' },
            { id: 'b2', name: 'Support Bot 2', persona: 'p1' },
            { id: 'b3', name: 'Support Bot 3', persona: 'p1' },
            { id: 'b4', name: 'Support Bot 4', persona: 'p1' },
            { id: 'b5', name: 'Support Bot 5', persona: 'p1' },
            { id: 'b6', name: 'Dev Bot', persona: 'p2' },
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
    await expect(page.getByRole('heading', { name: 'Customer Support' })).toBeVisible();

    // Verify badge logic visually (optional assertion)
    await expect(page.getByText('+2 more')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
