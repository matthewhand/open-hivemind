import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock config endpoints to avoid errors
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

    // Mock Bots (for assigned bots count)
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { id: 'bot1', name: 'CustomerSupport', persona: 'p1' },
            { id: 'bot2', name: 'SalesBot', persona: 'p1' },
            { id: 'bot3', name: 'TechHelper', persona: 'p1' },
            { id: 'bot4', name: 'HR_Assistant', persona: 'p1' },
            { id: 'bot5', name: 'DevBot', persona: 'p2' },
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
            id: 'p1',
            name: 'Customer Success',
            description: 'Professional and helpful support agent for handling customer inquiries.',
            category: 'customer_service',
            systemPrompt: 'You are a helpful customer support agent. Be polite and concise.',
            isBuiltIn: false,
          },
          {
            id: 'p2',
            name: 'Coding Expert',
            description: 'Assists with programming tasks, debugging, and code reviews.',
            category: 'technical',
            systemPrompt: 'You are an expert software engineer. Write clean, efficient code.',
            isBuiltIn: false,
          },
          {
            id: 'p3',
            name: 'Creative Writer',
            description: 'Helps with brainstorming, story writing, and content creation.',
            category: 'creative',
            systemPrompt: 'You are a creative writer. Use vivid imagery and engaging language.',
            isBuiltIn: true,
          },
        ],
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');

    // Wait for the main elements
    await expect(page.getByText('Personas (Beta)')).toBeVisible();

    // Wait for the cards to render
    await expect(page.getByRole('heading', { name: 'Customer Success' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Coding Expert' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Creative Writer' })).toBeVisible();

    // Verify the "+N more" badge is visible for 'Customer Success' (has 4 bots: bot1..bot4)
    // It should show 3 badges and one "+1 more" badge.
    await expect(page.getByText('+1 more')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
