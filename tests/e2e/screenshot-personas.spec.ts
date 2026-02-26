import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Personas Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock Auth
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock Config (Bots)
    await page.route('/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          bots: [
            { name: 'CustomerSupport', id: 'bot1', persona: 'persona1' },
            { name: 'SalesBot', id: 'bot2', persona: 'persona1' },
            { name: 'TechHelper', id: 'bot3', persona: 'persona1' },
            { name: 'BillingBot', id: 'bot4', persona: 'persona1' }, // 4th bot for +1 more
            { name: 'CreativeWriter', id: 'bot5', persona: 'persona2' },
          ],
        },
      });
    });

    // Mock Personas
    await page.route('/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 'persona1',
            name: 'Customer Service Rep',
            description: 'Professional and polite customer support agent.',
            category: 'customer_service',
            systemPrompt: 'You are a helpful customer service representative for ACME Corp. You should be polite, patient, and knowledgeable about our products. Always apologize for inconvenience and offer solutions.',
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'persona2',
            name: 'Creative Writer',
            description: 'Imaginative and descriptive writing assistant.',
            category: 'creative',
            systemPrompt: 'You are a creative writer. Use vivid imagery and metaphors.',
            isBuiltIn: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'persona3',
            name: 'Python Expert',
            description: 'Specialized in Python programming and debugging.',
            category: 'technical',
            systemPrompt: 'You are a senior Python developer. You prefer clean, PEP8 compliant code.',
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });
    });
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });

    // Log console messages to debug
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

    await page.goto('/admin/personas');

    // Wait for potentially slow load
    await expect(page.getByText('Personas (Beta)')).toBeVisible({ timeout: 30000 });

    // Ensure data is loaded
    await expect(page.getByRole('heading', { name: 'Customer Service Rep' })).toBeVisible();

    // Check for badge presence
    await expect(page.getByText('+1 more')).toBeVisible();

    // Check for View button presence
    await expect(page.getByRole('button', { name: 'View' }).first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
