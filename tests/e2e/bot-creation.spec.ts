import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Bot Creation Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock API responses needed for the page to render
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );

    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [{ name: 'System Default GPT' }] },
      })
    );

    await page.route('/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 'default', name: 'Default Persona', description: 'The default system persona' },
          { id: 'custom-1', name: 'Custom Persona', description: 'A custom persona' },
        ],
      });
    });

    await page.route('/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 'openai-gpt4', name: 'GPT-4', provider: 'openai' },
          { id: 'anthropic-claude', name: 'Claude', provider: 'anthropic' },
        ],
      });
    });

    await page.route('/api/config/mcp/profiles', async (route) => {
      await route.fulfill({
        status: 200,
        json: [{ id: 'strict', name: 'Strict Security Profile' }],
      });
    });

    // Navigate to the bots page
    await page.goto('/admin');
    await page.getByText('Bots', { exact: true }).click();

    // Wait for the bots page to load completely before clicking Create New Bot
    await page.waitForURL('/admin/bots');

    // Click Create New Bot to open modal
    const createBtn = page.getByRole('button', { name: 'Create New Bot' });
    await createBtn.click();

    // Ensure modal is open and visible
    const modalTitle = page.getByText('Create New Bot', { exact: true });
    await expect(modalTitle).toBeVisible();
  });

  test('should show validation summary and prevent advancing when required fields are missing', async ({
    page,
  }) => {
    const nextBtn = page.getByRole('button', { name: 'Next →' });

    // Click next immediately without filling anything
    await nextBtn.click();

    // Check validation error summary
    const validationSummary = page.locator('.alert-warning');
    await expect(validationSummary).toBeVisible();
    await expect(validationSummary).toContainText('Bot name is required');
    await expect(validationSummary).toContainText('Message provider must be selected');

    // Verify still on step 1
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
  });

  test('should allow advancing when required fields are filled', async ({ page }) => {
    // Fill required fields in Step 1
    await page.getByPlaceholder('e.g. HelpBot').fill('Test Bot');
    await page.locator('select').first().selectOption({ label: 'Discord' });

    // Click Next
    const nextBtn = page.getByRole('button', { name: 'Next →' });
    await nextBtn.click();

    // Verify advanced to Step 2
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
  });
});
