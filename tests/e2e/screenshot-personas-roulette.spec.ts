import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Persona Roulette Screenshot', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock backend endpoints
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({ status: 200, json: { defaultConfigured: true } })
    );

    await page.route('/api/config', async (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    await page.route('/api/personas', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );

     await page.route('/api/admin/personas', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
  });

  test('capture persona roulette screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/admin/personas');

    // Open Create Modal
    await page.getByRole('button', { name: 'Create Persona' }).click();

    // Wait for modal and Randomize button
    const surpriseBtn = page.getByRole('button', { name: 'Surprise Me!' });
    await expect(surpriseBtn).toBeVisible();

    // Click Surprise Me!
    await surpriseBtn.click();

    // Verify fields are filled (non-empty)
    const nameInput = page.getByPlaceholder('e.g. Friendly Helper');
    await expect(nameInput).not.toBeEmpty();

    // Wait for toast to appear (optional, adds visual confirmation)
    await expect(page.getByText('Persona Randomized!')).toBeVisible();

    // Take screenshot of the modal
    // We can screenshot the whole page with the modal open
    await page.screenshot({ path: 'docs/screenshots/persona-roulette.png', fullPage: true });
  });
});
