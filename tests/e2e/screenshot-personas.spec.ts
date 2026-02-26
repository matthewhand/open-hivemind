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
    await page.route('/api/personas', async (route) =>
      route.fulfill({
        status: 200,
        json: [
          {
            id: 'p1',
            name: 'Helpful Assistant',
            description: 'A general purpose assistant for daily tasks',
            category: 'general',
            systemPrompt: 'You are a helpful assistant.',
            isBuiltIn: true,
          },
          {
            id: 'p2',
            name: 'Code Expert',
            description: 'Expert software engineer specializing in TypeScript and React',
            category: 'technical',
            systemPrompt: 'You are an expert software engineer. Write clean, efficient, and well-documented code.',
            isBuiltIn: false,
          },
          {
            id: 'p3',
            name: 'Creative Writer',
            description: 'A creative writing partner for stories and poems',
            category: 'creative',
            systemPrompt: 'You are a creative writer. Use vivid imagery and engaging narratives.',
            isBuiltIn: false,
          },
        ],
      })
    );

    // Mock Config (Bots) to simulate assignments
    await page.route('/api/config', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            // Assigned to p1
            { id: 'b1', name: 'SupportBot', persona: 'p1' },
            // Assigned to p2 (5 bots)
            { id: 'b2', name: 'DevBot1', persona: 'p2' },
            { id: 'b3', name: 'DevBot2', persona: 'p2' },
            { id: 'b4', name: 'DevBot3', persona: 'p2' },
            { id: 'b5', name: 'DevBot4', persona: 'p2' },
            { id: 'b6', name: 'DevBot5', persona: 'p2' },
            // No bots for p3
          ],
        },
      })
    );
  });

  test('capture personas page screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Wait for key elements to be visible
    await expect(page.getByText('Personas (Beta)', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Personas', { exact: true })).toBeVisible();

    // Wait for cards to load - use specific heading selector to avoid ambiguity
    await expect(page.getByRole('heading', { name: 'Helpful Assistant' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Code Expert' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Creative Writer' })).toBeVisible();

    // Verify "+2 more" badge logic for Code Expert (5 bots assigned, limit is 3)
    // The test data has 5 bots for 'Code Expert'.
    // We expect to see 3 badges and one "+2 more" badge in that card.
    await expect(page.getByText('+2 more')).toBeVisible();

    // Verify "View" button exists
    await expect(page.locator('button[title="View Details"]').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });
});
