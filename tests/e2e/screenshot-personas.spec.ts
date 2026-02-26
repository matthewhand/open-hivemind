import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock config/global
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    // Mock Config (Bots)
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            { id: 'bot1', name: 'Support Bot 1', persona: 'support-agent' },
            { id: 'bot2', name: 'Support Bot 2', persona: 'support-agent' },
            { id: 'bot3', name: 'Support Bot 3', persona: 'support-agent' },
            { id: 'bot4', name: 'Support Bot 4', persona: 'support-agent' },
            { id: 'bot5', name: 'General Bot', persona: 'general-assistant' },
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
            id: 'general-assistant',
            name: 'General Assistant',
            description: 'A helpful AI assistant for general tasks.',
            category: 'general',
            systemPrompt: 'You are a helpful assistant. Be concise and polite.',
            isBuiltIn: true,
            assignedBotIds: ['bot5'], // Usually calculated on frontend, but good to have consistent IDs
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'support-agent',
            name: 'Customer Support',
            description: 'Handles customer inquiries with empathy and detail.',
            category: 'customer_service',
            systemPrompt: 'You are a customer support agent. Help users resolve their issues effectively.',
            isBuiltIn: false,
            assignedBotIds: ['bot1', 'bot2', 'bot3', 'bot4'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'creative-writer',
            name: 'Creative Writer',
            description: 'Helps with brainstorming and creative writing tasks.',
            category: 'creative',
            systemPrompt: 'You are a creative writer. Use vivid imagery and metaphors.',
            isBuiltIn: false,
            assignedBotIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Wait for key elements
    await expect(page.getByText('Personas (Beta)', { exact: true })).toBeVisible();

    // Wait for cards to load
    await expect(page.getByRole('heading', { name: 'General Assistant' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer Support' })).toBeVisible();

    // Assert badge logic (optional but good for verification)
    // "Support Bot 1", "Support Bot 2", "Support Bot 3" should be visible
    // "+1 more" should be visible
    await expect(page.getByText('+1 more')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
